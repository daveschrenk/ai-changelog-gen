# AI Changelog Generator

> Turn your git log into a polished, human-readable changelog in seconds.

## What it does

Paste raw `git log --oneline` output → get a categorized Markdown changelog with sections for Features, Bug Fixes, Breaking Changes, and Other.

## Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS
- **LLM:** OpenRouter (Anthropic Claude 3.5 Haiku by default)
- **Billing:** Stripe (wired, not yet live)
- **Hosting:** Vercel-ready

## Getting Started

```bash
cp .env.local.example .env.local
# Fill in your OPENROUTER_API_KEY (minimum required for local dev)

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## API

See [API.md](./API.md) for full endpoint documentation.

**Quick test:**
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "gitLog": "abc1234 feat: add auth\ndef5678 fix: fix crash on login",
    "version": "v1.0.0"
  }'
```

## Business Model

- **Free tier:** 5 changelogs/month (no signup)
- **Pro tier:** $9/month — unlimited + API access + GitHub integration (coming soon)

## Project Status

- [x] Next.js scaffold
- [x] `/api/generate` route with LLM integration
- [x] Free tier rate limiting (in-memory, IP-based)
- [x] Landing page + UI
- [x] Pricing page
- [x] API documentation
- [ ] Stripe integration (Pro tier)
- [ ] GitHub OAuth + repo integration
- [ ] Supabase for persistent usage tracking
- [ ] Vercel deployment

## Team

Built by Greg (dev), Gus (QA), Gwen (PM) — The Mighty Thrice
