import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const TENSES: Record<string, string> = {
  presente: 'Presente (Present)',
  preterito: 'Pretérito (Preterite)',
  imperfecto: 'Imperfecto (Imperfect)',
  futuro: 'Futuro (Future)',
  condicional: 'Condicional (Conditional)',
  preterito_perfecto: 'Pretérito Perfecto (Present Perfect)',
}

export async function POST(req: NextRequest) {
  const { verb, tense } = await req.json()

  if (!verb || typeof verb !== 'string' || verb.trim().length < 2) {
    return NextResponse.json({ error: 'Verb required' }, { status: 400 })
  }
  if (!tense || !(tense in TENSES)) {
    return NextResponse.json({ error: 'Invalid tense' }, { status: 400 })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      system: [
        {
          type: 'text',
          text: 'You are a Spanish conjugation reference. Respond only with JSON, no explanation. Always use correct Spanish spelling including all diacritics (á, é, í, ó, ú, ñ, ü).',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Conjugate the Spanish verb "${verb.trim()}" in the ${TENSES[tense]} tense, indicative mood.
Return ONLY JSON in this exact format, with forms in this exact pronoun order:
{"forms":[{"pronoun":"yo","form":"..."},{"pronoun":"tú","form":"..."},{"pronoun":"él/ella/usted","form":"..."},{"pronoun":"nosotros/nosotras","form":"..."},{"pronoun":"vosotros/vosotras","form":"..."},{"pronoun":"ellos/ellas/ustedes","form":"..."}]}
If "${verb.trim()}" is not a valid Spanish verb infinitive, return {"error":"not a verb"} instead.`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response' }, { status: 500 })
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse conjugation response' }, { status: 500 })
    }

    const result = JSON.parse(jsonMatch[0])
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ verb: verb.trim(), tense, forms: result.forms })
  } catch (err) {
    console.error('conjugate error:', err)
    return NextResponse.json({ error: 'Conjugation unavailable' }, { status: 500 })
  }
}
