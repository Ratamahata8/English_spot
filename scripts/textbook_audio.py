"""Generate or verify bilingual textbook MP3s; retains managed TLS trust."""
import argparse, asyncio, hashlib, json, os, subprocess
from pathlib import Path
from audio_content import ROOT
from validate_audio import valid

def corpus():
    scenes=json.loads((ROOT/'src/textbook/scenes.json').read_text())
    return {'en-GB':list(dict.fromkeys(t for s in scenes for l in s['lines'] for t in [l['en'],*[c['en'] for c in l['chunks']]])), 'ru-RU':list(dict.fromkeys(l['ru'] for s in scenes for l in s['lines']))}

async def main():
    parser=argparse.ArgumentParser();parser.add_argument('--generate',action='store_true');args=parser.parse_args()
    if args.generate:
        import edge_tts
        import edge_tts.communicate as comm
        if os.getenv('SSL_CERT_FILE'): comm._SSL_CTX.load_verify_locations(cafile=os.environ['SSL_CERT_FILE'])
    for lang,texts in corpus().items():
        folder=ROOT/'public/audio/textbook'/lang;folder.mkdir(parents=True,exist_ok=True)
        target=folder/'manifest.json';manifest=json.loads(target.read_text()) if target.exists() else {}
        voice={'en-GB':'en-GB-SoniaNeural','ru-RU':'ru-RU-SvetlanaNeural'}[lang]
        for i,text in enumerate(texts):
            filename=hashlib.sha256(text.encode()).hexdigest()[:20]+'.mp3';path=folder/filename
            item=manifest.get(text,{})
            checksum=hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None
            cached=valid(path) and item.get('sha256')==checksum and item.get('voice')==voice
            if not cached:
                if not args.generate: raise RuntimeError(f'Missing/invalid {lang}: {text}')
                tmp=path.with_suffix('.tmp')
                try:
                    for attempt in range(3):
                        try:
                            await asyncio.wait_for(edge_tts.Communicate(text,voice,proxy=os.getenv('HTTPS_PROXY')).save(str(tmp)),45)
                            if not valid(tmp):raise RuntimeError('Invalid MP3')
                            break
                        except Exception:
                            if attempt==2:raise
                            await asyncio.sleep(2)
                    tmp.replace(path)
                finally:tmp.unlink(missing_ok=True)
                manifest[text]={'text':text,'path':filename,'voice':voice,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
                pending=target.with_suffix('.tmp');pending.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');pending.replace(target)
            if args.generate:print(f'{lang} {i+1}/{len(texts)}',flush=True)
            else: subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(path),'-f','null','-'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        if set(manifest)!=set(texts):raise RuntimeError(f'Unexpected entries: {lang}')
        print(f'{lang}: {len(texts)} MP3 verified',flush=True)
if __name__=='__main__':asyncio.run(main())
