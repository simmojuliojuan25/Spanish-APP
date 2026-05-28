'use client'

import { useState } from 'react'
import { VocabWord, Story } from '@/types'

export default function StoriesPage() {
  const [story, setStory] = useState<Story | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [source, setSource] = useState<'weekly' | 'all'>('weekly')
  const [hoveredWord, setHoveredWord] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError('')
    setStory(null)

    const vocab: VocabWord[] = await fetch('/api/vocabulary').then(r => r.json())
    const pool = source === 'weekly' ? vocab.filter(w => w.is_weekly_focus) : vocab

    if (pool.length === 0) {
      setError(source === 'weekly'
        ? 'No weekly focus words set. Add some via the Vocabulary page.'
        : 'No vocabulary yet. Add words first.')
      setLoading(false)
      return
    }

    const words = pool.map(w => ({ word: w.word, translation: w.translation }))
    const res = await fetch('/api/generate-story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words }),
    })

    if (!res.ok) {
      setError('Failed to generate story. Try again.')
      setLoading(false)
      return
    }

    const data: Story = await res.json()
    setStory(data)
    setLoading(false)
  }

  function renderAnnotatedText(text: string, annotations: Record<string, string>) {
    const sortedKeys = Object.keys(annotations).sort((a, b) => b.length - a.length)
    if (sortedKeys.length === 0) return <span>{text}</span>

    const pattern = new RegExp(`\\b(${sortedKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi')
    const parts = text.split(pattern)

    return (
      <>
        {parts.map((part, i) => {
          const key = sortedKeys.find(k => k.toLowerCase() === part.toLowerCase())
          if (key) {
            return (
              <span
                key={i}
                className="relative cursor-pointer"
                onMouseEnter={() => setHoveredWord(key)}
                onMouseLeave={() => setHoveredWord(null)}
                onTouchStart={() => setHoveredWord(prev => prev === key ? null : key)}
              >
                <span className="bg-amber-100 text-amber-900 rounded px-0.5 underline decoration-dotted decoration-amber-400">
                  {part}
                </span>
                {hoveredWord === key && (
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                    {annotations[key]}
                  </span>
                )}
              </span>
            )
          }
          return <span key={i}>{part}</span>
        })}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      <h1 className="text-2xl font-bold text-gray-800">Stories</h1>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
        <div>
          <p className="font-semibold text-gray-700 mb-2">Include words from:</p>
          <div className="flex gap-3">
            {(['weekly', 'all'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setSource(opt)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  source === opt
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {opt === 'weekly' ? '⭐ This week\'s words' : '📚 All vocabulary'}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={generate}
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? 'Generating story…' : '✨ Generate story'}
        </button>
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2 animate-pulse">📖</div>
          <p>Writing your story…</p>
        </div>
      )}

      {story && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-gray-800 leading-relaxed text-base whitespace-pre-line">
              {renderAnnotatedText(story.text, story.annotations)}
            </p>
          </div>

          {Object.keys(story.annotations).length > 0 && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <h3 className="font-semibold text-amber-800 text-sm mb-2">Vocabulary in this story</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(story.annotations).map(([word, trans]) => (
                  <div key={word} className="text-sm">
                    <span className="font-medium text-amber-900">{word}</span>
                    <span className="text-amber-600"> — {trans}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={generate}
            className="text-amber-600 hover:text-amber-700 text-sm font-medium text-center py-2"
          >
            ↺ Generate another story
          </button>
        </div>
      )}
    </div>
  )
}
