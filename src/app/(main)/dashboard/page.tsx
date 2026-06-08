'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { VocabWord, SRSCard } from '@/types'

const VISIBLE_COUNT = 15

export default function DashboardPage() {
  const [vocab, setVocab] = useState<VocabWord[]>([])
  const [dueCards, setDueCards] = useState<SRSCard[]>([])
  const [loading, setLoading] = useState(true)
  const [wordsExpanded, setWordsExpanded] = useState(false)

  const [spanishInput, setSpanishInput] = useState('')
  const [translationInput, setTranslationInput] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [adding, setAdding] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadData() {
    const [v, s] = await Promise.all([
      fetch('/api/vocabulary').then(r => r.json()),
      fetch('/api/srs').then(r => r.json()),
    ])
    setVocab(Array.isArray(v) ? v : [])
    setDueCards(Array.isArray(s) ? s : [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function handleSpanishChange(value: string) {
    setSpanishInput(value)
    setVerifyError('')
    setSuggestion('')
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 2) {
      setTranslationInput('')
      return
    }

    debounceRef.current = setTimeout(async () => {
      setVerifying(true)
      try {
        const res = await fetch('/api/verify-word', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: value.trim() }),
        })
        const data = await res.json()
        if (!res.ok) {
          // server error — let the user fill in the translation manually
        } else if (data.valid === false) {
          setSuggestion(data.corrected ?? '')
          setVerifyError(data.corrected ? 'Did you mean' : 'Not a recognised Spanish word')
        } else if (data.translation) {
          setTranslationInput(data.translation)
          setVerifyError('')
        }
      } catch {
        // network error — let the user fill in the translation manually
      } finally {
        setVerifying(false)
      }
    }, 800)
  }

  async function handleAdd() {
    if (!spanishInput.trim() || !translationInput.trim() || adding) return
    setAdding(true)
    try {
      const res = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: spanishInput.trim(),
          translation: translationInput.trim(),
          example_sentence: null,
          notes: null,
          tags: [],
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setVerifyError(data.error ?? 'Failed to save word')
        return
      }
      setVocab(ws => [data, ...ws])
      setSpanishInput('')
      setTranslationInput('')
      setVerifyError('')
      setSuggestion('')
    } finally {
      setAdding(false)
    }
  }

  async function togglePractice(w: VocabWord) {
    const updated = await fetch('/api/vocabulary', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: w.id, is_weekly_focus: !w.is_weekly_focus }),
    }).then(r => r.json())
    setVocab(ws => ws.map(x => x.id === w.id ? updated : x))
  }

  const visibleWords = wordsExpanded ? vocab : vocab.slice(0, VISIBLE_COUNT)
  const hiddenCount = vocab.length - VISIBLE_COUNT

  if (loading) return <div className="text-gray-400 text-center py-16">Loading…</div>

  const selectedCount = vocab.filter(w => w.is_weekly_focus).length

  return (
    <div className="flex flex-col gap-6 py-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">¡Hola! 👋</h1>
        <p className="text-gray-500 text-sm mt-1">Ready to practise your Spanish today?</p>
      </div>

      {/* Quick add */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              value={spanishInput}
              onChange={e => handleSpanishChange(e.target.value)}
              placeholder="Spanish word…"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                verifyError ? 'border-red-300 focus:ring-red-300' : 'border-gray-200'
              }`}
            />
            {verifying && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                checking…
              </span>
            )}
          </div>
          <input
            value={translationInput}
            onChange={e => setTranslationInput(e.target.value)}
            placeholder="English translation"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !spanishInput.trim() || !translationInput.trim()}
            className="w-10 h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xl flex items-center justify-center flex-shrink-0 transition-colors"
          >
            {adding ? '…' : '+'}
          </button>
        </div>
        {verifyError && (
          <div className="mt-1.5 pl-0.5 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-red-500">
              {suggestion ? `${verifyError}` : verifyError}
            </span>
            {suggestion && (
              <button
                type="button"
                onClick={() => handleSpanishChange(suggestion)}
                className="text-xs px-2 py-0.5 rounded-full bg-red-50 border border-red-300 text-red-600 hover:bg-red-100 active:bg-red-200 cursor-pointer font-medium"
              >
                {suggestion}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <div className="text-2xl font-bold text-emerald-600">{vocab.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total words</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <div className="text-2xl font-bold text-blue-600">{selectedCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Selected</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <div className="text-2xl font-bold text-orange-500">{dueCards.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Due for review</div>
        </div>
      </div>

      {/* Words list */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">
            Words <span className="text-gray-400 font-normal text-sm">({vocab.length})</span>
          </h2>
          <Link href="/vocabulary" className="text-emerald-600 text-sm hover:underline">Manage →</Link>
        </div>

        {vocab.length === 0 ? (
          <p className="text-gray-400 text-sm">No words yet — add one above!</p>
        ) : (
          <>
            <div className="flex flex-col">
              {visibleWords.map(w => (
                <div key={w.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <button
                    onClick={() => togglePractice(w)}
                    title={w.is_weekly_focus ? 'Remove from practice' : 'Select for practice'}
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      w.is_weekly_focus
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-gray-300 hover:border-emerald-400'
                    }`}
                  >
                    {w.is_weekly_focus && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className="font-medium text-gray-800 text-sm">{w.word}</span>
                  <span className="text-gray-400 text-sm flex-1 truncate">{w.translation}</span>
                </div>
              ))}
            </div>

            {hiddenCount > 0 && !wordsExpanded && (
              <button
                onClick={() => setWordsExpanded(true)}
                className="mt-3 w-full text-center text-sm text-gray-400 hover:text-emerald-600 transition-colors py-1"
              >
                Show {hiddenCount} more…
              </button>
            )}
            {wordsExpanded && vocab.length > VISIBLE_COUNT && (
              <button
                onClick={() => setWordsExpanded(false)}
                className="mt-3 w-full text-center text-sm text-gray-400 hover:text-emerald-600 transition-colors py-1"
              >
                Show less
              </button>
            )}
          </>
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
