import json
import re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/audio/en-GB'

def texts():
    paths = [ROOT/'src/lessons/school.json', *sorted((ROOT/'src/lessons/content').glob('*.json'))]
    lessons = [json.loads(p.read_text()) for p in paths]
    vocabulary = json.loads((ROOT/'src/lessons/shared-lexicon.json').read_text())
    for lesson in lessons:
        vocabulary += lesson['lexicon'] + lesson['vocabulary']
    # Match the TypeScript registry: later definitions override by English text.
    unique = {w['en'].lower(): w for w in vocabulary}
    result = [text for w in unique.values() for text in [w['en'], w['example']]]
    for lesson in lessons:
        result += [text for g in lesson['grammar'] for text in g['examples']]
        result += [e['answer'] for e in lesson['exercises']]
        result += [e['hint']['example'] for e in lesson['exercises']]
        for r in lesson['remedial']:
            if r['available']:
                result += [r['example'], r['answer'], *r['options']]
    return list(dict.fromkeys(t for t in result if re.search('[a-z]', t, re.I) and not re.search('[а-яё]', t, re.I)))
