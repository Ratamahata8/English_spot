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
from audio_reuse import recording_index, find_recording

def valid_shared_recording(path):
    return valid(path) and subprocess.run(
        ['ffmpeg','-v','error','-xerror','-i',str(path),'-f','null','-'],
        capture_output=True,
    ).returncode == 0

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
    reusable=recording_index(OUT.parent)
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
        cached_path=(OUT/cached.get('path',filename)).resolve()
        if not args.force and cached_path.is_relative_to(OUT.parent.resolve()) and cached.get('voice') == voice:
            path=cached_path
        checksum=hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None
        if args.force or not valid(path) or cached.get('voice') != voice or cached.get('sha256') != checksum:
            reuse=None if args.force else find_recording(reusable,text,voice,OUT,valid_shared_recording)
            if reuse:
                manifest[text]=reuse
                pending=target.with_suffix('.tmp')
                pending.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
                pending.replace(target)
                print(f'Reused existing recording: {text}',flush=True)
                continue
            # A stale/corrupt shared reference must never overwrite another corpus.
            path=OUT/filename
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
        manifest[text]={'text':text,'path':os.path.relpath(path,OUT).replace(os.sep,'/'),'voice':voice,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
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
            stale_path=(OUT/asset['path']).resolve()
            if asset['path'] not in retained and stale_path.parent == OUT.resolve():
                stale_path.unlink(missing_ok=True)
        pending=target.with_suffix('.tmp')
        pending.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
        pending.replace(target)
        print(f'Removed unused recordings: {len(stale)}')
if __name__=='__main__':
    try:
        asyncio.run(main())
    except Exception as error:
        raise SystemExit(f'Генерация не завершена: {type(error).__name__}: {error}. Прогресс сохранён; проверьте сеть и повторите. Для открытой локальной альтернативы: --engine espeak.')
