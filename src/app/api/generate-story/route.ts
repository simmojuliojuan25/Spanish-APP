import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { words }: { words: { word: string; translation: string }[] } = await req.json()

  if (!words || words.length === 0) {
    return NextResponse.json({ error: 'No words provided' }, { status: 400 })
  }

  const wordList = words.map(w => `${w.word} (${w.translation})`).join(', ')

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Write a short story in Spanish for a B1 learner (150-200 words).
Naturally incorporate these vocabulary words: ${wordList}.
After the story, provide a JSON object with annotations for every vocabulary word used, mapping the Spanish word to its English translation.

Format your response exactly like this:
STORY:
[the story text]

ANNOTATIONS:
{"word1": "translation1", "word2": "translation2"}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Unexpected response' }, { status: 500 })
  }

  const text = content.text
  const storyMatch = text.match(/STORY:\n([\s\S]*?)\n\nANNOTATIONS:/)
  const annotationsMatch = text.match(/ANNOTATIONS:\n(\{[\s\S]*\})/)

  if (!storyMatch || !annotationsMatch) {
    return NextResponse.json({ error: 'Failed to parse story response' }, { status: 500 })
  }

  let annotations: Record<string, string> = {}
  try {
    annotations = JSON.parse(annotationsMatch[1])
  } catch {
    // annotations are optional, continue without them
  }

  return NextResponse.json({
    text: storyMatch[1].trim(),
    vocabulary_used: words.map(w => w.word),
    annotations,
  })
}
