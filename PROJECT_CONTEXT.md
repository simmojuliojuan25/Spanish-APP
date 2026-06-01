# Spanish Practice — Project Context

## What this app does

A personal Spanish vocabulary learning tool built for one user (PIN-gated). It lets you:

- **Add words** from the dashboard with live AI spell-check and auto-translation
- **Tag words as "weekly focus"** to create a curated practice set for the week
- **Review flashcards** using the SM-2 spaced repetition algorithm (Again / Hard / Good / Easy)
- **Take AI-generated quizzes** (5 MCQ questions, Claude picks from your vocab)
- **Read AI-generated stories** written at B1 level using your vocabulary, with hover-to-translate annotations

The app is single-user by design. Auth is a PIN stored in an env var; a session cookie is set on success.

---

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16.2.6 (App Router) with React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Database | Supabase (Postgres), accessed via `@supabase/supabase-js` |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) — Claude Haiku 4.5 for word verification, Claude Opus 4.7 for story/quiz generation |
| Hosting | Vercel (recommended) |

---

## Key folders / files

```
src/
  app/
    (main)/            # Authenticated route group
      layout.tsx       # Renders <Nav> wrapper for all authed pages
      dashboard/       # Home page: stats, quick-add word, word list, nav cards
      vocabulary/      # Full vocab management: add/delete/search/star/random-week
      flashcards/      # SRS review session (SM-2 rating flow)
      quiz/            # AI quiz: setup → loading → questions → results
      stories/         # AI story generator with annotated vocabulary
    api/
      login/           # POST: validates PIN, sets session cookie
      logout/          # POST: clears session cookie
      vocabulary/      # GET/POST/PATCH/DELETE for vocab words
      srs/             # GET (due cards) / POST (submit rating)
      verify-word/     # POST: Claude Haiku checks spelling + returns translation
      generate-quiz/   # POST: Claude Opus generates 5 MCQ questions
      generate-story/  # POST: Claude Opus writes a B1 story with annotations
    login/page.tsx     # Login form
    page.tsx           # Root redirect (→ /dashboard if authed, else /login)
  components/
    Nav.tsx            # Bottom navigation bar
    FlashCard.tsx      # Flip card UI + SRS rating buttons
  lib/
    auth.ts            # PIN check + session cookie constants
    srs.ts             # SM-2 algorithm implementation
    supabase.ts        # Supabase client factory
  types/index.ts       # Shared TypeScript interfaces

supabase-schema.sql    # DB setup script (run once in Supabase SQL editor)
SETUP.md               # Local dev + Vercel deployment instructions
```

---

## Database schema

Two tables in Supabase (Postgres):

- **`vocabulary`** — `id, word, translation, example_sentence, notes, tags[], is_weekly_focus, created_at`
- **`srs_cards`** — `id, vocabulary_id (FK), ease_factor, interval_days, repetitions, next_review_at, last_reviewed_at, created_at`

An SRS card is created automatically whenever a new vocabulary word is saved. Row-level security is enabled but set to `Allow all` — the app enforces auth via PIN + cookie at the HTTP layer.

---

## Current deployment flow

1. Push to GitHub
2. Vercel auto-deploys on push to `main`
3. Required env vars in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `APP_PIN` — login PIN
   - `ANTHROPIC_API_KEY`

Local dev: `cp .env.local.example .env.local`, fill values, then `npm run dev`.

---

## Recent changes (git history)

| Commit | What changed |
|---|---|
| `3972a08` | Dashboard word-saving fix (2nd pass): quick-add flow refinements |
| `33ca001` | Switched `verify-word` from a heavier model to **Claude Haiku 4.5** (cheaper/faster for spell-check) |
| `3dc1096` | Added `verify-word` API + wired it into dashboard quick-add (debounced live validation with auto-fill translation) |
| `e56b209` | First working version — all five pages + SRS + AI routes |

---

## Known issues

- **No real auth** — PIN + cookie is sufficient for a personal app but there is no per-user isolation; anyone who guesses the PIN can read/write all data.
- **RLS is wide-open** — Supabase policies currently `Allow all`, relying entirely on the app layer for access control.
- **AI response parsing is fragile** — story and quiz routes use regex to extract JSON from Claude's response; a slight format variation can cause a 500.
- **`randomWeekly` fires N parallel PATCH requests** — one per word in the vocabulary. Will be slow (and chatty) as vocab grows.
- **No pagination on `/api/vocabulary`** — fetches all rows every time; fine at small scale, becomes a problem at hundreds of words.
- **SRS session capped at 20 cards** — hardcoded `.limit(20)` in `api/srs/route.ts`.

---

## Next planned tasks

_(nothing formally tracked — derived from current state)_

- [ ] Add prompt caching to story and quiz generation routes (high cost; `system` prompt is a good cache point)
- [ ] Harden AI response parsing — use structured output / tool use instead of regex
- [ ] Add edit-word capability (currently words can only be deleted, not updated)
- [ ] Tighten Supabase RLS (scope to a fixed user ID or use a service-role key server-side only)
- [ ] Fix `randomWeekly` to batch-update in a single request instead of N parallel PATCHes
