import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { word } = await req.json()
  if (!word || word.trim().length < 2) {
    return NextResponse.json({ error: 'Word too short' }, { status: 400 })
  }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 128,
    system: [
      {
        type: 'text',
        text: 'You are a Spanish dictionary. Respond only with JSON, no explanation.',
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Is "${word.trim()}" a correctly spelled Spanish word or phrase? Return ONLY JSON: {"valid":true/false,"corrected":"corrected spelling if invalid, else omit","translation":"concise English translation"}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Unexpected response' }, { status: 500 })
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    const result = JSON.parse(jsonMatch ? jsonMatch[0] : content.text)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 })
  }
}
