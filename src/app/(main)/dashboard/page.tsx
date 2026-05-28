'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { VocabWord, SRSCard } from '@/types'

export default function DashboardPage() {
  const [vocab, setVocab] = useState<VocabWord[]>([])
  const [dueCards, setDueCards] = useState<SRSCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/vocabulary').then(r => r.json()),
      fetch('/api/srs').then(r => r.json()),
    ]).then(([v, s]) => {
      setVocab(Array.isArray(v) ? v : [])
      setDueCards(Array.isArray(s) ? s : [])
      setLoading(false)
    })
  }, [])

  const weeklyWords = vocab.filter(w => w.is_weekly_focus)

  if (loading) {
    return <div className="text-gray-400 text-center py-16">Loading…</div>
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">¡Hola! 👋</h1>
        <p className="text-gray-500 text-sm mt-1">Ready to practise your Spanish today?</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <div className="text-2xl font-bold text-emerald-600">{vocab.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total words</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <div className="text-2xl font-bold text-blue-600">{weeklyWords.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">This week</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <div className="text-2xl font-bold text-orange-500">{dueCards.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Due for review</div>
        </div>
      </div>

      {/* Weekly focus words */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">This week&apos;s words</h2>
          <Link href="/vocabulary" className="text-emerald-600 text-sm hover:underline">Manage →</Link>
        </div>
        {weeklyWords.length === 0 ? (
          <p className="text-gray-400 text-sm">No weekly focus words yet. <Link href="/vocabulary" className="text-emerald-600 hover:underline">Add some →</Link></p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {weeklyWords.map(w => (
              <span key={w.id} className="bg-emerald-50 text-emerald-700 text-sm px-3 py-1 rounded-full font-medium">
                {w.word} <span className="text-emerald-400">· {w.translation}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/flashcards" className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-4 shadow-sm flex flex-col gap-1 transition-colors">
          <span className="text-2xl">🃏</span>
          <span className="font-semibold">Flash Cards</span>
          <span className="text-blue-200 text-xs">{dueCards.length} due today</span>
        </Link>
        <Link href="/quiz" className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl p-4 shadow-sm flex flex-col gap-1 transition-colors">
          <span className="text-2xl">✏️</span>
          <span className="font-semibold">Quiz</span>
          <span className="text-violet-200 text-xs">Test your knowledge</span>
        </Link>
        <Link href="/stories" className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl p-4 shadow-sm flex flex-col gap-1 transition-colors">
          <span className="text-2xl">📖</span>
          <span className="font-semibold">Stories</span>
          <span className="text-amber-200 text-xs">AI-generated B1 stories</span>
        </Link>
        <Link href="/vocabulary" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl p-4 shadow-sm flex flex-col gap-1 transition-colors">
          <span className="text-2xl">📚</span>
          <span className="font-semibold">Vocabulary</span>
          <span className="text-emerald-200 text-xs">{vocab.length} words saved</span>
        </Link>
      </div>
    </div>
  )
}
