"""Static Sonia recordings for authored textbook adaptations; reuse before synth.

Only correct answers, completed example sentences and matching terms are used.
Distractors, gap fragments, personal answers and publisher OCR are excluded.
"""
import argparse
import asyncio
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path
from audio_content import ROOT
from audio_reuse import recording_index, find_recording
from validate_audio import valid
OUT=ROOT/'public/audio/textbook2026/en-GB'
VOICE='en-GB-SoniaNeural'

def corpus():
    units=json.loads((ROOT/'src/textbook2026/practice.json').read_text())
    texts=[]
    for u in units:
        for t in u['tasks']:
            if t.get('answer'):
                texts.append(clean(t['answer']))
                if t.get('text'):
                    texts.append(clean(t['text'].replace('...',t['answer'])))
            texts += [p['en'] for p in t.get('pairs',[])]
    return sorted({t for t in texts if re.search('[A-Za-z]',t) and not re.search('[а-яёА-ЯЁ]',t)})

def clean(text):
    text=re.sub(r'\s+([.!?,])',r'\1',text)
    if ' ' in text and re.search(r'[.!?]$',text.strip()):
        text=re.sub(r'(^|[.!?]\s+)([a-z])',lambda m:m[1]+m[2].upper(),text)
    return text

def decodes(path):
    return valid(path) and subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(path),'-f','null','-'],capture_output=True).returncode==0

def save(path,data):
    tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');tmp.replace(path)

async def main():
    parser=argparse.ArgumentParser();parser.add_argument('--generate',action='store_true');parser.add_argument('--reuse-only',action='store_true');args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True);target=OUT/'manifest.json';manifest=json.loads(target.read_text()) if target.exists() else {}
    index=recording_index(ROOT/'public/audio');ready={};missing=[]
    # Deduplicate file validation even when several labels share the same clip.
    checked={}
    def checked_decode(path):
        if path not in checked:checked[path]=decodes(path)
        return checked[path]
    for text in corpus():
        a=find_recording(index,text,VOICE,OUT,checked_decode)
        if a:ready[text]=a
        else:missing.append(text)
    print(json.dumps(dict(strings=len(corpus()),reused=len(ready),missing=len(missing)),ensure_ascii=False),flush=True)
    report=dict(sourceId='spotlight_textbook_2026_16_part1',strings=len(corpus()),available=len(ready),missing=missing,complete=not missing,missingAudioBlocksCoreExercises=False)
    save(ROOT/'docs/textbook-2026/practice-audio-coverage.json',report)
    if args.reuse_only:
        manifest.update(ready);save(target,manifest)
        return
    if not args.generate:
        for text in manifest:
            if text not in ready:raise SystemExit('Invalid prepared recording: '+text)
        return
    import edge_tts
    import edge_tts.communicate as communicate
    if os.getenv('SSL_CERT_FILE'):communicate._SSL_CTX.load_verify_locations(cafile=os.environ['SSL_CERT_FILE'])
    generated=0
    for text in corpus():
        if text in ready:manifest[text]=ready[text]
        else:
            path=OUT/(hashlib.sha256(text.encode()).hexdigest()[:20]+'.mp3');tmp=path.with_suffix('.tmp')
            try:
                await asyncio.wait_for(edge_tts.Communicate(text,VOICE,proxy=os.getenv('HTTPS_PROXY')).save(str(tmp)),45)
                if not decodes(tmp):raise RuntimeError('Invalid MP3: '+text)
                tmp.replace(path)
            finally:tmp.unlink(missing_ok=True)
            manifest[text]=dict(text=text,path=path.name,voice=VOICE,sha256=hashlib.sha256(path.read_bytes()).hexdigest());generated+=1
        save(target,manifest)
        if generated and generated%10==0:print('Synthesized: '+str(generated),flush=True)
    print(json.dumps(dict(strings=len(corpus()),reused=len(ready),newlySynthesized=generated)),flush=True)
    report.update(available=len(corpus()),missing=[],complete=True,generation=dict(reused=len(ready),created=generated))
    save(ROOT/'docs/textbook-2026/practice-audio-coverage.json',report)

if __name__=='__main__':asyncio.run(main())
