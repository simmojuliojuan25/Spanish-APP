'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { VocabWord } from '@/types'
import { getWeekKey, getCurrentWeekKey, formatWeekLabel, getSelectedWeeks, saveSelectedWeeks } from '@/lib/weeks'

type Mode = 'list' | 'add'

export default function VocabularyPage() {
  const [words, setWords] = useState<VocabWord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('list')
  const [search, setSearch] = useState('')

  // Add form state
  const [word, setWord] = useState('')
  const [translation, setTranslation] = useState('')
  const [swapped, setSwapped] = useState(false)
  const [exampleSentence, setExampleSentence] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [correctedSuggestion, setCorrectedSuggestion] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [translating, setTranslating] = useState(false)
  const debounceSpRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debounceEnRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentWeekKey = useMemo(() => getCurrentWeekKey(), [])
  const [selectedWeeks, setSelectedWeeks] = useState<string[]>([currentWeekKey])
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set([currentWeekKey]))

  useEffect(() => { setSelectedWeeks(getSelectedWeeks()) }, [])

  async function load() {
    try {
      const res = await fetch('/api/vocabulary')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setWords(Array.isArray(data) ? data : [])
      setLoadError(null)
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleSpanishChange(value: string) {
    setWord(value)
    setCorrectedSuggestion('')
    if (debounceSpRef.current) clearTimeout(debounceSpRef.current)
    if (value.trim().length < 2) { setTranslation(''); return }
    debounceSpRef.current = setTimeout(async () => {
      setTranslating(true)
      try {
        const res = await fetch('/api/verify-word', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: value.trim() }),
        })
        const data = await res.json()
        if (res.ok) {
          if (!data.valid && data.corrected) setCorrectedSuggestion(data.corrected)
          if (data.translation) {
            setTranslation(data.translation)
            setExampleSentence(data.example_sentence ?? '')
            setNotes(data.notes ?? '')
            setTags(Array.isArray(data.tags) ? data.tags.join(', ') : '')
          }
        }
      } catch { /* let user fill manually */ } finally { setTranslating(false) }
    }, 800)
  }

  function handleEnglishChange(value: string) {
    setTranslation(value)
    if (debounceEnRef.current) clearTimeout(debounceEnRef.current)
    if (value.trim().length < 2) { setWord(''); return }
    debounceEnRef.current = setTimeout(async () => {
      setTranslating(true)
      try {
        const res = await fetch('/api/translate-word', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: value.trim() }),
        })
        const data = await res.json()
        if (res.ok && data.translation) {
          setWord(data.translation)
          setExampleSentence(data.example_sentence ?? '')
          setNotes(data.notes ?? '')
          setTags(Array.isArray(data.tags) ? data.tags.join(', ') : '')
        }
      } catch { /* let user fill manually */ } finally { setTranslating(false) }
    }, 800)
  }

  async function addWord(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: word.trim(),
          translation: translation.trim(),
          example_sentence: exampleSentence.trim() || null,
          notes: notes.trim() || null,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setWord(''); setTranslation(''); setExampleSentence(''); setNotes(''); setTags('')
      setMode('list')
      load()
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function deleteWord(id: string) {
    await fetch('/api/vocabulary', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setWords(w => w.filter(x => x.id !== id))
  }

  async function toggleWeekly(w: VocabWord) {
    const updated = await fetch('/api/vocabulary', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: w.id, is_weekly_focus: !w.is_weekly_focus }),
    }).then(r => r.json())
    setWords(ws => ws.map(x => x.id === w.id ? updated : x))
  }

  async function randomWeekly() {
    const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, 5)
    const shuffledIds = new Set(shuffled.map(w => w.id))
    await Promise.all(words.map(w =>
      fetch('/api/vocabulary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: w.id, is_weekly_focus: shuffledIds.has(w.id) }),
      })
    ))
    load()
  }

  function toggleExpanded(weekKey: string) {
    setExpandedWeeks(prev => {
      const next = new Set(prev)
      if (next.has(weekKey)) next.delete(weekKey)
      else next.add(weekKey)
      return next
    })
  }

  function toggleWeekSelected(weekKey: string) {
    if (weekKey === currentWeekKey) return
    setSelectedWeeks(prev => {
      const next = prev.includes(weekKey)
        ? prev.filter(w => w !== weekKey)
        : [...prev, weekKey]
      saveSelectedWeeks(next)
      return next
    })
  }

  const wordsByWeek = useMemo(() => {
    const map = new Map<string, VocabWord[]>()
    for (const w of words) {
      const key = getWeekKey(w.created_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(w)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [words])

  const filtered = words.filter(w =>
    w.word.toLowerCase().includes(search.toLowerCase()) ||
    w.translation.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="text-gray-400 text-center py-16">Loading…</div>
  if (loadError) return <div className="text-red-500 text-center py-16">Failed to load vocabulary: {loadError}</div>

  function WordItem({ w }: { w: VocabWord }) {
    return (
      <div className="px-4 py-3 flex items-start gap-3">
        <button
          onClick={() => toggleWeekly(w)}
          title={w.is_weekly_focus ? 'Remove from this week' : 'Add to this week'}
          className={`mt-0.5 text-lg leading-none transition-transform hover:scale-110 ${w.is_weekly_focus ? 'opacity-100' : 'opacity-30'}`}
        >
          ⭐
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-semibold text-gray-800">{w.word}</span>
            <span className="text-gray-500 text-sm">{w.translation}</span>
          </div>
          {w.example_sentence && (
            <p className="text-xs text-gray-400 italic mt-0.5">{w.example_sentence}</p>
          )}
          {w.tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {w.tags.map(t => (
                <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => deleteWord(w.id)}
          className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
          title="Delete"
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Vocabulary</h1>
        <div className="flex gap-2">
          <button
            onClick={randomWeekly}
            title="Pick 5 random weekly focus words"
            className="text-sm bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            🎲 Random week
          </button>
          <button
            onClick={() => setMode(mode === 'add' ? 'list' : 'add')}
            className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            {mode === 'add' ? '✕ Cancel' : '+ Add word'}
          </button>
        </div>
      </div>

      {mode === 'add' && (
        <form onSubmit={addWord} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
          <h2 className="font-semibold text-gray-700">New word or phrase</h2>
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <label className="text-xs text-gray-500 mb-1 block">{swapped ? 'English' : 'Spanish'} *</label>
              <input
                required
                value={swapped ? translation : word}
                onChange={e => swapped ? handleEnglishChange(e.target.value) : handleSpanishChange(e.target.value)}
                placeholder={swapped ? 'to walk' : 'caminar'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              {translating && (
                <span className="absolute right-2.5 top-[calc(50%+8px)] -translate-y-1/2 text-xs text-gray-400 pointer-events-none">translating…</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSwapped(s => !s)}
              title="Swap English / Spanish"
              className="mb-0.5 px-2 py-2 text-gray-400 hover:text-emerald-600 transition-colors text-base leading-none"
            >
              ⇄
            </button>
            <div className="flex-1 relative">
              <label className="text-xs text-gray-500 mb-1 block">{swapped ? 'Spanish' : 'English'} *</label>
              <input
                required
                value={swapped ? word : translation}
                onChange={e => swapped ? handleSpanishChange(e.target.value) : handleEnglishChange(e.target.value)}
                placeholder={swapped ? 'caminar' : 'to walk'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              {translating && (
                <span className="absolute right-2.5 top-[calc(50%+8px)] -translate-y-1/2 text-xs text-gray-400 pointer-events-none">translating…</span>
              )}
            </div>
          </div>
          {correctedSuggestion && (
            <p className="text-sm text-amber-600">
              Did you mean{' '}
              <button
                type="button"
                onClick={() => { handleSpanishChange(correctedSuggestion); setCorrectedSuggestion('') }}
                className="underline font-semibold hover:text-amber-800"
              >
                {correctedSuggestion}
              </button>
              ?
            </p>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Example sentence</label>
            <input value={exampleSentence} onChange={e => setExampleSentence(e.target.value)} placeholder="Me gusta caminar por el parque." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="irregular verb" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tags (comma-separated)</label>
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="verbs, travel" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>
          {saveError && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
          )}
          <button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-semibold py-2 rounded-lg text-sm transition-colors">
            {saving ? 'Saving…' : 'Save word'}
          </button>
        </form>
      )}

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search words…"
        className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
      />

      {search ? (
        filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No words match your search.</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col divide-y divide-gray-50">
            {filtered.map(w => <WordItem key={w.id} w={w} />)}
          </div>
        )
      ) : (
        wordsByWeek.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No words yet. Add one above!</p>
        ) : (
          <div className="flex flex-col gap-3">
            {wordsByWeek.map(([weekKey, weekWords]) => {
              const isCurrentWeek = weekKey === currentWeekKey
              const isExpanded = expandedWeeks.has(weekKey)
              const isSelected = selectedWeeks.includes(weekKey)
              return (
                <div key={weekKey} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex items-center px-4 py-3 gap-3">
                    <button
                      onClick={() => toggleExpanded(weekKey)}
                      className="text-gray-400 hover:text-gray-600 transition-colors text-xs w-4 text-center"
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-gray-700">{formatWeekLabel(weekKey)}</span>
                      {isCurrentWeek && (
                        <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Current</span>
                      )}
                      <span className="ml-2 text-xs text-gray-400">
                        {weekWords.length} word{weekWords.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleWeekSelected(weekKey)}
                      disabled={isCurrentWeek}
                      title={isCurrentWeek ? 'Current week is always included' : isSelected ? 'Remove from practice' : 'Include in quiz, stories & flashcards'}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                        isSelected
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      } ${isCurrentWeek ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                    >
                      {isSelected ? '✓ Included' : '+ Include'}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-gray-100 flex flex-col divide-y divide-gray-50">
                      {weekWords.map(w => <WordItem key={w.id} w={w} />)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
