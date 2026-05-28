import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { words }: { words: { word: string; translation: string }[] } = await req.json()

  if (!words || words.length < 4) {
    return NextResponse.json({ error: 'Need at least 4 words to generate a quiz' }, { status: 400 })
  }

  const wordList = words.map(w => `${w.word}: ${w.translation}`).join('\n')

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Generate 5 multiple-choice questions to test a B1 Spanish learner on these vocabulary words:
${wordList}

Mix question types: translation (Spanish→English, English→Spanish), fill-in-the-blank with a short sentence, and word usage.

Return ONLY a JSON array in this exact format:
[
  {
    "question": "What does 'caminar' mean?",
    "options": ["to run", "to walk", "to jump", "to swim"],
    "correct_index": 1,
    "word_id": "caminar"
  }
]`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Unexpected response' }, { status: 500 })
  }

  const jsonMatch = content.text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Failed to parse quiz response' }, { status: 500 })
  }

  try {
    const questions = JSON.parse(jsonMatch[0])
    return NextResponse.json(questions)
  } catch {
    return NextResponse.json({ error: 'Invalid quiz JSON' }, { status: 500 })
  }
}
