'use client'

import { useEffect, useMemo, useState } from 'react'
import { VocabWord, ConjugationTable, TenseQuizQuestion } from '@/types'
import { getWeekKey, getSelectedWeeks } from '@/lib/weeks'

const TENSES: { key: string; label: string }[] = [
  { key: 'presente', label: 'Presente' },
  { key: 'preterito', label: 'Pretérito' },
  { key: 'imperfecto', label: 'Imperfecto' },
  { key: 'futuro', label: 'Futuro' },
  { key: 'condicional', label: 'Condicional' },
  { key: 'preterito_perfecto', label: 'Pretérito Perfecto' },
]

function isLikelyVerb(w: VocabWord): boolean {
  const word = w.word.trim()
  if (/\s/.test(word)) return false
  const text = `${w.notes ?? ''} ${w.tags.join(' ')}`.toLowerCase()
  if (text.includes('verb')) return true
  return /(ar|er|ir)$/i.test(word)
}

export default function TensesPage() {
  const [vocab, setVocab] = useState<VocabWord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWeeks, setSelectedWeeks] = useState<string[]>([])
  const [selectedWord, setSelectedWord] = useState('')
  const [selectedTense, setSelectedTense] = useState('')
  const [table, setTable] = useState<ConjugationTable | null>(null)
  const [tableLoading, setTableLoading] = useState(false)
  const [error, setError] = useState('')

  const [quizQuestion, setQuizQuestion] = useState<TenseQuizQuestion | null>(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizError, setQuizError] = useState('')
  const [placedIndex, setPlacedIndex] = useState<number | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    setSelectedWeeks(getSelectedWeeks())
    fetch('/api/vocabulary').then(r => r.json()).then(data => {
      setVocab(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

  const verbOptions = useMemo(() => {
    return vocab
      .filter(w => selectedWeeks.includes(getWeekKey(w.created_at)))
      .filter(isLikelyVerb)
      .sort((a, b) => a.word.localeCompare(b.word))
  }, [vocab, selectedWeeks])

  useEffect(() => {
    if (!selectedWord || !selectedTense) { setTable(null); return }

    let cancelled = false
    setTableLoading(true)
    setError('')
    setTable(null)

    fetch('/api/conjugate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verb: selectedWord, tense: selectedTense }),
    })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to conjugate')
        if (!cancelled) setTable(data)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to conjugate')
      })
      .finally(() => {
        if (!cancelled) setTableLoading(false)
      })

    return () => { cancelled = true }
  }, [selectedWord, selectedTense])

  useEffect(() => {
    setQuizQuestion(null)
    setPlacedIndex(null)
    setQuizError('')
  }, [selectedWord])

  async function loadQuiz() {
    if (!selectedWord) return
    setQuizLoading(true)
    setQuizError('')
    setQuizQuestion(null)
    setPlacedIndex(null)

    const translation = verbOptions.find(w => w.word === selectedWord)?.translation

    try {
      const res = await fetch('/api/generate-tense-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verb: selectedWord, translation }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate quiz')
      setQuizQuestion(data)
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : 'Failed to generate quiz')
    } finally {
      setQuizLoading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (dragIndex !== null) setPlacedIndex(dragIndex)
    setDragIndex(null)
  }

  if (loading) return <div className="text-gray-400 text-center py-16">Loading…</div>

  return (
    <div className="flex flex-col gap-6 py-4">
      <h1 className="text-2xl font-bold text-gray-800">Tenses</h1>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Verb</label>
          {verbOptions.length === 0 ? (
            <p className="text-sm text-gray-400">No verbs found in your selected weeks. Add some verb vocabulary first.</p>
          ) : (
            <select
              value={selectedWord}
              onChange={e => setSelectedWord(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
            >
              <option value="">Select a verb…</option>
              {verbOptions.map(w => (
                <option key={w.id} value={w.word}>{w.word} — {w.translation}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Tense</p>
          <div className="grid grid-cols-2 gap-2">
            {TENSES.map(t => (
              <button
                key={t.key}
                onClick={() => setSelectedTense(prev => prev === t.key ? '' : t.key)}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                  selectedTense === t.key
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tableLoading && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2 animate-pulse">🔤</div>
          <p>Conjugating…</p>
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {table && !tableLoading && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">
            {table.verb}{' '}
            <span className="text-gray-400 font-normal">
              — {TENSES.find(t => t.key === table.tense)?.label}
            </span>
          </h2>
          <div className="flex flex-col divide-y divide-gray-50">
            {table.forms.map(f => (
              <div key={f.pronoun} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-500">{f.pronoun}</span>
                <span className="font-medium text-gray-800">{f.form}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedWord && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Quiz me on &ldquo;{selectedWord}&rdquo;</h2>
            {quizQuestion && !quizLoading && (
              <button
                onClick={loadQuiz}
                className="text-rose-600 hover:text-rose-700 text-sm font-medium"
              >
                ↺ New question
              </button>
            )}
          </div>

          {!quizQuestion && !quizLoading && (
            <button
              onClick={loadQuiz}
              className="bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              ✨ Start quiz
            </button>
          )}

          {quizLoading && (
            <div className="text-center py-6 text-gray-400">
              <div className="text-3xl mb-2 animate-pulse">🔤</div>
              <p>Writing a question…</p>
            </div>
          )}

          {quizError && <p className="text-red-500 text-sm">{quizError}</p>}

          {quizQuestion && !quizLoading && (() => {
            const parts = quizQuestion.sentence.split('_____')
            const before = parts[0] ?? ''
            const after = parts.slice(1).join('_____')
            const isCorrect = placedIndex === quizQuestion.correct_index

            return (
              <>
                <p className="text-xs text-gray-400">
                  Drag the correct tense into the gap (or tap an option)
                </p>
                <p className="text-gray-800 leading-relaxed text-base">
                  {before}
                  <span
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => setPlacedIndex(null)}
                    className={`inline-flex items-center justify-center min-w-[100px] mx-1 px-2 py-1 rounded-lg border-2 border-dashed text-sm font-semibold cursor-pointer align-middle transition-colors ${
                      dragOver ? 'border-rose-400 bg-rose-50' : ''
                    } ${
                      placedIndex === null
                        ? 'border-gray-300 text-gray-300'
                        : isCorrect
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-red-400 bg-red-50 text-red-700'
                    }`}
                  >
                    {placedIndex === null ? '?????' : quizQuestion.options[placedIndex]}
                  </span>
                  {after}
                </p>

                {placedIndex !== null && (
                  <p className={`text-sm font-medium ${isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
                    {isCorrect
                      ? '✓ Correct!'
                      : `✗ Not quite — the correct answer was "${quizQuestion.options[quizQuestion.correct_index]}".`}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {quizQuestion.options.map((opt, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={() => setDragIndex(idx)}
                      onClick={() => setPlacedIndex(idx)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium select-none transition-colors cursor-grab active:cursor-grabbing ${
                        placedIndex === idx
                          ? 'opacity-40 border-gray-200 text-gray-400'
                          : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      {opt}
                    </div>
                  ))}
                </div>

                <button
                  onClick={loadQuiz}
                  className="text-rose-600 hover:text-rose-700 text-sm font-medium text-center py-2"
                >
                  ↺ Try another sentence
                </button>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
