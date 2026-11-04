"""Generate British English speech; atomic files, resumable manifest, no keys."""
import argparse
import asyncio
import hashlib
import json
import os
import subprocess
import edge_tts
import edge_tts.communicate as edge_communicate
from audio_content import OUT, texts
from validate_audio import valid

async def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--force',action='store_true')
    parser.add_argument('--engine', choices=['edge','espeak'],default='edge')
    parser.add_argument('--limit',type=int)
    parser.add_argument('--prune',action='store_true',help='Remove manifest entries and recordings no longer referenced by content')
    args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    target=OUT/'manifest.json'
    manifest=json.loads(target.read_text()) if target.exists() else {}
    # edge-tts otherwise uses certifi only; preserve the managed proxy CA trust.
    if os.getenv('SSL_CERT_FILE'):
        # edge-tts 7.3.1 supplies this context explicitly to ws_connect.
        # Add the managed CA without removing certifi roots or disabling verification.
        edge_communicate._SSL_CTX.load_verify_locations(cafile=os.environ['SSL_CERT_FILE'])
    for text in texts()[:args.limit]:
        filename=hashlib.sha256(text.encode()).hexdigest()[:20]+'.mp3'
        path=OUT/filename
        voice='en-GB-SoniaNeural' if args.engine=='edge' else 'eSpeak-NG en-gb (offline, formant)'
        cached=manifest.get(text,{})
        checksum=hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None
        if args.force or not valid(path) or cached.get('voice') != voice or cached.get('sha256') != checksum:
            tmp=path.with_suffix('.tmp')
            try:
                if args.engine=='edge':
                    await asyncio.wait_for(edge_tts.Communicate(text,'en-GB-SoniaNeural',proxy=os.getenv('HTTPS_PROXY')).save(str(tmp)),45)
                else:
                    wav=path.with_suffix('.wav')
                    try:
                        subprocess.run(['node','scripts/synthesize_local.mjs',text,str(wav)],check=True,cwd=OUT.parents[2])
                        subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-codec:a','libmp3lame','-q:a','3','-f','mp3',str(tmp)],check=True)
                    finally:
                        wav.unlink(missing_ok=True)
                if not valid(tmp): raise RuntimeError('Получен некорректный MP3')
                tmp.replace(path)
            finally:
                tmp.unlink(missing_ok=True)
        manifest[text]={'text':text,'path':filename,'voice':voice,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
        pending=target.with_suffix('.tmp')
        pending.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
        pending.replace(target)
        print(f'{len(manifest)}/{len(texts())}: {text}',flush=True)
    if args.prune:
        if args.limit is not None:
            raise ValueError('--prune cannot be combined with --limit')
        expected=set(texts())
        stale=[manifest.pop(text) for text in list(manifest) if text not in expected]
        retained={a['path'] for a in manifest.values()}
        for asset in stale:
            if asset['path'] not in retained:
                (OUT/asset['path']).unlink(missing_ok=True)
        pending=target.with_suffix('.tmp')
        pending.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
        pending.replace(target)
        print(f'Removed unused recordings: {len(stale)}')
if __name__=='__main__':
    try:
        asyncio.run(main())
    except Exception as error:
        raise SystemExit(f'Генерация не завершена: {type(error).__name__}: {error}. Прогресс сохранён; проверьте сеть и повторите. Для открытой локальной альтернативы: --engine espeak.')
