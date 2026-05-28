import { SRSCard, SRSRating } from '@/types'

// SM-2 spaced repetition algorithm
export function calculateNextReview(card: SRSCard, rating: SRSRating): {
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review_at: string
} {
  let { ease_factor, interval_days, repetitions } = card

  if (rating < 3) {
    // Failed recall — reset
    repetitions = 0
    interval_days = 1
  } else {
    if (repetitions === 0) interval_days = 1
    else if (repetitions === 1) interval_days = 6
    else interval_days = Math.round(interval_days * ease_factor)

    repetitions += 1
    ease_factor = Math.max(1.3, ease_factor + 0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
  }

  const next = new Date()
  next.setDate(next.getDate() + interval_days)

  return {
    ease_factor,
    interval_days,
    repetitions,
    next_review_at: next.toISOString(),
  }
}

export function isDueForReview(card: SRSCard): boolean {
  return new Date(card.next_review_at) <= new Date()
}
