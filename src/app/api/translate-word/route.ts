import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { word, direction = 'en-es' } = await req.json()
  if (!word || word.trim().length < 2) {
    return NextResponse.json({ error: 'Word too short' }, { status: 400 })
  }

  const prompt = direction === 'es-en'
    ? `Translate this Spanish word or phrase to English: "${word.trim()}". Return ONLY JSON: {"translation":"concise English translation","example_sentence":"a natural Spanish sentence using the word","notes":"brief grammatical note e.g. irregular verb, feminine noun","tags":["tag1","tag2"]}`
    : `Translate this English word or phrase to Spanish: "${word.trim()}". Return ONLY JSON: {"translation":"concise Spanish translation","example_sentence":"a natural Spanish sentence using the translated word","notes":"brief grammatical note e.g. irregular verb, feminine noun","tags":["tag1","tag2"]}`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      system: [
        {
          type: 'text',
          text: 'You are a Spanish translator. Respond only with JSON, no explanation. Always use correct Spanish spelling including all diacritics (á, é, í, ó, ú, ñ, ü) in any Spanish text you produce.',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response' }, { status: 500 })
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    const result = JSON.parse(jsonMatch ? jsonMatch[0] : content.text)
    return NextResponse.json(result)
  } catch (err) {
    console.error('translate-word error:', err)
    return NextResponse.json({ error: 'Translation unavailable' }, { status: 500 })
  }
}
