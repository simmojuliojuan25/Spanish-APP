import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { verb, translation } = await req.json()

  if (!verb || typeof verb !== 'string' || verb.trim().length < 2) {
    return NextResponse.json({ error: 'Verb required' }, { status: 400 })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Write one Spanish sentence for a B1 learner that uses the verb "${verb.trim()}"${translation ? ` (${translation})` : ''}, conjugated correctly, with a clear time-context clue (e.g. "ayer", "mañana", "siempre", "ahora mismo", "el año pasado", "todos los días", "si tuviera la oportunidad") that makes exactly one of these six tenses the only grammatically correct choice: presente, pretérito, imperfecto, futuro, condicional, pretérito perfecto.

Replace the conjugated verb in the sentence with the literal token _____ (five underscores).

Then provide 6 multiple-choice options covering ALL SIX tenses: the correct conjugated form, plus 5 distractors that conjugate the SAME verb in the SAME grammatical person but in each of the other five tenses, so only the sentence's context (not the person) distinguishes the right answer. Shuffle the 6 options into random order.

Return ONLY JSON in this exact format:
{"sentence":"...", "options":["...","...","...","...","...","..."], "correct_index":0, "tense":"presente|preterito|imperfecto|futuro|condicional|preterito_perfecto"}`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response' }, { status: 500 })
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse quiz response' }, { status: 500 })
    }

    const result = JSON.parse(jsonMatch[0])
    if (
      typeof result.sentence !== 'string' ||
      !Array.isArray(result.options) ||
      result.options.length !== 6 ||
      typeof result.correct_index !== 'number'
    ) {
      return NextResponse.json({ error: 'Invalid quiz response' }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('generate-tense-quiz error:', err)
    return NextResponse.json({ error: 'Quiz unavailable' }, { status: 500 })
  }
}
