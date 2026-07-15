export interface VocabWord {
  id: string
  word: string
  translation: string
  example_sentence: string | null
  notes: string | null
  tags: string[]
  is_weekly_focus: boolean
  created_at: string
}

export interface SRSCard {
  id: string
  vocabulary_id: string
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review_at: string
  last_reviewed_at: string | null
  created_at: string
  vocab?: VocabWord
}

export type SRSRating = 0 | 1 | 3 | 5

export interface QuizQuestion {
  question: string
  options: string[]
  correct_index: number
  word_id: string
}

export interface Story {
  text: string
  vocabulary_used: string[]
  annotations: Record<string, string>
}

export interface ConjugationForm {
  pronoun: string
  form: string
}

export interface ConjugationTable {
  verb: string
  tense: string
  forms: ConjugationForm[]
}

export interface TenseQuizQuestion {
  sentence: string
  options: string[]
  correct_index: number
  tense: string
}
