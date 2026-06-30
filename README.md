# WhataHotel — AI Luxury Travel Advisor

An AI-first luxury hotel platform where **the conversation is the product**. Not a
search engine with a chatbot bolted on — an expert luxury travel advisor, powered
by AI, that guides you from inspiration to booking.

> _"Tell me how you want to feel."_ — one prompt, no forms, no dropdowns.

---

## ✦ What it does

- **Conversational homepage** — a single large prompt (`Where would you like to stay?`)
  with example prompts and one-tap suggestion chips (Romantic weekend, Beach
  escape, Family vacation…).
- **An advisor that thinks** — asks only for the details it's missing, remembers
  everything, and updates a single field when you change your mind
  ("actually, make it Tokyo" / "increase my budget").
- **Streaming replies** with typing indicators — real token streaming with Claude,
  or a deterministic "advisor voice" when no API key is set.
- **Luxury recommendation cards** — image, match score, a human _"why I chose this"_,
  amenities, advisor-exclusive perks, rate, distances, and actions
  (View details · Book · Compare · Save · Perks).
- **Side-by-side comparison** — "compare the first and third" renders a luxury
  comparison table (pros, best for couples, dining, spa, value score, a verdict).
- **Progressive booking** — collected conversationally (name, email, phone, bed
  preference, special requests, arrival time) with a live booking summary.
- **Hotel details page** with a **docked advisor** that answers hotel-specific
  questions instantly ("connecting rooms?", "how far is the airport?", "best view?").
- **Saved collection** persisted locally.

## ✦ Design language

Dark, editorial luxury — deep navy `#0B1B2B`, champagne gold `#C8A45D`,
glassmorphism, soft gradient aurora, grain, generous whitespace, and restrained
motion. Typography pairs **Fraunces** (display serif) with **Manrope** (body).

## ✦ Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Framer Motion ·
shadcn-style UI primitives · Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) ·
Zustand · React Query.

---

## ✦ Getting started

> **Node.js 18.18+ is required** (Node 20 LTS recommended). It was not installed on
> the machine where this was scaffolded — install it from <https://nodejs.org> first.

```bash
# 1. install dependencies
npm install

# 2. (optional) configure keys — the app runs fully without them
cp .env.example .env.local

# 3. run
npm run dev
# open http://localhost:3000
```

### It works with zero configuration

Every backend service degrades gracefully to **mock luxury inventory** and a
**deterministic advisor engine**. Add keys to upgrade individual services to live
data — nothing else changes.

| Capability | Without keys | With keys |
| --- | --- | --- |
| Natural-language understanding & replies | Deterministic NLU + advisor voice | Claude via Vercel AI SDK (`ANTHROPIC_API_KEY`) |
| Hotel inventory | Curated mock data (9 destinations) | Amadeus (`AMADEUS_CLIENT_ID/SECRET`) |
| Advisor perks | Mock perks | WhataHotel Perks API |

Set `ANTHROPIC_API_KEY` (and optionally `AI_MODEL`, default `claude-sonnet-4-6`)
in `.env.local` to enable real LLM streaming.

---

## ✦ Architecture

The UI never imports a vendor SDK. Everything goes through a **modular, replaceable
service layer** (`lib/services/`), exactly as requested:

```
lib/services/
  amadeus-hotel-search.ts   Hotel search        (mock ↔ Amadeus)
  hotel-details.ts          Single property
  room-availability.ts      Rooms & rates
  pricing.ts                Quotes, taxes, advisor savings
  images.ts                 Galleries + safe fallback
  advisor-perks.ts          WhataHotel-exclusive benefits
  destination-knowledge.ts  Editorial intelligence about places
  conversation-memory.ts    Criteria merge + dependency-free NLU
  recommendation-engine.ts  Scoring, human reasoning, comparison
  session-storage.ts        Per-conversation server memory (swap for Redis/DB)
  mock-data.ts              Curated luxury inventory
```

The AI orchestration lives in `lib/ai/`:

```
lib/ai/
  provider.ts        Claude (Vercel AI SDK) OR deterministic fallback
  advisor.ts         runTurn(): memory → decide action → gather → reply context
  advisor-voice.ts   The deterministic "advisor voice" (no key needed)
  system-prompt.ts   Claude system prompt + criteria summarizer
```

### Request flow

```
Client (Zustand store)
  └─ POST /api/chat  { sessionId, messages, intent? }
       └─ runTurn()                     update memory, decide action,
       │                                 fetch recommendations / comparison / booking
       └─ streamReply()  ──SSE──▶       text deltas, then a final structured payload
  ◀─ store renders prose + hotel cards / comparison table / booking summary
```

- `POST /api/chat` — streaming Server-Sent Events (`{type:"text"}` deltas, then
  `{type:"final", payload}` with criteria, recommendations, comparison, booking).
- `GET /api/hotels` / `GET /api/hotels?id=…` — used by React Query on the details
  page (rooms, perks, pricing bundle).

### Where state lives

- **Conversation** (messages, streaming, live criteria) — Zustand
  (`store/conversation-store.ts`), session id persisted in `localStorage`.
- **Server memory** (criteria, last recommendations, booking) — keyed by
  `sessionId` in `session-storage.ts` (drop-in for Redis/DB).
- **Saved hotels** — persisted Zustand store.

---

## ✦ Try these

```
I want a beachfront resort in Bali under $700 per night.
My wife and I are celebrating our anniversary in Paris in October.
Actually, make it Tokyo — with an amazing spa.
Increase my budget.
Compare the first and third.
Book the second one.
```

## ✦ Project layout

```
app/            routes (home, /hotel/[id], /saved, /api/chat, /api/hotels)
components/     ui/ (primitives), chat/, hotel/, layout/, hero, home-experience
hooks/          React Query hooks
lib/            services/, ai/, chat/ (shared types + hotel Q&A), utils
store/          Zustand stores
```

## ✦ Notes & next steps

- Swap each service's mock body for the live integration — signatures are stable.
- Replace the in-memory session map with Redis/Postgres for production.
- The provider is model-agnostic: point `lib/ai/provider.ts` at OpenAI/Gemini by
  swapping `@ai-sdk/anthropic` for the matching AI SDK provider.
- Images use Unsplash with a deterministic fallback so cards never break; point
  `images.ts` at the WhataHotel media CDN for production.

---

Built to feel like the world's best AI luxury hotel advisor — not a hotel search engine.
