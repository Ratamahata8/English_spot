"""Deterministic authored practice from visually indexed objectives, never raw OCR/scans.
Run from repository root. Source objectives are independently recorded; examples are ours.
"""
import json, hashlib, random
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
D=ROOT/'src/workbook/data'
def read(name):return json.loads((D/name).read_text())
def save(name,value): (D/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
refs=json.loads((ROOT/'docs/workbook/edition-2026-rest-objectives.json').read_text())
known={w['form'].lower():w for w in read('edition-2026-lexicon.json')}
legacy={w['form'].lower():w for w in read('lexicon.json')}
# Curated words visible in the matching/spelling banks. Inflected answers generated
# by grammar tasks are not promoted into the source dictionary.
raw='''dad|dæd|папа
mother|ˈmʌðə|мама
father|ˈfɑːðə|папа
chicken|ˈtʃɪkɪn|курица
chocolate|ˈtʃɒklət|шоколад
water|ˈwɔːtə|вода
cake|keɪk|торт
carrot|ˈkærət|морковь
banana|bəˈnɑːnə|банан
desk|desk|письменный стол
TV|ˌtiːˈviː|телевизор
train|treɪn|поезд
long|lɒŋ|длинный
short|ʃɔːt|короткий
thin|θɪn|тонкий
fat|fæt|толстый
big|bɪɡ|большой
small|smɔːl|маленький
long tail|lɒŋ teɪl|длинный хвост
thin legs|θɪn leɡz|тонкие ноги
big eyes|bɪɡ aɪz|большие глаза
small nose|smɔːl nəʊz|маленький нос
fat body|fæt ˈbɒdi|толстое тело
big ears|bɪɡ ɪəz|большие уши
small head|smɔːl hed|маленькая голова
short tail|ʃɔːt teɪl|короткий хвост
grandmother|ˈɡrænmʌðə|бабушка
grandfather|ˈɡrænfɑːðə|дедушка
jelly|ˈdʒeli|желе
vegetables|ˈvedʒtəblz|овощи
lemonade|ˌleməˈneɪd|лимонад
meat|miːt|мясо
potatoes|pəˈteɪtəʊz|картофелины
biscuits|ˈbɪskɪts|печенье
pasta|ˈpæstə|макароны
sausages|ˈsɒsɪdʒɪz|сосиски
rice|raɪs|рис
popcorn|ˈpɒpkɔːn|попкорн
teaset|ˈtiːset|чайный сервиз
aeroplane|ˈeərəpleɪn|самолёт
rocking horse|ˈrɒkɪŋ hɔːs|лошадка-качалка
musical box|ˈmjuːzɪkl bɒks|музыкальная шкатулка
playroom|ˈpleɪruːm|игровая комната
armchair|ˈɑːmtʃeə|кресло
computer|kəmˈpjuːtə|компьютер
crawl|krɔːl|ползать
parrot|ˈpærət|попугай
rabbit|ˈræbɪt|кролик
seahorse|ˈsiːhɔːs|морской конёк
spider|ˈspaɪdə|паук
talk|tɔːk|разговаривать
tortoise|ˈtɔːtəs|сухопутная черепаха
walk|wɔːk|ходить
fly|flaɪ|летать
jump|dʒʌmp|прыгать
swim|swɪm|плавать
sofa|ˈsəʊfə|диван
mirror|ˈmɪrə|зеркало
cupboard|ˈkʌbəd|шкаф
fridge|frɪdʒ|холодильник
cooker|ˈkʊkə|кухонная плита
glass|ɡlɑːs|стакан
drive a car|draɪv ə kɑː|водить машину
play the piano|pleɪ ðə piˈænəʊ|играть на пианино
watch TV|wɒtʃ ˌtiːˈviː|смотреть телевизор
paint a picture|peɪnt ə ˈpɪktʃə|рисовать картину
make a sandcastle|meɪk ə ˈsændkɑːsl|строить замок из песка
face|feɪs|лицо
day off|deɪ ɒf|выходной день
over there|ˈəʊvə ðeə|вон там
upside down|ˌʌpsaɪd ˈdaʊn|вверх ногами
ride a bike|raɪd ə baɪk|кататься на велосипеде
eat a hot dog|iːt ə hɒt dɒɡ|есть хот-дог
drink lemonade|drɪŋk ˌleməˈneɪd|пить лимонад
fly a kite|flaɪ ə kaɪt|запускать воздушного змея
play soccer|pleɪ ˈsɒkə|играть в футбол
play basketball|pleɪ ˈbɑːskɪtbɔːl|играть в баскетбол
wear a mac|weə ə mæk|носить плащ
sleep|sliːp|спать
park|pɑːk|парк
laugh|lɑːf|смеяться
Monday|ˈmʌndeɪ|понедельник
Tuesday|ˈtjuːzdeɪ|вторник
Wednesday|ˈwenzdeɪ|среда
Thursday|ˈθɜːzdeɪ|четверг
Friday|ˈfraɪdeɪ|пятница
Saturday|ˈsætədeɪ|суббота
Sunday|ˈsʌndeɪ|воскресенье
go to bed|ɡəʊ tə bed|ложиться спать
in the evening|ɪn ði ˈiːvnɪŋ|вечером
have lunch|hæv lʌntʃ|обедать
at night|ət naɪt|ночью
relative|ˈrelətɪv|родственник
in the afternoon|ɪn ði ˌɑːftəˈnuːn|днём
have supper|hæv ˈsʌpə|ужинать
visit|ˈvɪzɪt|навещать
in the morning|ɪn ðə ˈmɔːnɪŋ|утром
have breakfast|hæv ˈbrekfəst|завтракать
listen to music|ˈlɪsn tə ˈmjuːzɪk|слушать музыку
have a shower|hæv ə ˈʃaʊə|принимать душ'''
metadata={x.split('|')[0].lower():x.split('|') for x in raw.splitlines()}
banks={
'family-small':'mum,dad,brother,sister,grandma,grandpa,chimp',
'family-formal':'mother,father,grandmother,grandfather,brother,sister',
'food-a':'jelly,chicken,burger,pizza,chocolate,water,vegetables,lemonade',
'food-b':'meat,potatoes,biscuits,milk,cake,orange juice,pasta,sausages,carrot,rice,popcorn,lemonade',
'food-count':'apple,banana,egg,burger,sandwich',
'school':'book,pen,pencil,school bag,desk,chair',
'room':'TV,playroom,armchair,computer,desk',
'rooms':'kitchen,bedroom,bathroom,garden,living room',
'furniture':'sofa,mirror,cupboard,glass,fridge,cooker',
'animals':'crawl,parrot,rabbit,seahorse,spider,talk,tortoise,walk,bird,fly,jump,swim',
'animal-description':'long,thin,big,small,fat,short',
'toys':'ball,elephant,teaset,doll,aeroplane,rocking horse,musical box,train',
'actions-now':'drive a car,play the piano,watch TV,paint a picture,make a sandcastle,face,day off,over there,upside down',
'leisure':'ride a bike,eat a hot dog,drink lemonade,fly a kite,play soccer,play basketball,wear a mac,sleep,park,laugh',
'days':'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
'daily':'go to bed,in the evening,have lunch,at night,relative,in the afternoon,have supper,visit,in the morning,have breakfast,listen to music,have a shower',
}
for k,v in list(banks.items()):banks[k]=v.split(',')
# Topic aliases only select supporting words; they do not assert occurrence in those tasks.
aliases={'possessives':'family-small','description':'animal-description','places':'rooms','actions':'actions-now','past-verbs':'actions-now','numbers':'school','town':'rooms','ordinals':'days','routine':'daily'}
def bank(topic):return banks[aliases.get(topic,topic)]
def lexical(r):
 if r['topic']=='animal-description':return ['long tail','thin legs','big eyes','small nose','fat body','big ears','small head','short tail'] if r['kind']=='match' else ['long','thin','big','fat','short']
 return bank(r['topic'])
newwords=[]; additions={}
def word(form):
 key=form.lower()
 if key in known:return known[key]
 if key in additions:return additions[key]
 if key in legacy:w=json.loads(json.dumps(legacy[key]));w['occurrences']=[]
 else:
  f,ipa,ru=metadata[key];h=hashlib.sha256(key.encode()).hexdigest()[:12]
  isphrase=' ' in f;verb=key in ['crawl','talk','walk','fly','jump','swim','sleep','laugh','visit'] or key.startswith(('drive ','play ','watch ','paint ','make ','ride ','eat ','drink ','wear ','go ','have ','listen '))
  pos='глагольное выражение' if verb and isphrase else 'глагол' if verb else 'выражение' if isphrase else 'существительное'
  grammar=('Обозначает действие. После can и did используется начальная форма; в рассказе о действии сейчас меняется глагол, а остальные слова сохраняются.' if verb else 'Название дня пишется с заглавной буквы. Для «в этот день» ставим on; при перечислении по алфавиту сравниваем английское написание.' if f in banks['days'] else 'Сочетание слов запоминаем целиком: порядок слов помогает передать значение. Его части можно прослушать отдельно в подсказках.' if isphrase else 'Называет предмет или понятие. Артикль и форму числа выбираем по смыслу: один предмет или несколько; перед неисчисляемым названием a не ставим.')
  if key in ['long','short','thin','fat','big','small']:
   pos='прилагательное';grammar='Описывает признак предмета. Ставится перед существительным или после is/are и не получает окончания множественного числа.'
  if key in ['potatoes','biscuits','sausages','vegetables']:grammar='Форма нескольких предметов. Не ставим перед ней a; для предложения о наличии выбираем there are. Сравни окончание с формой одного предмета.'
  example={'en':f'I can {f}.' if verb else f'It is {f}.' if f in banks['days'] else f'I like {f}.' if key in ['jelly','vegetables','lemonade','meat','potatoes','biscuits','pasta','sausages','rice','popcorn'] else f'Look at the {f}.','ru':f'Я могу {ru}.' if verb else f'Сегодня {ru}.' if f in banks['days'] else f'Мне нравится: {ru}.' if key in ['jelly','vegetables','lemonade','meat','potatoes','biscuits','pasta','sausages','rice','popcorn'] else f'Посмотри: {ru}.','authored':True}
  w=dict(id='wf26-'+h,lexemeId='lex-'+h,form=f,lemma=f,lemmaObserved=True,ipa=ipa,ipaReview='reviewed',partOfSpeech=pos,grammar=grammar,meanings=[dict(id='wf26-'+h+'-meaning',ru=ru,context='В теме сборника',when='default')],occurrences=[],example=example)
 additions[key]=w;newwords.append(w);return w
# Only lexical matching/letters/alphabet banks with legible print are occurrence proof.
for r in refs:
 if r['kind'] not in ['match','letters','alphabet'] and not (r['module']=='3' and r['lesson']=='5a-5b' and r['number']==4):continue
 proof=lexical(r)
 if r['module']=='5' and r['lesson']=='9a-9b' and r['number']==1:proof=[*proof,'small']
 for f in proof:
  w=word(f)
  sid=f"src26-m{r['module']}{'a' if int(r['lesson'].split('a')[0])%2 else 'b'}-{r['number']}"
  o=dict(sourceId='spotlight_workbook_2026_17',exerciseId=sid,bookPage=r['page'],pdfPage=None,printedPages=[r['page'],*r['continuation']],exerciseNumber=r['number'],module=r['module'],text=w['form'],verification='video-visual',evidenceTimestamp=r['timestamp'],frameSha256=r['frameSha256'])
  if not any(x['exerciseId']==sid for x in w['occurrences']):w['occurrences'].append(o)
# New lesson banks, authored minimal pairs, and explanatory rules.
skills=[]
def skill(key,title,rule,en,ru,pairs,prerequisites=('pronouns',)):
 ident='rest-'+key
 skills.append(dict(id=ident,title=title,prerequisites=list(prerequisites),explanation=rule,example=dict(en=en,ru=ru),steps=['Посмотри на смысл и слова рядом.','Примени правило к человеку, числу и времени.','Прочитай ответ целиком и проверь смысл.'],practice=[dict(prompt=p,options=[a,b],answer=a,why=rule) for p,a,b in pairs]));return ident
S={}
S['possessive']=skill('possessive','Чей? Мой, твой, его', 'Перед предметом ставим слово хозяина: my — мой, your — твой, his — его, her — её, our — наш, their — их. После предлога или действия нужны me, him, her, us, them.', 'This is her bag.','Это её сумка.', [('Сумка девочки: This is … bag.','her','she'),('Позови его: Call … .','him','he')])
S['owner']=skill('owner','Кому принадлежит предмет', 'После имени хозяина ставим апостроф и s: Ben’s bag. В вопросе о хозяине помогает Whose. Это не сокращение is.', "It is Ben's bag.",'Это сумка Бена.', [('Чья? Whose bag … it?','is','are'),('Сумка Бена',"Ben's bag",'Ben bag')])
S['articles']=skill('articles','Один предмет или вещество', 'A ставим перед согласным звуком, an — перед гласным, когда называем один исчисляемый предмет. Перед несколькими предметами и веществом a/an не ставим.', 'It is an apple.','Это яблоко.', [('Одно яблоко: … apple','an','a'),('Молоко без счёта: … milk','some','a')],())
S['some']=skill('some','Some и any', 'В обычном утверждении о количестве часто ставим some. В обычном вопросе о наличии и в отрицании — any. В предложении угощения some тоже возможно: смотри на смысл.', 'There is some milk.','Есть немного молока.', [('Обычное утверждение: There is … milk.','some','any'),('Отрицание: There are not … eggs.','any','some')],(S['articles'],))
S['demo']=skill('demo','Этот, тот, эти, те', 'Рядом: this для одного, these для нескольких. Далеко: that для одного, those для нескольких. Сравни число предметов и расстояние.', 'These are my toys.','Это мои игрушки.', [('Несколько рядом: … are pens.','These','This'),('Один далеко: … is a tree.','That','Those')])
S['past']=skill('past','Как рассказать о прошлом', 'В утверждении о прошлом у правильного глагола есть -ed, у неправильного — особая форма. После did и did not используем начальную форму. Was и were работают без did.', 'We played yesterday.','Вчера мы играли.', [('Вчера: We … .','played','play'),('Вопрос: Did you …?','play','played')])
S['irregular']=skill('irregular','Особые формы числа', 'Некоторые слова меняются целиком: child — children, mouse — mice, tooth — teeth, foot — feet. Fish и sheep могут оставаться без изменения.', 'Two children are here.','Здесь двое детей.', [('Несколько детей','children','childs'),('Две овцы: two …','sheep','sheeps')],('plural',))
S['there']=skill('there','Есть, было, где находится', 'There is — есть один предмет, there are — несколько. В прошлом: there was и there were. В вопросе глагол перед there. Where спрашивает, где находится предмет.', 'There are two chairs.','Есть два стула.', [('Два стула: There … two chairs.','are','is'),('Один вчера: There … a chair.','was','were')],('be',))
S['ing']=skill('ing','Как добавить -ing', 'Обычно добавляем -ing. Непроизносимая e перед -ing исчезает: make — making. В коротком слове после краткого гласного последняя согласная может удваиваться: run — running.', 'She is making a toy.','Она сейчас делает игрушку.', [('Добавь -ing: make','making','makeing'),('Добавь -ing: swim','swimming','swiming')],('spelling',))
S['now']=skill('now','Что происходит сейчас', 'Для действия прямо сейчас нужны am, is или are и действие с -ing. Для вопроса переставь am/is/are вперёд; для отрицания добавь not. В кратком ответе повторяем am/is/are.', 'They are playing now.','Они сейчас играют.', [('Сейчас: She … reading.','is','does'),('Вопрос: … they playing?','Are','Do')],(S['ing'],'be'))
S['simple']=skill('simple','Что происходит обычно', 'В рассказе об обычных действиях с he, she, it у действия появляется -s или -es. В вопросе do/does, в отрицании do not/does not; после does глагол без окончания.', 'She reads every day.','Она читает каждый день.', [('Обычно: She … .','reads','read'),('Вопрос: Does he …?','read','reads')])
S['time']=skill('time','Дни и время', 'С днём недели ставим on. С точным часом и словом night — at. С morning, afternoon, evening — in the. В британском английском говорят at the weekend.', 'I read on Monday.','Я читаю в понедельник.', [('В понедельник: … Monday','on','at'),('В семь часов: … seven','at','in')],())
S['tenses']=skill('tenses','Обычно или прямо сейчас', 'Every day и дни расписания подсказывают обычное действие: Present Simple. Now и Look! помогают заметить действие сейчас: am/is/are + -ing. Сначала найди подсказку времени.', 'She reads every day. She is reading now.','Она читает каждый день. Она читает сейчас.', [('Сейчас: She … now.','is reading','reads'),('Обычно: She … every day.','reads','is reading')],(S['simple'],S['now']))
S['ordinals']=skill('ordinals','Первый, второй, третий', 'Порядковые числа отвечают «который по счёту?»: first, second, third. Для многих остальных помогает -th. Дни недели идут от Monday до Sunday.', 'Monday is the first day.','Понедельник — первый день.', [('Первый','first','one'),('Второй','second','two')],('numbers',))
# Factories keep operation-specific checking. No personal answer is graded as a fact.
def choice(prompt,answer,options,why):return dict(mode='choice',prompt=prompt,answers=[answer],options=list(dict.fromkeys(options)),why=why)
def choices(data,why):return [choice(p,a,o,why) for p,a,o in data]
def order(sentence,prompt='Собери предложение. Начни с заглавной буквы.'):
 tokens=sentence.split(' ');random.Random(sentence).shuffle(tokens)
 return dict(mode='order',prompt=prompt,tokens=tokens,answers=[sentence],why='Сначала найди, о ком речь. Затем действие и остальные слова; в вопросе слово-помощник стоит перед человеком.')
def matching(pairs,prompt='Подбери пары по смыслу.'):
 return dict(mode='matching',prompt=prompt,rows=[dict(label=a,answers=[b]) for a,b in pairs],options=list(dict.fromkeys(b for a,b in reversed(pairs))),why='Сопоставь значение каждой пары. Прослушай английское слово, затем произнеси его сам.')
def personal(topic,kind):
 if 'past' in kind or kind=='personal-town':sentences=[['I was at home.','I was in the park.'],['There was a school.','There was a park.'],['I played yesterday.','I walked yesterday.']];title='Расскажи о прошлом. Выбирай подходящий тебе вариант.'
 elif 'food' in kind or kind=='personal-reply':sentences=[['I like milk.','I do not like milk.'],['I have some apples.','I have no apples.'],['My favourite food is pizza.','My favourite food is chicken.']];title='Расскажи о своей еде. Оба варианта могут быть верными.'
 elif kind=='personal-now':sentences=[['I am reading.','I am playing.'],['My mum is working.','My mum is reading.'],['My friends are playing.','My friends are walking.']];title='Что происходит сейчас? Выбери свой вариант.'
 elif kind=='personal-location':sentences=[['I am at home.','I am at school.'],['My mum is in the kitchen.','My mum is in the garden.'],['My dad is at home.','My dad is in the park.']];title='Где вы сейчас? Выбери подходящий вариант.'
 elif 'routine' in kind:sentences=[['I get up at seven.','I get up at eight.'],['I read on Monday.','I swim on Monday.'],['I have lunch at one.','I have lunch at two.']];title='Расскажи о своём дне. Здесь нет единственного правильного расписания.'
 elif 'pet' in kind:sentences=[['I have a cat.','I have a dog.','I have no pets.'],['I like cats.','I like dogs.'],['I can play with a pet.','I can draw a pet.']];title='Собери короткое письмо о животных. Личные факты не оцениваются как ошибка.'
 elif 'hobbies' in kind:sentences=[['I like reading.','I like swimming.'],['My mum likes walking.','My mum likes reading.'],['My friends like playing.','My friends like dancing.']];title='Расскажи об увлечениях. Выбирай свои варианты.'
 else:sentences=[['I have a brother.','I have no brothers.'],['I have a sister.','I have no sisters.'],['My family is big.','My family is small.']];title='Расскажи о семье. Выбирай подходящее тебе.'
 return [dict(mode='template',prompt=title,slots=[dict(label=f'Фраза {i+1}',options=opts)],why='Это твой рассказ. Все предложенные фразы грамматически допустимы. Выбор с опорой записывается как работа с помощью, а не самостоятельное знание.') for i,opts in enumerate(sentences)]
def grammar(kind,topic,seed):
 rule='Прочитай предложение целиком и сравни форму со смыслом.';sid='be';title=kind
 if kind=='translation':
  return 'translation',S['possessive'],'Чьи вещи: перевод',choices([('Выбери «моя сумка».','my bag',['my bag','his bag','her bag']),('Выбери «наша комната».','our room',['our room','their room','your room']),('Выбери «её брат».','her brother',['his brother','her brother','my brother']),('Выбери «их семья».','their family',['our family','their family','your family'])],'Перед названием предмета или родственника поставь притяжательное слово нужного хозяина.')
 if kind=='family-tree':
  context='Схема семьи: Ben и Emma — дети Anna и Tom. Anna — мама, Tom — папа. Ben — мальчик, Emma — девочка. '
  return 'reading','phrases','Читаем семейную схему',choices([(context+'Кто Emma для Ben?','sister',['sister','mother']), (context+'Кто Tom для Emma?','father',['father','brother']), (context+'Кто Anna для Ben?','mother',['mother','sister']), (context+'Кто Ben для Emma?','brother',['father','brother'])],'Используй связи на схеме, затем выбери английское название родственника.')
 if kind=='number-sequences':
  return 'table','numbers','Продолжи числовой ряд',choices([('Шаг 10: twenty, thirty, …','forty',['forty','fourteen','fifty']),('Шаг 10: forty, fifty, …','sixty',['sixty','sixteen','seventy']),('Шаг 3: ninety-one, ninety-four, …','ninety-seven',['ninety-seven','ninety-five','ninety-nine']),('Шаг 4: seventy-one, seventy-five, …','seventy-nine',['seventy-nine','seventy-six','eighty-one'])],'Найди разницу между соседними числами и сохрани этот шаг. Десятки и числа на -teen не перепутай.')
 if kind=='where':
  return 'order',S['there'],'Спроси о месте',[*[order(x,'Собери вопрос о месте.') for x in ['Where is the sofa?','Where are the books?','Where is your mum?','Where are the children?']],matching([('Where is the sofa?','In the living room.'),('Where are the books?','On the table.')],'Подбери ответ о месте.')]
 if kind in ['possessive','possessive-sentences','possessive-table','ownership','object-pronouns','reading-object','pronouns-choice']:
  sid=S['possessive'];title='Кто и чей'
  data=[('Сумка принадлежит мне: This is … bag.','my',['my','I','me']),('Мяч мальчика: This is … ball.','his',['he','his','him']),('Сумка девочки: This is … bag.','her',['she','her','hers']),('Позови их: Call … .','them',['they','their','them']),('Посмотри на нас: Look at … .','us',['we','our','us']),('Наш дом: This is … house.','our',['us','we','our'])]
 elif kind in ['possessive-s','possessive-translation','possessive-replace','whose']:
  sid=S['owner'];title='Чья игрушка?'
  data=[('Мяч принадлежит Бену. Выбери «мяч Бена».',"Ben's ball",["Ben's ball",'Ben ball','Bens ball']),('Whose doll is it? Кукла у девочки. It is … doll.','her',['her','his','their']),('Whose train is it? Поезд у мальчика. It is … train.','his',['her','his','their']),('Чей это мяч? … ball is it?','Whose',['Where','Whose','What'])]
 elif kind in ['some-any','some-any-table','shopping','article-some','countability','a-an','article-zero']:
  sid=S['some'] if kind in ['some-any','some-any-table','shopping','article-some'] else S['articles'];title='Еда: количество и артикли'
  data=[('Обычное утверждение: There is … milk.','some',['some','any']),('Отрицание: There are not … carrots.','any',['some','any']),('Обычный вопрос о наличии: Are there … eggs?','any',['some','any']),('Одно яблоко: … apple.','an',['a','an']),('Один бутерброд: … sandwich.','a',['a','an']),('Два яблока: … two apples.','без артикля',['a','an','без артикля'])]
  if kind=='countability':return 'table',sid,'Что можно посчитать',[matching([('apple','можно считать'),('milk','вещество без счёта'),('egg','можно считать'),('rice','вещество без счёта')],'Можно ли поставить число прямо перед названием?'),*choices(data[3:], 'Предметы можно считать по одному. Молоко и рис здесь называются веществом без счёта.')]
 elif kind in ['demonstratives','demonstrative-plural','object-questions']:
  sid=S['demo'];title='Этот или те?'
  data=[('Один мяч рядом: … is a ball.','This',['This','These','Those']),('Два мяча рядом: … are balls.','These',['This','That','These']),('Одна игрушка далеко: … is a toy.','That',['That','Those','These']),('Несколько игрушек далеко: … are toys.','Those',['That','This','Those']),('Сделай несколько: This is a pen.','These are pens.',['These are pens.','Those is pen.','This are pens.'])]
 elif kind in ['irregular-plural']:
  return 'plural',S['irregular'],'Особые формы множественного числа',[matching([('child','children'),('mouse','mice'),('foot','feet'),('tooth','teeth')],'Подбери форму нескольких.'),*choices([('Две овцы: two …','sheep',['sheep','sheeps']),('Три рыбы: three …','fish',['fish','fishs']),('Двое мужчин: two …','men',['men','mans'])],'Это особые формы: их запоминаем парой с формой одного.')]
 elif kind in ['regular-past','past-fill','past-choice','past-negative','past-questions','past-checklist','past-table','past-table-questions','past-be','past-place','past-reply','irregular-past','past-location']:
  sid=S['past'];title='Что было вчера'
  if kind=='irregular-past':return 'table',sid,'Особые глаголы в прошлом',[matching([('go','went'),('have','had'),('see','saw'),('come','came')],'Подбери форму прошлого.'),*choices([('Вчера я нашёл мяч: I … a ball.','found',['found','find']),('Вчера мы были дома: We … at home.','were',['was','were']),('Вчера она пришла: She … yesterday.','came',['come','came'])],'В утверждении нужен глагол в форме прошлого; после did — начальная форма.')]
  if kind=='regular-past':return 'table',sid,'Как пишется прошедшее время',[matching([('play','played'),('live','lived'),('study','studied'),('wash','washed')],'Подбери форму прошлого.'),*choices([('Вчера: We … in the park.','walked',['walked','walk']),('Вчера: She … a picture.','painted',['painted','paint']),('Вчера: I … my room.','cleaned',['cleaned','clean'])],'Обычно добавляем -ed, после e только -d, согласная + y меняется на -ied.')]
  if kind in ['past-be','past-place','past-reply','past-location']:
   data=[('Вчера я был дома: I … at home yesterday.','was',['was','were']),('Вчера мы были в парке: We … in the park.','were',['was','were']),('Она не была дома: She … at home.','was not',['was not','were not']),('Were they at school? По условию: да.','Yes, they were.',['Yes, they were.','Yes, they was.']),('Спроси «Где он был?»','Where was he?',['Where was he?','Where were he?'])]
  elif kind in ['past-negative','past-checklist','past-table']:
   data=[('Отрицание: We … play yesterday.','did not',['did not','do not']),('После did not: She did not … .','go',['go','went']),('Отрицание: I … TV yesterday.','did not watch',['did not watch','did not watched']),('Таблица вчера: Ben ✓ played; Mia ✗ played. Кто играл?','Ben',['Ben','Mia'])]
  elif kind in ['past-questions','past-table-questions']:
   return 'order',sid,'Спроси о вчерашнем дне',[order(x,'Собери вопрос о прошлом.') for x in ['Did you play yesterday?','Did she go home?','Did they see a bird?','Where did he go?']]
  else:data=[('Вчера: She … to the park.','went',['went','go']),('Вчера: We … a game.','played',['play','played']),('Вопрос: Did they …?','play',['play','played']),('Отрицание: He did not … .','go',['go','went']),('Вчера я видел птицу: I … a bird.','saw',['see','saw'])]
 elif kind.startswith('there') or kind=='where':
  sid=S['there'];title='Что есть и где находится'
  past='past' in kind
  if kind.endswith('question'):return 'order',sid,'Спроси о наличии',[order(x,'Собери вопрос. Глагол поставь перед there.') for x in (['Was there a school?','Were there two shops?','Was there a park?','Were there any cars?'] if past else ['Is there a sofa?','Are there two chairs?','Is there a mirror?','Are there any books?'])]
  if kind.endswith('negative'):
   data=[('Один предмет: There … a sofa.','was not' if past else 'is not',['was not','were not'] if past else ['is not','are not']),('Несколько: There … two chairs.','were not' if past else 'are not',['was not','were not'] if past else ['is not','are not']),('Отрицание о книгах: There … any books.','were not' if past else 'are not',['was not','were not'] if past else ['is not','are not']),('Отрицание о зеркале: There … a mirror.','was not' if past else 'is not',['was not','were not'] if past else ['is not','are not'])]
  elif kind.endswith('reply'):
   data=[(f"{'Was' if past else 'Is'} there a sofa? По условию: да.",f"Yes, there {'was' if past else 'is'}.",[f"Yes, there {'was' if past else 'is'}.",f"Yes, there {'were' if past else 'are'}."]),(f"{'Were' if past else 'Are'} there chairs? По условию: нет.",f"No, there {'were' if past else 'are'} not.",[f"No, there {'were' if past else 'are'} not.",f"No, there {'was' if past else 'is'} not."]),('Вопрос о месте: … is the sofa?','Where',['Where','There']),('Вопрос о наличии: … a sofa?','Is there',['Is there','Where'])]
  else:
   data=[(('Вчера: ' if past else '')+'There … a sofa.','was' if past else 'is',['was','were'] if past else ['is','are']),(('Вчера: ' if past else '')+'There … two chairs.','were' if past else 'are',['was','were'] if past else ['is','are']),('Где диван? … is the sofa?','Where',['Where','There']),('Есть диван: … is a sofa.','There',['Where','There'])]
 elif kind=='ing-spelling':return 'table',S['ing'],'Добавляем -ing',[matching([('make','making'),('swim','swimming'),('ride','riding'),('clap','clapping')],'Как написать действие с -ing?'),*choices([('Добавь -ing: run','running',['running','runing']),('Добавь -ing: dance','dancing',['danceing','dancing']),('Добавь -ing: play','playing',['playing','plaing'])],'Убираем конечную e, а краткая гласная иногда требует удвоить последнюю согласную.')]
 elif kind.startswith('continuous') or kind=='who-now':
  sid=S['now'];title='Что происходит сейчас'
  if kind in ['continuous-question','continuous-what']:return 'order',sid,'Спроси о действии сейчас',[*[order(x,'Собери вопрос о действии сейчас.') for x in ['Is she reading now?','Are they playing now?','What is he doing?','Are you swimming now?']],matching([('What is he doing?','He is swimming.'),('What are they doing?','They are playing.')],'Подбери ответ о действии.')]
  if kind=='continuous-negative':
   data=[('Отрицание: She … reading now.','is not',['is not','does not']),('Отрицание: They … playing.','are not',['are not','do not']),('Отрицание: I … swimming.','am not',['am not','is not']),('He is not … now.','running',['run','running'])]
  elif kind=='continuous-correction':
   data=[('Анна сейчас читает, а не спит. Выбери исправление.','She is not sleeping. She is reading.',['She is not sleeping. She is reading.','She does not sleeping. She reading.']),('Мальчики плывут, а не бегут.','They are not running. They are swimming.',['They are not running. They are swimming.','They not run. They is swimming.']),('Сейчас: I … a picture.','am painting',['am painting','paint']),('Сейчас: We … a game.','are playing',['are playing','plays'])]
  elif kind in ['continuous-reply','who-now']:
   data=[('Is she reading? По условию: да.','Yes, she is.',['Yes, she is.','Yes, she does.']),('Are they swimming? По условию: нет.','No, they are not.',['No, they are not.','No, they do not.']),('Who is sleeping? По условию: девочка.','She is.',['She is.','She does.']),('Who is playing? По условию: я.','I am.',['I am.','I do.'])]
  else:data=[('Сейчас: She … reading.','is',['am','is','are']),('Сейчас: They … swimming.','are',['am','is','are']),('Сейчас: I … playing.','am',['am','is','are']),('Сейчас: He is … a bike.','riding',['ride','riding']),('Сейчас: We are … .','running',['run','running'])]
 elif kind in ['present-simple','present-fill','do-does','likes-table','present-negative','present-mixed','present-reply','third-person']:
  sid=S['simple'];title='Что мы делаем обычно'
  if kind=='third-person':return 'table',sid,'Действия с he и she',[matching([('play','plays'),('watch','watches'),('study','studies'),('go','goes')],'Подбери форму для he / she.'),*choices([('Обычно: She … books.','reads',['read','reads']),('Обычно: He … milk.','drinks',['drink','drinks']),('После does: Does she …?','read',['read','reads'])],'В утверждении с he/she/it добавляем -s или -es; согласная + y меняется на -ies. После does окончание убираем.')]
  if kind=='do-does':return 'order',sid,'Спроси об обычном действии',[order(x,'Собери вопрос об обычном действии.') for x in ['Does she like milk?','Do they play games?','Does he read books?','Do you swim on Monday?']]
  if kind=='present-negative':data=[('Отрицание: She … read every day.','does not',['does not','do not']),('Отрицание: They … play on Monday.','do not',['does not','do not']),('После does not: He does not … .','swim',['swim','swims']),('После do not: We do not … .','play',['play','plays'])]
  elif kind=='present-reply':data=[('Does he read? По условию: да.','Yes, he does.',['Yes, he does.','Yes, he is.']),('Do they play? По условию: нет.','No, they do not.',['No, they do not.','No, they are not.']),('Does she swim? По условию: нет.','No, she does not.',['No, she does not.','No, she is not.']),('Do you read? По условию: да.','Yes, I do.',['Yes, I do.','Yes, I am.'])]
  elif kind=='likes-table':data=[('Таблица: Ben — milk ✓; Mia — milk ✗. Ben … milk.','likes',['likes','does not like']),('По той же таблице: Mia … milk.','does not like',['likes','does not like']),('Таблица: We — pizza ✓. We … pizza.','like',['like','likes']),('Таблица: He — rice ✗. He … rice.','does not like',['does not like','do not like'])]
  else:data=[('Обычно: She … every day.','reads',['read','reads']),('Обычно: They … on Monday.','play',['play','plays']),('Вопрос: … he like milk?','Does',['Do','Does']),('Отрицание: She … like rice.','does not',['does not','do not']),('После does: Does she …?','swim',['swim','swims'])]
 elif kind.startswith('mixed') or kind=='simple-continuous':
  sid=S['tenses'];title='Обычно или сейчас?'
  if kind=='mixed-question':return 'order',sid,'Разные вопросы',[order(x) for x in ['Does she read every day?','Is she reading now?','Do they play on Monday?','Are they playing now?']]
  if kind=='mixed-negative':data=[('Отрицание сейчас: She … reading now.','is not',['is not','does not']),('Отрицание обычно: She … read every day.','does not',['is not','does not']),('Сейчас: They … swimming.','are not',['are not','do not']),('Обычно: They … swim on Monday.','do not',['are not','do not'])]
  elif kind in ['mixed-reply','mixed-who']:data=[('Who is reading now? По условию: она.','She is.',['She is.','She does.']),('Who reads every day? По условию: она.','She does.',['She is.','She does.']),('Are they playing now? По условию: да.','Yes, they are.',['Yes, they are.','Yes, they do.']),('Do they play every day? По условию: да.','Yes, they do.',['Yes, they are.','Yes, they do.'])]
  else:data=[('Сейчас: She … now.','is reading',['reads','is reading']),('Обычно: She … every day.','reads',['reads','is reading']),('Смотри: Look! They … .','are swimming',['swim','are swimming']),('Обычно: They … on Monday.','swim',['swim','are swimming']),('Сейчас: I … lunch now.','am having',['have','am having'])]
 elif kind=='time-preposition':
  sid=S['time'];title='Время: at, in, on'
  data=[('… Monday','on',['on','in','at']),('… seven o’clock','at',['on','in','at']),('… the morning','in',['on','in','at']),('… night','at',['on','in','at']),('… the weekend (британский вариант)','at',['on','in','at']),('… the afternoon','in',['on','in','at'])]
 elif kind in ['ordinal-match','ordinal-order','day-position','odd']:
  sid=S['ordinals'];title='Который по счёту'
  if kind=='ordinal-order':
   return 'order',sid,title,[dict(mode='order',prompt='Расположи от первого к четвёртому.',tokens=['third','first','fourth','second'],answers=['first | second | third | fourth'],why='Считаем места по порядку: первый, второй, третий, четвёртый.'),matching([('first','первый'),('second','второй'),('third','третий')]),choice('Пятый','fifth',['five','fifth'],'Число предметов и место по счёту называют разными словами.'),choice('Десятый','tenth',['ten','tenth'],'Для места по счёту нужна порядковая форма.')]
  if kind=='odd':return 'odd',sid,title,choices([('Три слова обозначают место по счёту. Найди слово о количестве: first, second, three, fourth.','three',['first','second','three','fourth']),('Лишнее по той же причине: fifth, six, seventh.','six',['fifth','six','seventh']),('Лишнее: eight, ninth, tenth.','eight',['eight','ninth','tenth']),('Лишнее: first, two, third.','two',['first','two','third'])],'Порядковое число — место по счёту, количественное — сколько предметов.')
  data=[('Monday — день номер 1: the … day.','first',['first','second','third']),('Tuesday — день номер 2: the … day.','second',['first','second','third']),('Wednesday — день номер 3: the … day.','third',['first','second','third']),('Пятое место','fifth',['five','fifth']),('Десятое место','tenth',['ten','tenth'])]
 elif kind in ['can','can-have-reply','can-have-be','animal-correction','animal-adjectives','have-has','have-questions','is-has']:
  sid='can' if kind.startswith('can') else 'have-got';title='Что умеют и какие бывают животные'
  if kind=='animal-adjectives':return 'matching','vocabulary',title,[matching([('long','длинный'),('short','короткий'),('big','большой'),('small','маленький')]),*choices([('Длинный хвост','a long tail',['a long tail','a short tail']),('Большие уши','big ears',['big ears','small ears']),('Короткие ноги','short legs',['short legs','long legs'])],'Прилагательное стоит перед предметом и не получает окончание числа.')]
  if kind=='have-questions':return 'order','have-got-questions',title,[order(x) for x in ['Has it got a tail?','Have they got wings?','Has the cat got ears?','Have you got a pet?']]
  data=[('Птица умеет летать: A bird … fly.','can',['can','has']),('У кота есть хвост: A cat … got a tail.','has',['is','has']),('Раскрой сокращение по смыслу: It’s got a tail. It … got a tail.','has',['is','has']),('Раскрой сокращение: It’s funny. It … funny.','is',['is','has']),('Can it swim? По условию: да.','Yes, it can.',['Yes, it can.','Yes, it has.'])]
 elif kind=='expand':
  return 'grammar','contractions','Раскрываем сокращения',choices([('Речь о состоянии: He’s happy.','He is happy.',['He is happy.','He has happy.']),('Речь о наличии: He’s got a ball.','He has got a ball.',['He is got a ball.','He has got a ball.']),('We’re at home.','We are at home.',['We are at home.','We is at home.']),('I’m reading.','I am reading.',['I am reading.','I is reading.'])],'Смотри на слова после сокращения: got подсказывает has, действие с -ing или описание — is.')
 elif kind in ['plural','number-plural','singular-plural','singular-plural-choice','number-sequences']:
  return 'plural','plural','Один, несколько и числа',choices([('Два предмета: two …','boxes',['box','boxes']),('Три предмета: three …','sandwiches',['sandwich','sandwiches']),('Несколько: This is a book.','These are books.',['These are books.','This are books.']),('Продолжи с шагом десять: twenty, thirty, …','forty',['forty','fourteen'])],'Для нескольких предметов нужна форма множественного числа. У числа forty нет буквы u.')
 elif kind in ['family-tree','family-questions','synonyms','translation']:
  return 'matching','phrases','Разбираем семью и значение фразы',[matching([('mother','mum'),('father','dad'),('grandmother','grandma'),('grandfather','grandpa')],'Подбери семейное слово с тем же значением.'),*choices([('My sister — это…','моя сестра',['моя сестра','его сестра']),('Her brother — это…','её брат',['её брат','мой брат']),('Their family — это…','их семья',['их семья','наша семья'])],'В разговоре mother называют mum, father — dad. Слово перед родственником указывает на хозяина.')]
 elif kind in ['be','be-question','be-reply','reading-be','describe','location-correction','correction']:
  sid='be';title='Кто где находится'
  if kind=='be-question':return 'order',sid,title,[order(x) for x in ['Is he at home?','Are they in the garden?','Is she in the kitchen?','Are you at school?']]
  data=[('I … in the kitchen.','am',['am','is','are']),('She … in the garden.','is',['am','is','are']),('They … at home.','are',['am','is','are']),('Is she at school? По условию: нет.','No, she is not.',['No, she is not.','No, she are not.']),('Исправь ошибку: We is at home.','We are at home.',['We are at home.','We am at home.'])]
 else:raise ValueError('Factory missing for '+kind)
 if sid.startswith('rest-'):rule=next(s['explanation'] for s in skills if s['id']==sid)
 else:rule='Сравни человека и число: с I нужно am, с he/she/it — is, с we/you/they — are. Вопрос начинается с глагола.' if sid=='be' else 'Для действия после can нужна начальная форма, а для наличия — have или has got.'
 # Stable rotation makes repeated objectives distinct without changing their operation.
 rotate=seed%len(data);data=data[rotate:]+data[:rotate]
 return 'grammar',sid,title,choices(data,rule)

def reading(topic,kind,seed):
 group='family' if topic.startswith('family') else 'food' if topic.startswith('food') else 'animals' if topic=='animals' else 'room' if topic in ['room','furniture'] else 'past' if kind=='reading-past' else 'daily' if topic=='daily' else 'now'
 packs={
 'family':('I am Ben. I have a sister. Her name is Emma. We live with our mum and dad. Emma has a black cat.', [('Who has a sister?','Ben',['Ben','Emma']),('What is his sister’s name?','Emma',['Emma','Anna']),('Who has a cat?','Emma',['Ben','Emma']),('What colour is the cat?','black',['black','white'])]),
 'food':('Emma has a lunchbox. There are two apples and a sandwich in it. She likes cheese sandwiches. Ben has some milk. He does not like rice.', [('How many apples are there?','two',['one','two']),('Who has some milk?','Ben',['Ben','Emma']),('What does Emma like?','cheese sandwiches',['cheese sandwiches','rice']),('Does Ben like rice?','No, he does not.',['Yes, he does.','No, he does not.'])]),
 'animals':('Ben has a small rabbit. It is white. It has long ears and a short tail. It can jump. Ben gives it a carrot every morning.', [('What pet has Ben got?','a rabbit',['a rabbit','a parrot']),('What colour is it?','white',['white','black']),('What can it do?','jump',['jump','fly']),('What are its ears like?','long',['short','long'])]),
 'room':('This is Emma’s room. There is a blue sofa next to the window. There are two chairs. A small table is in front of the sofa. There is a book on the table.', [('What colour is the sofa?','blue',['blue','red']),('How many chairs are there?','two',['one','two']),('What is in front of the sofa?','a table',['a table','a fridge']),('Where is the book?','on the table',['on the table','under the sofa'])]),
 'past':('Yesterday Ben went to the park. He saw a small bird. He played with his sister. They came home at six. Ben was happy.', [('Where did Ben go?','to the park',['to the park','to school']),('What did he see?','a bird',['a bird','a fish']),('Who did he play with?','his sister',['his sister','his dad']),('Was he happy?','Yes, he was.',['Yes, he was.','No, he was not.'])]),
 'daily':('Emma gets up at seven. She has breakfast at eight. She goes to school on Monday. She reads every evening. It is Saturday now. Emma is playing with Ben.', [('What time does she get up?','at seven',['at seven','at eight']),('When does she read?','every evening',['every morning','every evening']),('What day is it now?','Saturday',['Monday','Saturday']),('What is she doing now?','playing',['playing','reading'])]),
 'now':('Ben and Emma are in the park now. Ben is riding a bike. Emma is reading a book. Their mum is painting a picture. The sun is shining.', [('Where are they?','in the park',['in the park','at school']),('Who is riding a bike?','Ben',['Ben','Emma']),('What is Emma doing?','reading',['reading','swimming']),('What is their mum doing?','painting',['painting','sleeping'])])}
 text,qs=packs[group];why='Ответ ищем в тексте над вопросом. Не угадывай по своему опыту: здесь важны факты рассказа.'
 if kind in ['reading-gap','reading-object','reading-be']:
  # The complete short authored context stays visible. The gap tests the target language.
  if group=='family':gaps=[('I have a sister. … name is Emma.','Her',['Her','His','Their']),('Ben and Emma: … live with mum and dad.','We',['We','He','She']),('Emma … a black cat.','has',['has','have']),('Look at Emma: Look at … .','her',['her','she'])]
  elif group=='food':gaps=[('There … two apples.','are',['is','are']),('She … cheese sandwiches.','likes',['like','likes']),('Ben has … milk.','some',['some','any']),('Ben … not like rice.','does',['do','does'])]
  elif group=='room':gaps=[('There … a blue sofa.','is',['is','are']),('There … two chairs.','are',['is','are']),('A book is … the table.','on',['on','in']),('The table is in … of the sofa.','front',['front','under'])]
  elif group=='animals':gaps=[('It … long ears.','has',['has','have']),('It can … .','jump',['jump','jumps']),('It … white.','is',['is','are']),('Ben … it a carrot.','gives',['give','gives'])]
  elif group=='daily':gaps=[('Emma … up at seven.','gets',['get','gets']),('She reads … the evening.','in',['in','on']),('She goes to school … Monday.','on',['on','at']),('She … playing now.','is',['is','does'])]
  else:gaps=[('They … in the park now.','are',['is','are']),('Ben is … a bike.','riding',['ride','riding']),('Emma … reading.','is',['is','are']),('Mum is painting … picture.','a',['a','an'])]
  return [choice('Авторский текст для тренировки: '+text+'\nЗаполни пропуск: '+p,a,o,why) for p,a,o in gaps]
 if kind=='reading-title':return [choice('Авторский текст: '+text+'\nВыбери заголовок.','Lunch in a lunchbox',['Lunch in a lunchbox','A day at the zoo'],why),*[choice('Авторский текст: '+text+'\n'+p,a,o,why) for p,a,o in qs[:3]]]
 return [choice('Авторский текст для тренировки: '+text+'\n'+p,a,o,why) for p,a,o in qs]

def make(r):
 kind,topic,seed=r['kind'],r['topic'],r['number']
 if kind=='categories':
  return 'table','vocabulary','Еда по группам',[matching([('milk','напитки'),('apple','фрукты'),('chicken','еда'),('cake','десерты')],'Выбери подходящую группу.'),matching([('water','напитки'),('banana','фрукты'),('sandwich','еда'),('jelly','десерты')],'Выбери подходящую группу.'),choice('Что можно пить?','lemonade',['lemonade','sandwich'],'Напиток пьют, твёрдую еду едят.')]
 if kind in ['match','letters','alphabet']:
  ws=[]
  for f in lexical(r):
   ws.append(word(f))
  if kind=='match':
   tasks=[matching([(w['form'],w['meanings'][0]['ru']) for w in ws[i:i+4]]) for i in range(0,len(ws),4)]
   # Follow matching with individual contextual retrieval, not the same grid repeated.
   for i,w in enumerate(ws[:3]):
    opts=[v['form'] for v in ws if v['form']!=w['form']][:2]+[w['form']]
    tasks.append(choice('Выбери слово: '+w['meanings'][0]['ru'],w['form'],opts,'Сравни значение слов. Прослушай слово, если нужна опора.'))
   return 'matching','vocabulary','Слова темы: значение',tasks
  if kind=='letters':return 'letters','spelling','Восстанови написание',[dict(mode='text',prompt=w['form'][0]+'_'*(len(w['form'])-2)+w['form'][-1]+' — '+w['meanings'][0]['ru']+'\nНапиши слово или выражение целиком.',answers=[w['form']],why='Проверь последовательность букв. Сначала можно прослушать слово, затем написать самостоятельно.') for w in ws]
  groups=[ws[i:i+4] for i in range(0,len(ws),4) if len(ws[i:i+4])>1]
  return 'alphabet','alphabet','Порядок по алфавиту',[dict(mode='order',prompt='Расставь слова по английскому алфавиту. Сравнивай следующие буквы, если первые одинаковые.',tokens=[w['form'] for w in g],answers=[' | '.join(sorted([w['form'] for w in g],key=str.lower))],why='Сначала сравни первые буквы, затем вторые и следующие. Счёт дней и алфавит — разные порядки.') for g in groups]
 if kind.startswith('personal'):return 'template',S['past'] if 'past' in kind or kind=='personal-town' else S['now'] if kind=='personal-now' else S['simple'] if kind in ['personal-routine','personal-hobbies','personal-food'] else 'phrases','Мой собственный ответ',personal(topic,kind)
 if kind.startswith('reading'):return 'reading',S['past'] if kind=='reading-past' else 'sentence-meaning','Читаем и понимаем',reading(topic,kind,seed)
 if kind=='phonics':
  pairs={
   'sound-a':[('cake','дифтонг эй'),('name','дифтонг эй'),('cat','краткий гласный'),('bag','краткий гласный')],
   'sound-i':[('bike','дифтонг ай'),('kite','дифтонг ай'),('fish','краткий и'),('milk','краткий и')],
   'sound-o':[('nose','дифтонг оу'),('home','дифтонг оу'),('dog','краткий о'),('box','краткий о')],
   'sound-y':[('my','дифтонг ай'),('fly','дифтонг ай'),('funny','безударный и'),('happy','безударный и')],
   'sound-u':[('fruit','долгий у'),('blue','долгий у'),('uncle','краткий гласный'),('funny','краткий гласный')],
   'sound-ng':[('sing','носовой звук в конце'),('long','носовой звук в конце'),('pen','обычный н'),('ten','обычный н')],
   'sound-s':[('plays','звонкое з'),('runs','звонкое з'),('jumps','глухое с'),('watches','дополнительный слог из')],
   'sound-c':[('cat','звук к'),('nice','звук с'),('pick','звук к'),('child','звук ч')]}[topic]
  return 'table','phonics','Слушаем и сравниваем звуки',[matching(pairs[:2],'Прослушай и выбери группу звука.'),matching(pairs[2:],'Прослушай и выбери группу звука.'),choice('Какое слово звучит иначе в выделенной группе? '+', '.join([pairs[0][0],pairs[1][0],pairs[2][0]]),pairs[2][0],[x[0] for x in pairs[:3]],'Сравни звук, а не только букву. Кнопка музыки помогает услышать слово целиком.')]
 if kind=='dialogue':
  return 'dialogue','questions','Диалог по порядку',[dict(mode='order',prompt='Сначала продавец приветствует покупателя. Затем покупатель заказывает, продавец передаёт, покупатель благодарит. Расставь реплики.',tokens=['Thank you.','Here you are.','Hello! What would you like?','A sandwich, please.'],answers=['Hello! What would you like? | A sandwich, please. | Here you are. | Thank you.'],why='Диалог строится по смыслу: предложение выбрать, просьба, передача, благодарность.'),matching([('What would you like?','A sandwich, please.'),('Here you are.','Thank you.')]),choice('Как попросить молоко?','Some milk, please.',['Some milk, please.','Milk are please.'],'Неисчисляемое milk употребляется с some, а please делает просьбу вежливой.')]
 if kind in ['dialogue-match','dialogue-gap']:
  pairs=[('Do you like milk?','Yes, I do.'),('What would you like?','A sandwich, please.'),('Here you are.','Thank you.'),('How much is it?','Two pounds.')] if topic.startswith('food') else [('Where is the book?','On the table.'),('Whose bag is it?',"It is Ben's."),('Is she reading?','Yes, she is.'),('What is he doing?','He is playing.')]
  return 'dialogue','questions','Диалог: вопрос и ответ',[matching(pairs[:2],'Подбери реплики собеседника.'),matching(pairs[2:],'Подбери реплики собеседника.'),*choices([('Как вежливо попросить бутерброд?','A sandwich, please.',['A sandwich, please.','A sandwich, thank you.']),('Как поблагодарить?','Thank you.',['Thank you.','How much?'])] if topic.startswith('food') else [('Как спросить о месте?','Where is it?',['Where is it?','Whose is it?']),('Как спросить о действии сейчас?','What is he doing?',['What is he doing?','Where does he live?'])],'Отвечай на смысл вопроса: место, хозяин, действие или вежливая просьба.')]
 if kind=='order':
  sentences=['I like cheese sandwiches.','Have you got any milk?','There are some apples.','Would you like a sandwich?'] if topic.startswith('food') else ['She is reading now.','Are they playing a game?','He is not swimming.','What are you doing?'] if topic=='leisure' else ['Do you read every day?','She gets up at seven.','They are playing now.','What time do you get up?'] if topic=='daily' else ['There is a book on the table.','Where is your bag?','These are my toys.','She is in the kitchen.']
  return 'order','word-order','Собери фразу',[order(s) for s in sentences]
 return grammar(kind,topic,seed)

units=[];catalog=[]
for r in refs:
 m=r['module'];part='a' if int(r['lesson'].split('a')[0])%2 else 'b';n=r['number'];ident=f'wb26-m{m}{part}-{n:02}';sid=f'src26-m{m}{part}-{n}'
 mechanic,sk,title,tasks=make(r)
 for t in tasks:
  t['skillIds']=[sk]
  reveal=t.get('answers',[None])[0] or 'Сравни варианты с образцом правила.'
  t['hints']=['Сначала попробуй сам. Затем найди в подготовке нужное слово или правило.',t['why'],'Опора: '+reveal]
  if t['mode']=='choice':random.Random(ident+t['prompt']).shuffle(t['options'])
 wid=[]
 for f in bank(r['topic']) if r['topic'] in banks or r['topic'] in aliases else []:
  w=word(f)
  if w['occurrences']:wid.append(w['id'])
 e=dict(id=ident,title=f'{title} · {r["lesson"]}, № {n}',mechanic=mechanic,skillIds=[sk],wordIds=list(dict.fromkeys(wid)),instruction='Авторская тренировка по задаче сборника. Прочитай условие, при необходимости разбери слова и правило; затем попробуй без подсказок.',tasks=tasks);units.append(e)
 vocab=[w['id'] for w in [*known.values(),*newwords] if any(o['exerciseId']==sid for o in w['occurrences'])]
 catalog.append(dict(id=sid,edition='2026_17',sourceId='spotlight_workbook_2026_17',moduleId=m,module=m,lessonId=r['lesson'],lesson=r['lesson'],printedPage=r['page'],bookPage=r['page'],pdfPage=None,exerciseNumber=n,number=n,exerciseType=r['kind'],sourceType='video-exercise',learningObjectives=[title],grammarSkills=[sk],skillIds=[sk],vocabularyIds=vocab,requiredWordIds=e['wordIds'],prerequisiteSkills=[],prerequisiteSkillIds=[],sourceFrameTimestamp=r['timestamp'],sourceFramePart='part1' if r['timestamp']<101.247911 else 'part2',frameSha256=r['frameSha256'],continuationPages=r['continuation'],printedPages=[r['page'],*r['continuation']],verificationStatus='objectives_verified',implementationStatus='implemented',textVerification='partial' if r['partial'] else 'objectives_only',stages=dict(found=True,textChecked=False,objectivesChecked=True,adaptationCreated=True,answerCheckReady=True,explanationsReady=True,preparationReady=True,audioReady=False,tested=False),status='implemented',indexReview='video-visual',lexicalReview='partial',difficulty=2,interactiveType=mechanic,adaptationIds=[ident],adaptationId=ident,title=title,adaptationStepCount=len(tasks),sourceSubitemCount=None,pageVerification='continuation-order; footer not readable' if r['page']==144 else 'video-visual',adaptationScope='Авторский аналог цели, не копия всех подпунктов оригинала. Полный текст источника не заявлен как проверенный.'))
# Readiness is restored only by a QA record for this exact authored content.
qa_path=ROOT/'docs/workbook/modules-2-8-qa.json'
digest=hashlib.sha256(json.dumps(units,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
if qa_path.exists():
 qa=json.loads(qa_path.read_text())
 if qa.get('contentSha256')==digest:
  for ref in catalog:
   ref['stages']['audioReady']=qa.get('audio',{}).get('sha256AndFfmpegPassed',False)
   ref['stages']['tested']=qa.get('verification',{}).get('newExerciseE2ePassed',0)==len(units)
   if ref['stages']['tested']:ref['testEvidence']='Production E2E: complete, reload, repeat; offline canonical and invalid-answer validation'
save('edition-2026-rest.json',units);save('edition-2026-rest-catalog.json',catalog);save('edition-2026-rest-skills.json',skills)
# Keep existing form IDs and proof. Add only forms that were observed; no invented source forms.
sourcewords=[*known.values(),*[w for w in newwords if w['occurrences']]]
example_overrides={
 'small':('It has a small nose.','У него маленький нос.'),
 'dad':('My dad is at home.','Мой папа дома.'),
 'mother':('My mother is at home.','Моя мама дома.'),
 'father':('My father is at home.','Мой папа дома.'),
 'water':('I drink water.','Я пью воду.'),
 'chicken':('I like chicken.','Мне нравится курица.'),
 'chocolate':('I like chocolate.','Мне нравится шоколад.'),
 'cake':('This is a cake.','Это торт.'),
 'carrot':('This is a carrot.','Это морковка.'),
 'banana':('This is a banana.','Это банан.'),
 'long':('It has a long tail.','У него длинный хвост.'),
 'thin':('It has thin legs.','У него тонкие ноги.'),
 'short':('It has a short tail.','У него короткий хвост.'),
 'fat':('It has a fat body.','У него толстое тело.'),
 'long tail':('It has a long tail.','У него длинный хвост.'),
 'thin legs':('It has thin legs.','У него тонкие ноги.'),
 'big eyes':('It has big eyes.','У него большие глаза.'),
 'small nose':('It has a small nose.','У него маленький нос.'),
 'fat body':('It has a fat body.','У него толстое тело.'),
 'big ears':('It has big ears.','У него большие уши.'),
 'small head':('It has a small head.','У него маленькая голова.'),
 'short tail':('It has a short tail.','У него короткий хвост.'),
 'day off':('It is my day off.','Сегодня мой выходной.'),
 'over there':('My bag is over there.','Моя сумка вон там.'),
 'upside down':('The box is upside down.','Коробка перевёрнута вверх ногами.'),
 'at night':('I sleep at night.','Я сплю ночью.'),
 'in the morning':('I read in the morning.','Я читаю утром.'),
 'in the afternoon':('I play in the afternoon.','Я играю днём.'),
 'in the evening':('I read in the evening.','Я читаю вечером.')}
for w in sourcewords:
 if w['form'].lower() in example_overrides:
  en,ru=example_overrides[w['form'].lower()];w['example']=dict(en=en,ru=ru,authored=True)

save('edition-2026-lexicon.json',sourcewords)
entities=read('edition-2026-entities.json');already={x['id'] for x in entities['lexemes']}
for w in sourcewords:
 if w['lexemeId'] not in already:
  entities['lexemes'].append(dict(id=w['lexemeId'],lemma=w['lemma'],ru=w['meanings'][0]['ru'],ipa=w['ipa'],normalizedOnly=not w['lemmaObserved'],wordFormIds=[w['id']],pronunciationText=w['lemma']));already.add(w['lexemeId'])
 # Rebuild modern normalized entities with IDs in their existing namespace.
entities['pronunciations']=[];entities['meanings']=[];entities['occurrences']=[];entities['examples']=[]
for w in sourcewords:
 wid=w['id'];pid='pron-'+wid;eid='example-'+wid
 entities['pronunciations'].append(dict(id=pid,wordFormId=wid,ipa=w['ipa'],dialect='en-GB',audioText=w['form'],review='reviewed'))
 entities['examples'].append(dict(id=eid,wordFormId=wid,**w['example']))
 w['pronunciationId']=pid;w['exampleId']=eid;w['meaningIds']=[];w['occurrenceIds']=[]
 for i,m in enumerate(w['meanings']):
  mid=f'meaning26-{wid}-{i}';w['meaningIds'].append(mid);entities['meanings'].append(dict(**m,wordFormId=wid)|dict(id=mid))
 for i,o in enumerate(w['occurrences']):
  oid=f'occ26-{wid}-{i}';w['occurrenceIds'].append(oid);entities['occurrences'].append(dict(**o,id=oid,wordFormId=wid))
save('edition-2026-entities.json',entities);save('edition-2026-lexicon.json',sourcewords)
print('Generated',len(units),'units;',sum(len(e['tasks']) for e in units),'steps;',len(sourcewords),'source dictionary forms')
