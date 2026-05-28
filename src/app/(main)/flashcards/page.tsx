'use client'

import { useEffect, useState } from 'react'
import FlashCard from '@/components/FlashCard'
import { SRSCard, SRSRating } from '@/types'

export default function FlashCardsPage() {
  const [cards, setCards] = useState<SRSCard[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [reviewed, setReviewed] = useState(0)

  async function load() {
    const data = await fetch('/api/srs').then(r => r.json())
    setCards(Array.isArray(data) ? data : [])
    setIndex(0)
    setDone(false)
    setReviewed(0)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleRate(rating: SRSRating) {
    const card = cards[index]
    await fetch('/api/srs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: card.id, rating }),
    })
    setReviewed(r => r + 1)
    if (index + 1 >= cards.length) {
      setDone(true)
    } else {
      setIndex(i => i + 1)
    }
  }

  if (loading) return <div className="text-gray-400 text-center py-16">Loading…</div>

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-6xl">🎉</div>
        <h2 className="text-xl font-bold text-gray-700">All caught up!</h2>
        <p className="text-gray-500 text-sm text-center">No cards due for review right now. Come back later or add more vocabulary.</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-6xl">✅</div>
        <h2 className="text-xl font-bold text-gray-700">Session complete!</h2>
        <p className="text-gray-500 text-sm">You reviewed {reviewed} card{reviewed !== 1 ? 's' : ''}.</p>
        <button
          onClick={load}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-full font-semibold text-sm transition-colors"
        >
          Check for more cards
        </button>
      </div>
    )
  }

  const current = cards[index]

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Flash Cards</h1>
        <span className="text-sm text-gray-400">{index + 1} / {cards.length}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="bg-emerald-500 h-1.5 rounded-full transition-all"
          style={{ width: `${(index / cards.length) * 100}%` }}
        />
      </div>

      <FlashCard card={current} onRate={handleRate} />

      <div className="text-center text-xs text-gray-400 mt-2">
        Tap card to reveal · Rate your recall to schedule next review
      </div>
    </div>
  )
}
