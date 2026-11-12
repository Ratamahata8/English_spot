export function scaffold(skill: string) {
  if (skill === 'past-be')
    return {
      text: 'Говорим о прошлом. I/he/she/it → was. You/we/they → were. Вопрос начинается с was/were, отрицание добавляет not.',
      question: 'Выбери форму: They ... happy yesterday.',
      answer: 'were',
      options: ['was', 'were', 'is'],
    };
  if (skill.startsWith('past-'))
    return {
      text: 'В утверждении о прошлом правильный глагол получает -ed. Но после did или did not нужна начальная форма без -ed.',
      question: 'Выбери: Did you ...?',
      answer: 'play',
      options: ['played', 'plays', 'play'],
    };
  if (['be', 'plural-be', 'demonstratives'].includes(skill))
    return {
      text: 'Сначала найди, о ком говорят. I am; he/she/it is; you/we/they are. This/that — один предмет; these/those — несколько.',
      question: 'Выбери: They ... books.',
      answer: 'are',
      options: ['is', 'am', 'are'],
    };
  if (skill === 'likes')
    return {
      text: 'I/you/we/they like. He/she/it likes. В вопросе и отрицании does берёт окончание на себя: does ... like, does not like.',
      question: 'Выбери: Does he ... milk?',
      answer: 'like',
      options: ['likes', 'like', 'liked'],
    };
  if (skill === 'some-any')
    return {
      text: 'Есть продукт → some. Нет продукта → not ... any. Обычный вопрос о наличии → any. Вежливая просьба Can I have ... please? допускает some.',
      question: 'Выбери: I have not got ... milk.',
      answer: 'any',
      options: ['some', 'any', 'an'],
    };
  if (['possessives', 'possessive-s', 'who', 'whose', 'family-tree'].includes(skill))
    return {
      text: 'Who — кто? Whose — чей? My — мой, his — его, her — её, their — их. Имя + ’s показывает владельца вещи.',
      question: 'Как спросить «кто»?',
      answer: 'Who?',
      options: ['Whose?', 'Who?', 'When?'],
    };
  if (skill === 'plurals')
    return {
      text: 'Сравни один предмет и несколько: one book — two books. Обычно добавляем -s. Если меняем всё предложение, is меняется на are.',
      question: 'Несколько книг — это...',
      answer: 'books',
      options: ['book', 'books', 'book is'],
    };
  if (skill === 'articles')
    return {
      text: 'Произнеси начало слова. Согласный звук → a. Гласный звук → an. Смотрим на звук, а не только на букву.',
      question: 'Выбери: ... apple.',
      answer: 'an',
      options: ['a', 'an', 'are'],
    };
  if (skill === 'numbers')
    return {
      text: 'Считай по шагам. Plus — прибавить, take away — вычесть. Сначала найди число, затем запиши его английское название.',
      question: 'Two plus three is...',
      answer: 'five',
      options: ['four', 'five', 'six'],
    };
  if (skill === 'colours')
    return {
      text: 'Если просят прочитать слово, назови его значение. Если спрашивают цвет букв или предмета, смотри на цвет. Это разные задачи.',
      question: 'Что означает red?',
      answer: 'красный',
      options: ['красный', 'синий', 'жёлтый'],
    };
  if (skill.startsWith('phonics'))
    return {
      text: 'Произнеси слово целиком. Сравни нужный звук с примером на странице. Одна буква может передавать разные звуки.',
      question: 'Как лучше проверить звук в слове?',
      answer: 'Послушать слово и сравнить с образцом.',
      options: [
        'Только посчитать буквы.',
        'Послушать слово и сравнить с образцом.',
        'Посмотреть на цвет картинки.',
      ],
    };
  if (skill === 'commands')
    return {
      text: 'В команде действие обычно стоит первым: open, close, stand, sit. Do not / don’t перед действием означает запрет.',
      question: 'Что означает Sit down?',
      answer: 'Сядь.',
      options: ['Встань.', 'Сядь.', 'Хлопни в ладоши.'],
    };
  return {
    text: 'Прочитай вопрос ещё раз. Найди ключевое слово и связанное с ним место в тексте или рисунке. Сравни весь ответ с условием.',
    question: 'Как лучше начать поиск ответа в тексте?',
    answer: 'Найти ключевое слово из вопроса.',
    options: [
      'Угадать по длине ответа.',
      'Найти ключевое слово из вопроса.',
      'Всегда выбрать первый вариант.',
    ],
  };
}
