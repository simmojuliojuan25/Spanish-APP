import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// Extracts the first balanced {...} object from text, ignoring any trailing
// prose the model may add after the JSON (which breaks a naive greedy regex
// whenever that trailing text itself contains a brace).
function extractJsonObject(text: string): string {
  const start = text.indexOf('{')
  if (start === -1) return text

  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return text.slice(start)
}

export async function POST(req: NextRequest) {
  const { word } = await req.json()
  if (!word || word.trim().length < 2) {
    return NextResponse.json({ error: 'Word too short' }, { status: 400 })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      system: [
        {
          type: 'text',
          text: 'You are a Spanish dictionary. Respond only with JSON, no explanation. Always use correct Spanish spelling including all diacritics (á, é, í, ó, ú, ñ, ü) in any Spanish text you produce.',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Is "${word.trim()}" a correctly spelled Spanish word or phrase? Return ONLY JSON: {"valid":true/false,"corrected":"corrected spelling if invalid, else omit","translation":"concise English translation","example_sentence":"a natural Spanish sentence using the word","notes":"brief grammatical note e.g. irregular verb, feminine noun","tags":["tag1","tag2"]}`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response' }, { status: 500 })
    }

    const result = JSON.parse(extractJsonObject(content.text))

    // The model sometimes reports valid:false while "correcting" the word to
    // itself (occasionally even noting the original was already correct).
    // Treat a no-op correction as confirmation the word is valid.
    if (result.valid === false && typeof result.corrected === 'string') {
      const normalize = (s: string) => s.trim().toLowerCase()
      if (normalize(result.corrected) === normalize(word)) {
        result.valid = true
        delete result.corrected
      }
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('verify-word error:', err)
    return NextResponse.json({ error: 'Translation unavailable' }, { status: 500 })
  }
}
