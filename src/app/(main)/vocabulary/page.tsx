'use client'

import { useEffect, useState } from 'react'
import { VocabWord } from '@/types'

type Mode = 'list' | 'add'

export default function VocabularyPage() {
  const [words, setWords] = useState<VocabWord[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('list')
  const [search, setSearch] = useState('')

  // Add form state
  const [word, setWord] = useState('')
  const [translation, setTranslation] = useState('')
  const [exampleSentence, setExampleSentence] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const data = await fetch('/api/vocabulary').then(r => r.json())
    setWords(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addWord(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/vocabulary', {
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
    setWord(''); setTranslation(''); setExampleSentence(''); setNotes(''); setTags('')
    setSaving(false)
    setMode('list')
    load()
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
    // Clear all current weekly focus, then randomly pick 5
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

  const filtered = words.filter(w =>
    w.word.toLowerCase().includes(search.toLowerCase()) ||
    w.translation.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="text-gray-400 text-center py-16">Loading…</div>

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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Spanish *</label>
              <input required value={word} onChange={e => setWord(e.target.value)} placeholder="caminar" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">English *</label>
              <input required value={translation} onChange={e => setTranslation(e.target.value)} placeholder="to walk" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>
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

      {filtered.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No words yet. Add one above!</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(w => (
            <div key={w.id} className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 flex items-start gap-3">
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
          ))}
        </div>
      )}
    </div>
  )
}
