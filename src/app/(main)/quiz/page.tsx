'use client'

import { useState } from 'react'
import { VocabWord, QuizQuestion } from '@/types'

type Phase = 'setup' | 'loading' | 'questions' | 'results'

export default function QuizPage() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [source, setSource] = useState<'weekly' | 'all'>('weekly')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [error, setError] = useState('')

  async function startQuiz() {
    setPhase('loading')
    setError('')

    const vocab: VocabWord[] = await fetch('/api/vocabulary').then(r => r.json())
    const pool = source === 'weekly' ? vocab.filter(w => w.is_weekly_focus) : vocab

    if (pool.length < 4) {
      setError(source === 'weekly'
        ? 'You need at least 4 weekly focus words to generate a quiz. Add more or switch to All words.'
        : 'You need at least 4 words in your vocabulary to generate a quiz.')
      setPhase('setup')
      return
    }

    const words = pool.map(w => ({ word: w.word, translation: w.translation }))
    const res = await fetch('/api/generate-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words }),
    })

    if (!res.ok) {
      setError('Failed to generate quiz. Try again.')
      setPhase('setup')
      return
    }

    const qs: QuizQuestion[] = await res.json()
    setQuestions(qs)
    setAnswers(new Array(qs.length).fill(null))
    setCurrent(0)
    setSelected(null)
    setPhase('questions')
  }

  function handleSelect(idx: number) {
    if (selected !== null) return
    setSelected(idx)
    setAnswers(a => { const n = [...a]; n[current] = idx; return n })
  }

  function next() {
    if (current + 1 >= questions.length) {
      setPhase('results')
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
    }
  }

  function restart() {
    setPhase('setup')
    setQuestions([])
    setAnswers([])
    setCurrent(0)
    setSelected(null)
  }

  if (phase === 'setup') {
    return (
      <div className="flex flex-col gap-6 py-4">
        <h1 className="text-2xl font-bold text-gray-800">Quiz</h1>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
          <div>
            <p className="font-semibold text-gray-700 mb-2">Which words to test?</p>
            <div className="flex gap-3">
              {(['weekly', 'all'] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => setSource(opt)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    source === opt
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
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
            onClick={startQuiz}
            className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Generate quiz
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-4xl animate-spin">⚙️</div>
        <p className="text-gray-500">Generating your quiz…</p>
      </div>
    )
  }

  if (phase === 'results') {
    const score = answers.filter((a, i) => a === questions[i].correct_index).length
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="flex flex-col gap-6 py-4">
        <h1 className="text-2xl font-bold text-gray-800">Results</h1>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center flex flex-col gap-2">
          <div className="text-5xl">{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '📚'}</div>
          <div className="text-3xl font-bold text-gray-800">{score} / {questions.length}</div>
          <div className="text-gray-500">{pct}% correct</div>
        </div>
        <div className="flex flex-col gap-3">
          {questions.map((q, i) => {
            const correct = answers[i] === q.correct_index
            return (
              <div key={i} className={`bg-white rounded-xl p-4 shadow-sm border ${correct ? 'border-emerald-200' : 'border-red-200'}`}>
                <p className="text-sm font-medium text-gray-700 mb-2">{q.question}</p>
                {q.options.map((opt, j) => (
                  <div
                    key={j}
                    className={`text-sm px-3 py-1.5 rounded-lg mt-1 ${
                      j === q.correct_index ? 'bg-emerald-50 text-emerald-700 font-medium' :
                      j === answers[i] && !correct ? 'bg-red-50 text-red-600' : 'text-gray-500'
                    }`}
                  >
                    {j === q.correct_index ? '✓ ' : j === answers[i] && !correct ? '✗ ' : ''}{opt}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
        <button onClick={restart} className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-lg transition-colors">
          New quiz
        </button>
      </div>
    )
  }

  // Phase: questions
  const q = questions[current]
  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Quiz</h1>
        <span className="text-sm text-gray-400">{current + 1} / {questions.length}</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div className="bg-violet-500 h-1.5 rounded-full transition-all" style={{ width: `${(current / questions.length) * 100}%` }} />
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <p className="font-semibold text-gray-800 text-lg mb-4">{q.question}</p>
        <div className="flex flex-col gap-2">
          {q.options.map((opt, i) => {
            let cls = 'border border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-violet-50'
            if (selected !== null) {
              if (i === q.correct_index) cls = 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium'
              else if (i === selected) cls = 'border-red-400 bg-red-50 text-red-600'
              else cls = 'border-gray-100 text-gray-400'
            }
            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                className={`text-left px-4 py-3 rounded-lg text-sm transition-colors ${cls}`}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </div>

      {selected !== null && (
        <button onClick={next} className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-lg transition-colors">
          {current + 1 >= questions.length ? 'See results' : 'Next →'}
        </button>
      )}
    </div>
  )
}
