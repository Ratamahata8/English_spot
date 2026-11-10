export interface VocabularyItem {
  sourceFormId?: string;
  sourceEditionId?: string;
  id: string;
  en: string;
  ru: string;
  ipa: string;
  explanation: string;
  example: string;
  image: string;
}
export interface Hint {
  translation: string;
  explanation: string;
  steps: string[];
  example: string;
}
export type ExerciseType = 'study' | 'picture' | 'word' | 'letters' | 'sentence';
export interface Exercise {
  answerMode?: 'translation';
  id: string;
  type: ExerciseType;
  wordId: string;
  skillId: string;
  prompt: string;
  answer: string;
  options: string[];
  hint: Hint;
}
export interface GrammarRule {
  id: string;
  title: string;
  text: string;
  examples: string[];
}
export interface RemedialLesson {
  id: string;
  title: string;
  available: boolean;
  explanation: string;
  example: string;
  question: string;
  answer: string;
  options: string[];
}
export interface AudioAsset {
  text: string;
  path: string;
  voice: string;
  sha256: string;
}
export interface Lesson {
  module: string;
  description: string;
  source: string;
  coverWordId: string;
  id: string;
  title: string;
  subtitle: string;
  vocabulary: VocabularyItem[];
  lexicon: VocabularyItem[];
  grammar: GrammarRule[];
  remedial: RemedialLesson[];
  exercises: Exercise[];
}
export interface SkillProgress {
  attempts: number;
  correct: number;
  errors: number;
  hints: number;
  lastReviewed: number;
  level: number;
  due: number;
  streak: number;
}
export interface LearningProgress {
  schemaVersion: 1;
  completedRuns?: number;
  lastCompletedAt?: number;
  lessonId: string;
  currentExerciseId: string | null;
  completed: string[];
  stats: Record<string, SkillProgress>;
  reviewIds: string[];
  sessions: number;
  seconds: number;
  hintCount: number;
  successful: number;
  lessonComplete: boolean;
  remedialCount: number;
  remedialDone: string[];
  settings: { slow: boolean; reduceMotion: boolean };
  updatedAt: number;
}

export interface ProgressBundle {
  workbook?: import('../workbook/types').WorkbookProgress[];
  reader?: import('../textbook').ReaderProgress[];
  schemaVersion: 2;
  selectedLessonId: string;
  lessons: LearningProgress[];
}
