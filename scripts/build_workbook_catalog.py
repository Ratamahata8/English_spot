"""Manually checked page/number/type index. Does not publish scanned text or pages."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sections=[]
def section(module,lesson,rows):
    sections.append((module,lesson,rows.split()))
# Printed pages; numbering restarts for every lesson pair and consolidation section.
section('revision','revision','4:group 5:plural 5:pronoun 6:translation 6:be 6:can 6:template 7:question 7:short-answer 8:have 8:template 8:question 9:likes 9:weather 9:clothes 10:cloze 10:dialogue 11:template')
section('entry','entry','11:odd 11:plural 11:cloze 12:matching 12:order 12:template')
section('1','1a-1b','13:matching 13:letters 13:anagram 14:alphabet 14:plural 14:template 14:dialogue 15:translation 15:wordsearch 16:phonics')
section('1','2a-2b','16:matching 17:letters 17:alphabet 17:table 17:be 18:contraction 18:choice 18:matching 19:matching 19:order')
section('1','review','19:odd 20:sequence 20:crossword 21:compound 21:matching 22:wordsearch 22:template 22:correction 23:capitalization 23:letter 23:choice 24:pronoun 24:question')
section('2','3a-3b','25:matching 25:letters 25:anagram 26:alphabet 26:template 26:possessive 26:template 27:translation 27:table 28:template 28:phonics')
section('2','4a-4b','28:matching 29:letters 29:alphabet 29:family-tree 29:reading 30:cloze 30:plural 30:choice 30:plural 31:short-answer 31:template')
section('2','review','32:odd 32:wordsearch 32:matching 32:template 33:template 33:possessive 33:choice 34:plural 34:table 34:dialogue 35:correction 35:order 36:cloze 36:reading')
section('3','5a-5b','37:matching 37:letters 37:anagram 38:alphabet 38:plural 38:group 39:likes 40:template 40:choice 40:likes 41:phonics')
section('3','6a-6b','41:matching 42:letters 42:compound 42:alphabet 43:countable 43:some-any 43:table 44:cloze 44:template 44:cloze 45:template')
section('3','review','46:odd 46:wordsearch 46:anagram 47:table 47:question 48:template 48:short-answer 49:dialogue 49:correction 49:order 50:cloze 50:some-any 50:template 51:reading 51:reading')
section('4','7a-7b','52:matching 52:letters 52:anagram 53:alphabet 53:article 53:possessive 54:translation 54:short-answer 54:plural 54:demonstrative 55:phonics')
section('4','8a-8b','55:matching 55:letters 56:anagram 56:alphabet 56:be 56:plural 57:short-answer 57:contraction 58:possessive 58:short-answer')
section('4','review','58:dialogue 58:article 59:be 59:odd 59:correction 59:punctuation 60:cloze 60:order 60:reading 61:cloze 61:question 61:translation 62:letter 62:wordsearch')
section('5','9a-9b','63:matching 63:anagram 64:alphabet 64:template 64:have 64:correction 65:question 65:table 66:plural 66:phonics')
section('5','10a-10b','66:matching 67:letters 67:anagram 68:alphabet 68:can 68:short-answer 69:contraction 69:choice 69:number 70:sequence')
section('5','review','70:template 70:short-answer 70:pronoun 71:matching 71:article 71:choice 71:odd 72:correction 72:punctuation 72:cloze 72:order 73:cloze 73:translation 73:question 74:letter 74:wordsearch')
section('6','11a-11b','75:anagram 75:be 75:question 76:pronoun 76:short-answer 77:question 77:translation 78:choice 78:matching 78:phonics')
section('6','12a-12b','78:matching 79:letters 79:anagram 79:alphabet 80:plural 80:there 80:correction 81:question 81:short-answer 82:choice')
section('6','review','82:pronoun 83:matching 83:article 83:be 84:odd 84:correction 84:punctuation 84:cloze 85:order 85:translation 86:reading 86:cloze 87:translation 87:question 88:letter 89:wordsearch')
section('7','13a-13b','90:matching 90:contraction 90:ing 91:be 91:continuous 92:correction 92:question 93:continuous 93:short-answer 94:question 94:phonics')
section('7','14a-14b','95:matching 95:continuous 96:continuous 97:correction 97:question 98:short-answer 98:template 99:choice 99:template 100:short-answer')
section('7','review','100:matching 100:template 101:question 102:correction 102:order 103:matching 103:odd 103:correction 104:punctuation 104:cloze 104:reading 104:cloze 105:translation 105:question 106:reading 106:letter')
section('8','15a-15b','108:matching 108:letters 108:alphabet 108:third-person 109:phonics 109:choice 110:correction 110:question 111:short-answer 111:simple 112:question 113:phonics')
section('8','16a-16b','114:matching 114:preposition-time 115:choice 115:tenses 116:correction 116:question 117:short-answer 117:choice 118:short-answer 118:template')
section('8','review','119:matching 119:tenses 120:question 121:correction 122:order 122:matching 122:odd 123:correction 123:punctuation 123:cloze 123:reading 124:cloze 125:translation 125:question 126:reading 126:letter 127:wordsearch')
# Exercise continuations visible at the top of subsequent pages, not new exercises.
continuations={'revision-1':[5],'revision-7':[7],'revision-12':[9], 'entry-3':[],
'1-1a-1b-3':[14],'1-1a-1b-7':[15],'1-review-1':[20],'1-review-11':[24],
'2-3a-3b-3':[26],'2-3a-3b-7':[27],'2-4a-4b-1':[29],'2-4a-4b-9':[31],'2-review-4':[33],'2-review-7':[34],'2-review-10':[35],
'3-5a-5b-3':[38],'3-5a-5b-6':[39],'3-6a-6b-7':[44],'3-6a-6b-10':[45],'3-6a-6b-11':[46],'3-review-3':[47],'3-review-5':[48],'3-review-7':[49],'3-review-10':[50],'3-review-13':[51],
'4-7a-7b-3':[53],'4-7a-7b-10':[55],'4-8a-8b-6':[57],'4-review-2':[59],'4-review-6':[60],
'5-9a-9b-6':[65],'5-10a-10b-1':[67],'5-10a-10b-3':[68],'5-10a-10b-6':[69],'5-review-3':[71],'5-review-7':[72],'5-review-14':[74],
'6-11a-11b-10':[],'6-12a-12b-1':[79],'6-12a-12b-7':[81],'6-12a-12b-9':[82],'6-review-1':[83],'6-review-4':[84],'6-review-10':[86],'6-review-12':[87],
'7-13a-13b-3':[91],'7-13a-13b-11':[95],'7-14a-14b-2':[96],'7-14a-14b-3':[97],'7-14a-14b-5':[98],'7-review-2':[101],'7-review-5':[103],'7-review-12':[105],'7-review-14':[106],'7-review-16':[107],
'8-15a-15b-4':[109],'8-15a-15b-6':[110],'8-15a-15b-8':[111],'8-15a-15b-10':[112],'8-15a-15b-11':[113],'8-16a-16b-6':[117],'8-16a-16b-10':[119], '8-review-2':[120],'8-review-3':[121],'8-review-7':[123],'8-review-11':[124],'8-review-16':[127]}
kind_skills={'matching':['vocabulary'],'letters':['spelling'],'anagram':['spelling'],'alphabet':['alphabet'],'plural':['plural'],'template':['word-order'],'dialogue':['sentence-meaning'],'translation':['sentence-meaning'],'wordsearch':['spelling'],'phonics':['phonics'],'table':['sentence-meaning'],'be':['pronouns','be'],'contraction':['be','contractions'],'choice':['sentence-meaning'],'order':['word-order'],'odd':['vocabulary'],'sequence':['numbers'],'crossword':['numbers','spelling'],'compound':['phrases'],'correction':['word-order'],'capitalization':['capitalization'],'letter':['letter-writing'],'pronoun':['pronouns'],'question':['questions'],'group':['vocabulary'],'can':['can'],'short-answer':['questions'],'have':['have-got'],'likes':['simple'],'weather':['vocabulary'],'clothes':['vocabulary'],'cloze':['sentence-meaning'],'possessive':['possessives'],'family-tree':['possessives'],'reading':['reading'],'countable':['countable'],'some-any':['some-any'],'article':['articles'],'demonstrative':['demonstratives'],'punctuation':['punctuation'],'number':['numbers'],'there':['there'],'ing':['ing'],'continuous':['continuous'],'third-person':['third-person'],'simple':['simple'],'preposition-time':['time-prepositions'],'tenses':['tenses']}
interactive={'group':'table','phonics':'table','be':'grammar','contraction':'grammar','choice':'grammar','pronoun':'grammar','have':'grammar','likes':'grammar','weather':'gap','clothes':'template','can':'grammar','short-answer':'gap','possessive':'grammar','family-tree':'table','reading':'reading','countable':'grammar','some-any':'grammar','article':'grammar','demonstrative':'grammar','punctuation':'correction','number':'gap','there':'grammar','ing':'table','continuous':'grammar','third-person':'table','simple':'grammar','preposition-time':'grammar','tenses':'grammar','question':'translation','sequence':'gap','compound':'matching','capitalization':'correction','dialogue':'order'}
records=[]
for module,lesson,rows in sections:
 for num,row in enumerate(rows,1):
  page,kind=row.split(':');page=int(page);key=f'{module}-{lesson}-{num}' if lesson not in ['revision','entry'] else f'{module}-{num}'
  records.append(dict(id='wb-'+key,module=module,lesson=lesson,bookPage=page,pdfPage=page+1,continuationPages=continuations.get(key,[]),number=num,sourceType=kind,skillIds=kind_skills[kind],requiredWordIds=[],lexicalReview='not_started',difficulty=1 if module in ['revision','entry','1','2'] else 2 if module in ['3','4','5','6'] else 3,prerequisiteSkillIds=kind_skills[kind],interactiveType=interactive.get(kind,kind),status='not_started',indexReview='visual-checked',adaptationIds=[]))
adaptations={e['id']:e for e in json.loads((ROOT/'src/workbook/data/module-one.json').read_text())} if (ROOT/'src/workbook/data/module-one.json').exists() else {}
old={e['id']:e for e in json.loads((ROOT/'content-coverage.json').read_text())['exercises']} if (ROOT/'content-coverage.json').exists() else {}
for r in records:
 if r['id'] in old:
  r['skillIds']=old[r['id']]['skillIds'];r['prerequisiteSkillIds']=old[r['id']]['prerequisiteSkillIds']
 if r['id'] in adaptations:
  a=adaptations[r['id']];r.update(status=old.get(r['id'],{}).get('status','implemented'),adaptationIds=[a['id']],skillIds=a['skillIds'],prerequisiteSkillIds=a['skillIds'],requiredWordIds=a['wordIds'],lexicalReview='reviewed',interactiveType=a['mechanic'])
coverage=dict(schemaVersion=1,sourceId='bykova-pospelova-2017-workbook-3',sourcePdfPages=129,sourceBookPages=128,pdfPageOffset=1,catalogReview='visual-checked',lexicalReview='in_progress',exercises=records)
(ROOT/'content-coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2)+'\n')
print('Source exercises:',len(records))
