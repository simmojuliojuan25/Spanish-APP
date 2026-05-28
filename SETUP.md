# Spanish Practice — Setup Guide

## 1. Supabase (database)

1. Go to [supabase.com](https://supabase.com) and create a free account + new project
2. In the SQL editor, paste and run the contents of `supabase-schema.sql`
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com) and create an API key
2. Copy it → `ANTHROPIC_API_KEY`

## 3. Local development

```bash
cp .env.local.example .env.local
# Fill in the three values above and set APP_PIN to your desired PIN

npm install
npm run dev
# Open http://localhost:3000
```

## 4. Deploy to Vercel

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com), import the repo
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `APP_PIN` — your PIN (numbers or letters, e.g. `4821`)
   - `ANTHROPIC_API_KEY`
4. Deploy — Vercel builds and hosts it automatically

The app will be available at your Vercel URL, accessible from any device.

## Features

| Page | What it does |
|------|-------------|
| **Dashboard** | Overview, weekly focus words, due card count |
| **Vocabulary** | Add/remove words, star words for weekly focus, 🎲 random week pick |
| **Flash Cards** | SM-2 spaced repetition — Again / Hard / Good / Easy ratings |
| **Quiz** | Claude generates 5 MCQ questions from your vocabulary |
| **Stories** | Claude writes a B1 story using your weekly words, with hover translations |
