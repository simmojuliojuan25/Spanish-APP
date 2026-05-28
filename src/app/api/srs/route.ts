import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { calculateNextReview } from '@/lib/srs'
import { SRSCard, SRSRating } from '@/types'

export async function GET() {
  const supabase = getSupabase()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('srs_cards')
    .select('*, vocab:vocabulary(*)')
    .lte('next_review_at', now)
    .order('next_review_at', { ascending: true })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const { card_id, rating }: { card_id: string; rating: SRSRating } = await req.json()

  const { data: card, error: fetchError } = await supabase
    .from('srs_cards')
    .select('*')
    .eq('id', card_id)
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  const updates = calculateNextReview(card as SRSCard, rating)
  const { data, error } = await supabase
    .from('srs_cards')
    .update({ ...updates, last_reviewed_at: new Date().toISOString() })
    .eq('id', card_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
