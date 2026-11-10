"""Normalize curated records into explicit relationships; no new source forms."""
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];folder=ROOT/'src/workbook/data'
words=json.loads((folder/'lexicon.json').read_text());entities=dict(lexemes=[],pronunciations=[],meanings=[],occurrences=[],examples=[])
normalized={'foot':('fʊt','ступня'),'hand':('hænd','кисть руки'),'film':('fɪlm','фильм'),'do':('duː','делать; вспомогательный глагол')}
for id in dict.fromkeys(w['lexemeId'] for w in words):
 forms=[w for w in words if w['lexemeId']==id];lemma=forms[0]['lemma'];base=next((w for w in forms if w['form'].lower()==lemma.lower()),None)
 ipa,ru=(base['ipa'],base['meanings'][0]['ru']) if base else normalized[lemma]
 entities['lexemes'].append(dict(id=id,lemma=lemma,ru=ru,ipa=ipa,normalizedOnly=base is None,wordFormIds=[w['id'] for w in forms],pronunciationText=base['form'] if base else lemma))
for w in words:
 pron=dict(id='pron-'+w['id'],wordFormId=w['id'],ipa=w['ipa'],dialect='en-GB',audioText=w['form'],review=w['ipaReview']);entities['pronunciations'].append(pron);w['pronunciationId']=pron['id']
 ex=dict(id='example-'+w['id'],wordFormId=w['id'],**w['example']);entities['examples'].append(ex);w['exampleId']=ex['id']
 w['meaningIds']=[];w['occurrenceIds']=[]
 for i,m in enumerate(w['meanings']):
  mid=w['id']+'-meaning-'+str(i);entities['meanings'].append(dict(**{k:v for k,v in m.items() if k!='id'},id=mid,wordFormId=w['id']));w['meaningIds'].append(mid)
 for i,o in enumerate(w['occurrences']):
  oid=w['id']+'-occurrence-'+str(i);entities['occurrences'].append(dict(id=oid,wordFormId=w['id'],**o));w['occurrenceIds'].append(oid)
(folder/'lexicon.json').write_text(json.dumps(words,ensure_ascii=False,indent=2)+'\n');(folder/'entities.json').write_text(json.dumps(entities,ensure_ascii=False,indent=2)+'\n')
print({k:len(v) for k,v in entities.items()})
