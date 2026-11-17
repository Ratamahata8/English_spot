import { useState } from 'react';
import { Link } from 'react-router-dom';
import './teacher-topics.css';

type Pronoun = { subject: string; possessive: string; ipa: string; possessiveIpa: string; meaning: string; possessiveMeaning: string; use: string; example: string; translation: string };
export const pronouns: Pronoun[] = [
  { subject:'I',possessive:'my',ipa:'/aɪ/',possessiveIpa:'/maɪ/',meaning:'я',possessiveMeaning:'мой, моя, моё, мои',use:'Когда говоришь о себе. I всегда пишется с большой буквы.',example:'I am a pupil. This is my bag.',translation:'Я ученик. Это моя сумка.' },
  { subject:'you',possessive:'your',ipa:'/juː/',possessiveIpa:'/jɔː/',meaning:'ты / вы',possessiveMeaning:'твой / ваш',use:'Когда обращаешься к одному человеку или нескольким людям.',example:'You are my friend. Is this your pen?',translation:'Ты мой друг. Это твоя ручка?' },
  { subject:'he',possessive:'his',ipa:'/hiː/',possessiveIpa:'/hɪz/',meaning:'он',possessiveMeaning:'его',use:'Когда говоришь о мальчике или мужчине.',example:'He is my brother. His name is Tom.',translation:'Он мой брат. Его зовут Том.' },
  { subject:'she',possessive:'her',ipa:'/ʃiː/',possessiveIpa:'/hɜː/',meaning:'она',possessiveMeaning:'её',use:'Когда говоришь о девочке или женщине.',example:'She is my sister. Her name is Ann.',translation:'Она моя сестра. Её зовут Энн.' },
  { subject:'it',possessive:'its',ipa:'/ɪt/',possessiveIpa:'/ɪts/',meaning:'оно / он / она (о предмете или животном)',possessiveMeaning:'его / её (о предмете или животном)',use:'О предмете, явлении или животном, если пол не важен. Для конкретного питомца иногда говорят he или she.',example:'It is a cat. Its tail is long.',translation:'Это кошка. У неё длинный хвост.' },
  { subject:'we',possessive:'our',ipa:'/wiː/',possessiveIpa:'/aʊə/',meaning:'мы',possessiveMeaning:'наш, наша, наше, наши',use:'Когда говоришь о себе вместе с другими людьми.',example:'We are friends. Our school is big.',translation:'Мы друзья. Наша школа большая.' },
  { subject:'they',possessive:'their',ipa:'/ðeɪ/',possessiveIpa:'/ðeə/',meaning:'они',possessiveMeaning:'их',use:'Когда говоришь о нескольких людях, животных или предметах.',example:'They are pupils. Their books are new.',translation:'Они ученики. Их книги новые.' },
];
type Question = { context: string; before: string; after: string; answer: string; translation: string; rule: string };
const subjects: Question[] = [
 ['Я школьник.','',' am a pupil.','I','Я школьник.','О себе говорим I.'],
 ['Том — мой брат.','',' is my brother.','he','Он мой брат.','Том — мальчик, значит he.'],
 ['Энн — моя сестра.','',' is my sister.','she','Она моя сестра.','Энн — девочка, значит she.'],
 ['Моя мама — врач.','',' is a doctor.','she','Она врач.','Мама — женщина, значит she.'],
 ['Мой папа — водитель.','',' is a driver.','he','Он водитель.','Папа — мужчина, значит he.'],
 ['Мы с братом дома.','',' are at home.','we','Мы дома.','Говорящий и брат вместе — we.'],
 ['Том и Энн в школе.','',' are at school.','they','Они в школе.','Два человека — they.'],
 ['Это мой мяч.','',' is red.','it','Он красный.','Мяч — предмет, значит it.'],
 ['Обращение к другу.','',' are my friend.','you','Ты мой друг.','К собеседнику обращаемся you.'],
 ['Это мой стол.','',' is big.','it','Он большой.','Стол — предмет, значит it.'],
 ['Я люблю музыку.','',' like music.','I','Я люблю музыку.','О себе — I.'],
 ['Мы с друзьями играем.','',' play football.','we','Мы играем в футбол.','Я и друзья — we.'],
 ['Девочки поют.','',' sing songs.','they','Они поют песни.','Несколько девочек — they.'],
 ['Мальчик бегает.','',' runs fast.','he','Он быстро бегает.','О мальчике — he.'],
 ['Девочка читает.','',' reads books.','she','Она читает книги.','О девочке — she.'],
 ['Это окно.','',' is open.','it','Оно открыто.','Окно — предмет, значит it.'],
 ['Ты хороший ученик.','',' are a good pupil.','you','Ты хороший ученик.','Обращение к тебе — you.'],
 ['Мои родители дома.','',' are at home.','they','Они дома.','Родители — несколько людей, значит they.'],
 ['Я счастлив.','',' am happy.','I','Я счастлив.','О себе — I.'],
 ['Мы одна команда.','',' are a team.','we','Мы команда.','Группа вместе с говорящим — we.'],
 ['Мой дедушка добрый.','',' is kind.','he','Он добрый.','Дедушка — мужчина, значит he.'],
 ['Моя бабушка добрая.','',' is kind.','she','Она добрая.','Бабушка — женщина, значит she.'],
 ['Эти книги интересные.','',' are interesting.','they','Они интересные.','Книг несколько, значит they.'],
 ['Это дерево высокое.','',' is tall.','it','Оно высокое.','Дерево — предмет, значит it.'],
 ['Обращение к двум друзьям.','',' are funny.','you','Вы весёлые.','К двум собеседникам тоже обращаемся you.'],
 ['Это моя учительница.','',' is nice.','she','Она хорошая.','Учительница — женщина, значит she.'],
 ['Это мой учитель.','',' is nice.','he','Он хороший.','Учитель — мужчина, значит he.'],
 ['Я умею плавать.','',' can swim.','I','Я умею плавать.','О себе — I.'],
 ['Мы любим английский.','',' like English.','we','Мы любим английский.','Говорящий и другие — we.'],
 ['Птицы в небе.','',' can fly.','they','Они умеют летать.','Несколько птиц — they.'],
].map(([context,before,after,answer,translation,rule])=>({context,before,after,answer,translation,rule}));
const possessives: Question[] = [
 ['Это моя книга.','This is ',' book.','my','Это моя книга.','Моя — my, перед словом book.'],
 ['Это твой карандаш.','This is ',' pencil.','your','Это твой карандаш.','Твой — your, перед pencil.'],
 ['Том и его велосипед.','This is ',' bike.','his','Это его велосипед.','Том — мальчик, его — his.'],
 ['Энн и её сумка.','This is ',' bag.','her','Это её сумка.','Энн — девочка, её — her.'],
 ['Наша школа.','This is ',' school.','our','Это наша школа.','Наша — our.'],
 ['Их дом.','This is ',' house.','their','Это их дом.','Их — their.'],
 ['Собака и её хвост.','The dog has ',' tail.','its','У собаки есть хвост.','Когда пол собаки не уточнён, её — its.'],
 ['Мой брат.','This is ',' brother.','my','Это мой брат.','Мой — my.'],
 ['Твоя сестра.','This is ',' sister.','your','Это твоя сестра.','Твоя — your.'],
 ['Папа и его машина.','Dad likes ',' car.','his','Папа любит свою машину.','Папа — мужчина: his.'],
 ['Мама и её работа.','Mum likes ',' job.','her','Маме нравится её работа.','Мама — женщина: her.'],
 ['Наш учитель.','This is ',' teacher.','our','Это наш учитель.','Наш — our.'],
 ['Дети и их игрушки.','The children like ',' toys.','their','Детям нравятся их игрушки.','Дети — несколько человек: their.'],
 ['Кошка и её уши.','The cat has ',' ears.','its','У кошки есть уши.','Пол не уточнён: its.'],
 ['Мой любимый цвет.','Blue is ',' favourite colour.','my','Синий — мой любимый цвет.','Мой — my.'],
 ['Твоё имя.','What is ',' name?','your','Как тебя зовут?','Твоё — your.'],
 ['Бен и его мяч.','Ben has ',' ball.','his','У Бена есть мяч.','Бен — мальчик: his.'],
 ['Лиза и её кукла.','Lisa has ',' doll.','her','У Лизы есть кукла.','Лиза — девочка: her.'],
 ['Наш класс.','This is ',' classroom.','our','Это наш класс.','Наш — our.'],
 ['Мальчики и их велосипеды.','The boys ride ',' bikes.','their','Мальчики катаются на своих велосипедах.','Несколько мальчиков: their.'],
 ['Птица и её крылья.','The bird opens ',' wings.','its','Птица раскрывает крылья.','Пол птицы не указан: its.'],
 ['Мой завтрак.','I eat ',' breakfast.','my','Я ем свой завтрак.','Свой (о себе) — my.'],
 ['Твоя комната.','Is this ',' room?','your','Это твоя комната?','Твоя — your.'],
 ['Дедушка и его очки.','Grandpa has ',' glasses.','his','У дедушки есть очки.','Дедушка — мужчина: his.'],
 ['Бабушка и её сад.','Grandma loves ',' garden.','her','Бабушка любит свой сад.','Бабушка — женщина: her.'],
].map(([context,before,after,answer,translation,rule])=>({context,before,after,answer,translation,rule}));
export const practiceOne = [...subjects.slice(0,25),...possessives];
export const practiceTwo = subjects;
export const subjectChoices = ['I','you','he','she','it','we','they'];
export const possessiveChoices = ['my','your','his','her','its','our','their'];
export function TeacherTopics() {
 return <div className="teacher"><div className="page-heading"><div><span className="eyebrow">Школьные темы</span><h1>Темы от учителя</h1><p>Разбираем правила, тренируемся и закрепляем материал.</p></div></div><div className="panel padding teacher-intro"><h2>Личные местоимения</h2><p>Кто выполняет действие? Чей это предмет? Научимся выбирать I, you, he, she, it, we, they и my, your, his, her, its, our, their.</p><Link className="button primary" to="/teacher/pronouns">Открыть тему · 80 заданий</Link></div></div>;
}
function Pronounce({text}:{text:string}) {
 const [error,setError]=useState('');
 return <button type="button" className="button teacher-sound" onClick={()=>{setError('');if(!('speechSynthesis' in window)){setError('Озвучка недоступна в этом браузере');return;}window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-GB';u.rate=0.85;u.onerror=()=>setError('Не удалось воспроизвести произношение');window.speechSynthesis.speak(u);}} title={error||'Прослушать английское произношение'} aria-label={'Произнести '+text}>♫ {error||'Слушать'}</button>;
}
function Practice({questions,mode}:{questions:Question[];mode:1|2}) {
 const storageKey='english-spot-teacher-pronouns-'+mode;
 const [index,setIndex]=useState(()=>{try{return Math.min(questions.length,Math.max(0,Number(localStorage.getItem(storageKey+'-index')||0)));}catch{return 0;}});
 const [correct,setCorrect]=useState(()=>{try{return Math.min(questions.length,Math.max(0,Number(localStorage.getItem(storageKey+'-correct')||0)));}catch{return 0;}});
 const [answer,setAnswer]=useState('');
 const [checked,setChecked]=useState(false);
 const [hint,setHint]=useState(0);
 const q=questions[index];
 const choices=mode===2?subjectChoices:(index<25?subjectChoices:possessiveChoices);
 const success=!!q&&answer.toLowerCase().trim()===q.answer.toLowerCase();
 const next=()=>{const n=index+1;const c=correct+(success?1:0);setIndex(n);setCorrect(c);try{localStorage.setItem(storageKey+'-index',String(n));localStorage.setItem(storageKey+'-correct',String(c));}catch{}setAnswer('');setChecked(false);setHint(0);};
 const restart=()=>{setIndex(0);setCorrect(0);setAnswer('');setChecked(false);setHint(0);try{localStorage.removeItem(storageKey+'-index');localStorage.removeItem(storageKey+'-correct');}catch{}};
 if(!q)return <section className="panel padding"><h2>Практика {mode} завершена!</h2><p>Правильных ответов с первой проверки: {correct} из {questions.length}.</p><button className="button primary" onClick={restart}>Пройти ещё раз</button></section>;
 return <section className="panel padding teacher-practice"><div className="teacher-progress"><strong>Задание {index+1} из {questions.length}</strong><span>Верно: {correct}</span></div><progress value={index} max={questions.length}/><p className="teacher-context">{q.context}</p><div className="teacher-sentence"><span>{q.before}</span><span className="teacher-blank">{checked?q.answer:(answer||'_____')}</span><span>{q.after}</span><Pronounce text={q.before+q.answer+q.after}/></div><p>Выбери подходящее слово{mode===2?' — личное местоимение-подлежащее':''}.</p><div className="teacher-choices">{choices.map(choice=><button type="button" className={'button'+(answer===choice?' selected':'')} key={choice} disabled={checked} onClick={()=>setAnswer(choice)}>{choice}</button>)}</div><div className="teacher-actions"><button type="button" className="button" onClick={()=>setHint(Math.min(3,hint+1))}>? Подсказка {hint?hint+'/3':''}</button>{!checked?<button type="button" className="button primary" disabled={!answer} onClick={()=>setChecked(true)}>Проверить</button>:<button type="button" className="button primary" onClick={next}>Следующее задание</button>}</div>{hint>0&&<div className="teacher-hint" role="status">{hint===1?'Подумай, о ком говорится в русском предложении: о себе, собеседнике, мальчике, девочке, предмете или группе?':hint===2?q.rule:'Правильный ответ: '+q.answer+'. '+q.rule}<div><Pronounce text={q.answer}/><span className="ipa">{pronouns.flatMap(p=>[[p.subject,p.ipa],[p.possessive,p.possessiveIpa]]).find(p=>p[0].toLowerCase()===q.answer.toLowerCase())?.[1]}</span></div></div>}{checked&&<div className={'teacher-feedback '+(success?'correct':'')} role="status"><strong>{success?'Верно!':'Пока неверно. Правильный ответ: '+q.answer}</strong><p>{q.rule} {q.translation}</p><Pronounce text={q.before+q.answer+q.after}/></div>}</section>;
}
export function TeacherPronouns() {
 const [tab,setTab]=useState<'study'|'one'|'two'>('study');
 return <div className="teacher"><div className="lesson-top"><Link to="/teacher">← Темы от учителя</Link><strong>Личные местоимения</strong></div><div className="page-heading"><div><span className="eyebrow">Урок учителя · 3 класс</span><h1>Личные местоимения</h1><p>Сначала изучаем, затем выполняем 50 и 30 заданий.</p></div></div><div className="teacher-tabs" role="tablist" aria-label="Разделы темы"><button role="tab" aria-selected={tab==='study'} className={'button '+(tab==='study'?'primary':'')} onClick={()=>setTab('study')}>Изучение</button><button role="tab" aria-selected={tab==='one'} className={'button '+(tab==='one'?'primary':'')} onClick={()=>setTab('one')}>Практика 1 · 50</button><button role="tab" aria-selected={tab==='two'} className={'button '+(tab==='two'?'primary':'')} onClick={()=>setTab('two')}>Практика 2 · 30</button></div>{tab==='study'?<><section className="panel padding teacher-intro"><h2>Два разных вопроса</h2><p><strong>Кто?</strong> I, you, he, she, it, we, they — личные местоимения. Они могут быть подлежащим: <strong>He is Tom.</strong> — Он Том.</p><p><strong>Чей? Чья? Чьё? Чьи?</strong> my, your, his, her, its, our, their — притяжательные определители. Они стоят перед существительным: <strong>His name is Tom.</strong> — Его зовут Том.</p><p>Не путай: <strong>he</strong> — он, <strong>his</strong> — его; <strong>she</strong> — она, <strong>her</strong> — её. После <strong>my/your/his/her/its/our/their</strong> обычно идёт название предмета или человека.</p></section><div className="teacher-cards">{pronouns.map(p=><article className="panel teacher-card" key={p.subject}><div className="teacher-pair"><div><strong>{p.subject}</strong><span className="ipa">{p.ipa}</span><small>{p.meaning}</small><Pronounce text={p.subject}/></div><div><strong>{p.possessive}</strong><span className="ipa">{p.possessiveIpa}</span><small>{p.possessiveMeaning}</small><Pronounce text={p.possessive}/></div></div><p>{p.use}</p><div className="teacher-example"><strong>{p.example}</strong><p>{p.translation}</p><Pronounce text={p.example}/></div></article>)}</div><div className="teacher-actions"><button className="button primary" onClick={()=>setTab('one')}>Перейти к практике 1 →</button></div></>:tab==='one'?<Practice questions={practiceOne} mode={1}/>:<Practice questions={practiceTwo} mode={2}/>}</div>;
}
