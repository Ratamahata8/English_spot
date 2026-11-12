"""Prepare only individually verified forms/examples; reuse MP3s before synthesis.

No publisher photographs, full OCR or unrelated lesson text is transmitted.
Default is an offline check/plan. --generate explicitly enables missing Sonia clips.
"""
import argparse
import asyncio
import hashlib
import json
import os
import subprocess
from pathlib import Path
from audio_reuse import recording_index, find_recording
from audio_content import ROOT, OUT
from validate_audio import valid

VOICE = 'en-GB-SoniaNeural'
DATA = ROOT / 'docs/textbook-2026/verified-forms.json'


def decodes(path):
    return valid(path) and subprocess.run(
        ['ffmpeg', '-v', 'error', '-xerror', '-i', str(path), '-f', 'null', '-'],
        capture_output=True,
    ).returncode == 0


def atomic_json(path, data):
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    tmp.replace(path)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--generate', action='store_true')
    args = parser.parse_args()
    data = json.loads(DATA.read_text())
    corpus = list(dict.fromkeys(t for w in data['forms'] for t in [w['en'], w['example']]))
    index = recording_index(ROOT / 'public/audio')
    manifest_path = OUT / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    planned = {}
    missing = []
    for text in corpus:
        recording = find_recording(index, text, VOICE, OUT, decodes)
        if recording:
            planned[text] = recording
        else:
            missing.append(text)
    print(json.dumps(dict(reused=len(planned), missing=len(missing), synthesize=missing), ensure_ascii=False), flush=True)
    if not args.generate:
        return
    # Only these missing dictionary forms and authored examples are sent to Sonia.
    import edge_tts
    import edge_tts.communicate as communicate
    if os.getenv('SSL_CERT_FILE'):
        communicate._SSL_CTX.load_verify_locations(cafile=os.environ['SSL_CERT_FILE'])
    generated = 0
    for text in corpus:
        if text in planned:
            manifest[text] = planned[text]
        else:
            filename = hashlib.sha256(text.encode()).hexdigest()[:20] + '.mp3'
            path = OUT / filename
            tmp = path.with_suffix('.tmp')
            try:
                await asyncio.wait_for(edge_tts.Communicate(text, VOICE, proxy=os.getenv('HTTPS_PROXY')).save(str(tmp)), 45)
                if not decodes(tmp):
                    raise RuntimeError('Invalid MP3: ' + text)
                tmp.replace(path)
            finally:
                tmp.unlink(missing_ok=True)
            manifest[text] = dict(text=text, path=filename, voice=VOICE, sha256=hashlib.sha256(path.read_bytes()).hexdigest())
            generated += 1
        atomic_json(manifest_path, manifest)
    preparation=dict(
        strings=len(corpus), reusedExisting=len(planned), newlySynthesized=generated,
        reusedWithoutFileCopies=True, integrityChecks=['SHA256', 'ffprobe duration', 'complete ffmpeg decode'],
    )
    data['audioStatus']='verified_sonia_static_mp3'
    # Preserve the initial batch totals when a subsequent run needs no synthesis.
    if generated or 'audioPreparation' not in data:
        data['audioPreparation']=preparation
    atomic_json(DATA, data)
    print(json.dumps(data['audioPreparation']), flush=True)


if __name__ == '__main__':
    asyncio.run(main())
