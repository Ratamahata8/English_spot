"""Offline corpus/validation; optional replaceable Edge TTS preparation provider."""
import asyncio,argparse,hashlib,json,os,re,shutil,subprocess
from pathlib import Path
from audio_content import ROOT
from validate_audio import valid
OUT=ROOT/'public/audio/workbook/en-GB'
def segments(text):
    if text.startswith('/') and text.endswith('/'):return []
    return [s.strip().strip(',:- ') for s in re.findall(r"[A-Za-z][A-Za-z0-9'’ .,!?:-]*",re.sub(r'/(?:iː|e)/',' ',text)) if s.strip().strip(',:- ')]

def texts():
    folder=ROOT/'src/workbook/data'
    words=json.loads((folder/'lexicon.json').read_text());skills=json.loads((folder/'skills.json').read_text());exercises=json.loads((folder/'module-one.json').read_text())
    words += json.loads((folder/'edition-2026-lexicon.json').read_text());skills += json.loads((folder/'edition-2026-skills.json').read_text());exercises += json.loads((folder/'edition-2026-exercises.json').read_text()) + json.loads((folder/'edition-2026-intro-module-one.json').read_text()) + json.loads((folder/'edition-2026-rest.json').read_text());skills += json.loads((folder/'edition-2026-rest-skills.json').read_text())
    result=[s for w in words for s in [w['form'],w['lemma'],w['example']['en']]]
    optional_prose=[]
    for s in skills:
        if s.get('planned'):continue
        result += [s['example']['en'],s['explanation']]+[v for q in s['practice'] for v in [q['prompt'],*q['options']]]
    for e in exercises:
        result += [e['instruction']]
        for t in e['tasks']:
            if e['mechanic'] not in ['letters','anagram']:result += [t.get('prompt','')]
            # Russian instructional prose can contain spelling suffixes (-es)
            # and English examples that were never intended as standalone clips.
            # Existing recorded prose clips remain in the manifest below.
            optional_prose += [t['why'],*t.get('hints',[])]
            result += t.get('answers',[])+t.get('options',[])+t.get('tokens',[])
            for row in t.get('rows',[]):result += [row['label'],*row['answers']]
            for slot in t.get('slots',[]):result += slot['options']
            for placed in t.get('placements',[]):result += [placed['word']]
            for word in t.get('words',[]):result += [word['answer']]
    result += list('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    required=set(p for text in result for p in segments(text))
    manifest_path=OUT/'manifest.json'
    recorded=set(json.loads(manifest_path.read_text())) if manifest_path.exists() else set()
    # Do not require new MP3s for arbitrary fragments of mixed-language hints;
    # still verify every recorded clip and all essential exercise audio.
    return sorted(required | recorded,key=lambda x:(x.lower(),x))
async def main():
    config=json.loads((ROOT/'src/workbook/data/audio-provider.json').read_text())
    parser=argparse.ArgumentParser();parser.add_argument('--generate',action='store_true');parser.add_argument('--corpus',action='store_true');parser.add_argument('--jobs',type=int,default=4);parser.add_argument('--provider',choices=['edge','import'],default=config['provider']);parser.add_argument('--import-dir',type=Path);args=parser.parse_args()
    corpus=texts()
    if args.corpus:
        (ROOT/'src/workbook/data/audio-texts.json').write_text(json.dumps(corpus,ensure_ascii=False,indent=2)+'\n');print('Workbook audio corpus:',len(corpus));return
    target=OUT/'manifest.json';manifest=json.loads(target.read_text()) if target.exists() else {}
    voice=config['voice']
    if args.generate and args.provider=='import' and not args.import_dir:raise ValueError('--import-dir is required for import provider')
    if args.generate and args.provider=='edge':
        import edge_tts
        import edge_tts.communicate as comm
        if os.getenv('SSL_CERT_FILE'):comm._SSL_CTX.load_verify_locations(cafile=os.environ['SSL_CERT_FILE'])
    if args.generate:
        OUT.mkdir(parents=True,exist_ok=True)
        cache={}
        for folder in [ROOT/'public/audio/en-GB',ROOT/'public/audio/textbook/en-GB']:
            for text,asset in json.loads((folder/'manifest.json').read_text()).items():cache[text]=(folder,asset)
    generated=0;reused=0
    semaphore=asyncio.Semaphore(max(1,min(args.jobs,8)))
    async def process(i,text):
      nonlocal generated,reused
      async with semaphore:
        filename=hashlib.sha256(text.encode()).hexdigest()[:20]+'.mp3';path=OUT/filename;asset=manifest.get(text,{})
        checksum=hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None
        good=checksum is not None and asset.get('sha256')==checksum and asset.get('voice')==voice
        if good and not args.generate:good=await asyncio.to_thread(valid,path)
        if not good:
            if not args.generate:raise RuntimeError('Missing or corrupt workbook MP3: '+text)
            cached=cache.get(text)
            if cached and cached[1]['voice']==voice and await asyncio.to_thread(valid,cached[0]/cached[1]['path']) and hashlib.sha256((cached[0]/cached[1]['path']).read_bytes()).hexdigest()==cached[1]['sha256']:
                shutil.copyfile(cached[0]/cached[1]['path'],path);reused+=1
            elif args.provider=='import':
                incoming=args.import_dir/filename
                if not await asyncio.to_thread(valid,incoming):raise RuntimeError('Missing valid imported MP3: '+filename)
                tmp=path.with_suffix('.tmp');shutil.copyfile(incoming,tmp);tmp.replace(path);generated+=1
            else:
                tmp=path.with_suffix('.tmp')
                try:
                    for attempt in range(4):
                        try:
                            await asyncio.wait_for(edge_tts.Communicate(text,voice,proxy=os.getenv('HTTPS_PROXY')).save(str(tmp)),45)
                            if not await asyncio.to_thread(valid,tmp):raise RuntimeError('Invalid MP3')
                            break
                        except Exception:
                            if attempt==3:raise
                            await asyncio.sleep(2*(attempt+1))
                    tmp.replace(path);generated+=1
                finally:tmp.unlink(missing_ok=True)
            manifest[text]={'text':text,'path':filename,'voice':voice,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
            tmp=target.with_suffix('.tmp');tmp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');tmp.replace(target)
            print(f'{i+1}/{len(corpus)} {text[:100]}',flush=True)
        if not args.generate:
            await asyncio.to_thread(subprocess.run,['ffmpeg','-v','error','-xerror','-i',str(path),'-f','null','-'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    await asyncio.gather(*(process(i,text) for i,text in enumerate(corpus)))
    if args.generate:
        retained=set(corpus)
        for stale in list(manifest):
            if stale not in retained:
                old=manifest.pop(stale);(OUT/old['path']).unlink(missing_ok=True)
        tmp=target.with_suffix('.tmp');tmp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');tmp.replace(target)
    if set(manifest)!=set(corpus):raise RuntimeError('Unexpected audio manifest entries')
    print(f'Workbook: {len(corpus)} MP3; newly synthesized: {generated}; copied existing Sonia: {reused}',flush=True)
if __name__=='__main__':asyncio.run(main())
