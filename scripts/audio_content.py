import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/audio/en-GB'

def texts():
    d = json.loads((ROOT / 'src/lessons/school.json').read_text())
    result = []
    for w in d['vocabulary'] + d['lexicon']:
        result += [w['en'], w['example']]
    for g in d['grammar']:
        result += g['examples']
    result += [e['answer'] for e in d['exercises']]
    for r in d['remedial']:
        if r['available']:
            result += [r['example'], r['answer'], *r['options']]
    return list(dict.fromkeys(result))
