'use client'

import { useState } from 'react'
import { SRSCard, SRSRating } from '@/types'

interface Props {
  card: SRSCard
  onRate: (rating: SRSRating) => void
}

const ratings: { value: SRSRating; label: string; color: string }[] = [
  { value: 0, label: 'Again', color: 'bg-red-500 hover:bg-red-600' },
  { value: 1, label: 'Hard', color: 'bg-orange-500 hover:bg-orange-600' },
  { value: 3, label: 'Good', color: 'bg-blue-500 hover:bg-blue-600' },
  { value: 5, label: 'Easy', color: 'bg-emerald-500 hover:bg-emerald-600' },
]

export default function FlashCard({ card, onRate }: Props) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className="flex flex-col items-center gap-6">
      <button
        onClick={() => setFlipped(f => !f)}
        className="w-full max-w-md aspect-video bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer select-none transition-transform active:scale-95"
      >
        {!flipped ? (
          <>
            <span className="text-3xl font-bold text-gray-800">{card.vocab?.word}</span>
            <span className="text-sm text-gray-400">Tap to reveal</span>
          </>
        ) : (
          <>
            <span className="text-2xl font-semibold text-emerald-700">{card.vocab?.translation}</span>
            {card.vocab?.example_sentence && (
              <span className="text-sm text-gray-500 px-6 text-center italic">{card.vocab.example_sentence}</span>
            )}
            {card.vocab?.notes && (
              <span className="text-xs text-gray-400 px-6 text-center">{card.vocab.notes}</span>
            )}
          </>
        )}
      </button>

      {flipped && (
        <div className="flex gap-3 flex-wrap justify-center">
          {ratings.map(r => (
            <button
              key={r.value}
              onClick={() => { setFlipped(false); onRate(r.value) }}
              className={`${r.color} text-white font-semibold px-5 py-2 rounded-full text-sm transition-colors`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
