"""Reuse integrity-checked recordings across corpora without copying MP3 bytes.

Whitespace and typographic apostrophes may vary. Case is preserved for names
and homographs (Polish/polish). Punctuation is preserved because
questions and statements can have different intonation. Only the requested voice
is eligible; a Russian recording or an older eSpeak clip is never substituted.
"""
import hashlib
import json
import os
import unicodedata
from pathlib import Path


def normalize_text(text):
    return ' '.join(unicodedata.normalize('NFKC', text).replace('’', "'").replace('‘', "'").split())


def recording_index(audio_root):
    index = {}
    for manifest_path in sorted(audio_root.rglob('manifest.json')):
        for text, asset in json.loads(manifest_path.read_text()).items():
            path = (manifest_path.parent / asset['path']).resolve()
            if not path.is_relative_to(audio_root.resolve()):
                continue
            index.setdefault(normalize_text(text), []).append((text, asset, path))
    return index


def find_recording(index, text, voice, output_folder, validate):
    candidates = index.get(normalize_text(text), [])
    # Prefer exact spelling and recordings already in the destination folder.
    candidates = sorted(candidates, key=lambda c: (c[0] != text, c[2].parent != output_folder.resolve()))
    for original, asset, path in candidates:
        if asset.get('voice') != voice or not path.is_file():
            continue
        if hashlib.sha256(path.read_bytes()).hexdigest() != asset.get('sha256'):
            continue
        if not validate(path):
            continue
        result = dict(asset, text=text, path=Path(os.path.relpath(path, output_folder)).as_posix())
        result['reusedFrom'] = dict(text=original, path=result['path'])
        return result
    return None
