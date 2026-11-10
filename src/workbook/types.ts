export type Mechanic =
  | 'matching'
  | 'letters'
  | 'anagram'
  | 'alphabet'
  | 'plural'
  | 'grammar'
  | 'order'
  | 'correction'
  | 'odd'
  | 'gap'
  | 'reading'
  | 'translation'
  | 'crossword'
  | 'wordsearch'
  | 'dialogue'
  | 'table'
  | 'template'
  | 'letter';
export interface SourceExercise {
  sourceId?: string;
  printedPages?: number[];
  validationStatus?: string;
  sourceExerciseVerification?: string;
  evidenceReportPage?: number;
  evidenceTimestamp?: string | number;
  id: string;
  module: string;
  lesson: string;
  bookPage: number | null;
  pdfPage: number | null;
  continuationPages: number[];
  number: number | null;
  sourceType: string;
  skillIds: string[];
  requiredWordIds: string[];
  lexicalReview: string;
  difficulty: number;
  prerequisiteSkillIds: string[];
  interactiveType: string;
  status: 'not_started' | 'in_progress' | 'implemented' | 'reviewed' | 'blocked';
  indexReview: string;
  adaptationIds: string[];
}
export interface Occurrence {
  sourceId?: string;
  exerciseId: string;
  bookPage: number | null;
  pdfPage: number | null;
  text: string;
  verification: string;
  printedPages?: number[];
  exerciseNumber?: number | null;
  module?: string;
  evidenceReportPage?: number;
  evidenceTimestamp?: string | number;
  kind?: string;
}
export interface Meaning {
  id: string;
  ru: string;
  context: string;
  when: string;
  occurrence?: Occurrence;
}
export interface WordForm {
  id: string;
  lexemeId: string;
  form: string;
  lemma: string;
  lemmaObserved: boolean;
  ipa: string;
  ipaReview: string;
  partOfSpeech: string;
  grammar: string;
  meanings: Meaning[];
  occurrences: Occurrence[];
  example: { en: string; ru: string; authored: boolean };
}
export interface Skill {
  id: string;
  title: string;
  prerequisites: string[];
  planned?: boolean;
  explanation?: string;
  example?: { en: string; ru: string };
  steps?: string[];
  practice?: { prompt: string; options: string[]; answer: string; why: string }[];
}
export interface Placement {
  word: string;
  start: number[];
  end: number[];
}
export interface CrosswordWord {
  answer: string;
  row: number;
  col: number;
  direction: string;
  clue: string;
}
export interface Task {
  answerIpa?: string;
  hints?: string[];
  skillIds?: string[];
  mode: 'text' | 'choice' | 'order' | 'matching' | 'template' | 'wordsearch' | 'crossword';
  prompt: string;
  answers?: string[];
  why: string;
  caseSensitive?: boolean;
  options?: string[];
  tokens?: string[];
  rows?: { label: string; answers: string[] }[];
  slots?: { label: string; options: string[] }[];
  grid?: string[];
  placements?: Placement[];
  words?: CrosswordWord[];
  diagnoses?: Record<string, string>;
}
export interface WorkbookExercise {
  id: string;
  title: string;
  mechanic: Mechanic;
  skillIds: string[];
  wordIds: string[];
  instruction: string;
  tasks: Task[];
}
export interface Answer {
  text?: string;
  values?: string[];
  order?: number[];
  found?: string[];
}
export interface Knowledge {
  attempts: number;
  independent: number;
  errors: number;
  hinted: number;
  streak: number;
  due: number;
}
export interface Attempt {
  exerciseId: string;
  task: number;
  correct: boolean;
  hinted: boolean;
  at: number;
  skillIds: string[];
  kind: 'exercise' | 'preparation' | 'word-review';
}
export interface WorkbookProgress {
  sourceId: string;
  schemaVersion: 1;
  currentId: string;
  positions: Record<string, number>;
  completed: string[];
  words: Record<string, Knowledge>;
  grammar: Record<string, Knowledge>;
  meaning: Record<string, Knowledge>;
  attempts: Attempt[];
  hintCount: number;
  reviewIds: string[];
  seconds: number;
  preparations: Record<string, number>;
  updatedAt: number;
}
