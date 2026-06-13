'use client'

import { useState } from 'react'
import { VocabWord, Story } from '@/types'

interface TranslationPopup {
  word: string
  translation: string | null
  loading: boolean
}

export default function StoriesPage() {
  const [story, setStory] = useState<Story | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [source, setSource] = useState<'weekly' | 'all'>('weekly')
  const [hoveredWord, setHoveredWord] = useState<string | null>(null)
  const [popup, setPopup] = useState<TranslationPopup | null>(null)

  async function generate() {
    setLoading(true)
    setError('')
    setStory(null)
    setPopup(null)

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

  async function handleWordDoubleClick(word: string, knownTranslation?: string) {
    const clean = word.replace(/[^a-záéíóúüñÁÉÍÓÚÜÑA-Za-z]/gi, '').trim()
    if (clean.length < 2) return

    if (knownTranslation) {
      setPopup({ word: clean, translation: knownTranslation, loading: false })
      return
    }

    setPopup({ word: clean, translation: null, loading: true })
    try {
      const res = await fetch('/api/translate-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: clean, direction: 'es-en' }),
      })
      const data = await res.json()
      setPopup({ word: clean, translation: data.translation ?? 'Translation unavailable', loading: false })
    } catch {
      setPopup({ word: clean, translation: 'Translation unavailable', loading: false })
    }
  }

  function renderToken(token: string, key: number, annotationTranslation?: string) {
    if (/^\s+$/.test(token)) return <span key={key}>{token}</span>

    if (annotationTranslation) {
      return (
        <span
          key={key}
          className="relative cursor-pointer"
          onMouseEnter={() => setHoveredWord(token)}
          onMouseLeave={() => setHoveredWord(null)}
          onTouchStart={() => setHoveredWord(prev => prev === token ? null : token)}
          onDoubleClick={() => handleWordDoubleClick(token, annotationTranslation)}
        >
          <span className="bg-amber-100 text-amber-900 rounded px-0.5 underline decoration-dotted decoration-amber-400">
            {token}
          </span>
          {hoveredWord === token && (
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
              {annotationTranslation}
            </span>
          )}
        </span>
      )
    }

    return (
      <span
        key={key}
        className="cursor-pointer rounded hover:bg-gray-100 transition-colors"
        onDoubleClick={() => handleWordDoubleClick(token)}
      >
        {token}
      </span>
    )
  }

  function renderAnnotatedText(text: string, annotations: Record<string, string>) {
    const sortedKeys = Object.keys(annotations).sort((a, b) => b.length - a.length)

    // Split text into vocab-word matches and surrounding text chunks
    const pattern = sortedKeys.length > 0
      ? new RegExp(`(${sortedKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
      : null

    const chunks = pattern ? text.split(pattern) : [text]
    let tokenIndex = 0

    return (
      <>
        {chunks.map((chunk) => {
          const annotationKey = sortedKeys.find(k => k.toLowerCase() === chunk.toLowerCase())
          if (annotationKey) {
            return renderToken(chunk, tokenIndex++, annotations[annotationKey])
          }

          // Split non-vocab chunk into individual word tokens preserving whitespace
          const subTokens = chunk.split(/(\s+)/)
          return subTokens.map(sub => renderToken(sub, tokenIndex++))
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
            <p className="text-xs text-gray-400 mb-3">Double-click any word to see its English translation</p>
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

      {/* Translation popup */}
      {popup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          onClick={() => setPopup(null)}
        >
          <div
            className="bg-white rounded-2xl p-5 shadow-2xl border border-gray-200 min-w-[180px] max-w-xs mx-4 text-center"
            onClick={e => e.stopPropagation()}
          >
            <p className="font-bold text-gray-800 text-lg mb-1">{popup.word}</p>
            {popup.loading ? (
              <p className="text-gray-400 text-sm animate-pulse">Translating…</p>
            ) : (
              <p className="text-gray-600 text-sm">{popup.translation}</p>
            )}
            <button
              className="mt-3 text-xs text-gray-400 hover:text-gray-600"
              onClick={() => setPopup(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
