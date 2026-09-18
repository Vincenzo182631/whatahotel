# WhataHotel Advisor — Architecture & Reusable Logic

A reference for how the WhataHotel AI advisor works end-to-end, written so the
pattern can be lifted into another project. It documents the actual code in
`lib/ai/`, `lib/services/`, `lib/chat/`, `store/`, and `app/api/chat/`.

---

## 0. The one idea that makes it work

**Grounded generation with a swappable voice.** The LLM never fetches data and
never has tools. A **deterministic "brain"** does *all* the thinking — parses the
message, updates memory, decides the action, and gathers real facts — then hands
a fully-formed **situation object** to a thin **voice layer** that only phrases
it. That voice is an LLM when a key is present, or a deterministic template
engine when it isn't. Same product, key or no key.

The system prompt ends with the contract that enforces this:
> "You will be told the situation for this turn… Produce ONLY the conversational
> reply — the app renders the hotel cards, comparison tables and booking forms
> separately."

Consequences:
- Recommendations are **explainable and reproducible** (a scoring function, not a
  black box).
- The app is **fully usable with zero API keys** (deterministic NLU + voice).
- The model is **provider-agnostic and swappable** (OpenAI or Anthropic) because
  it's only ever a phrasing layer over pre-computed facts.

---

## 1. Data model — one source of truth

Everything reasons over a single object, `SearchCriteria`
(`lib/services/types.ts`):

```ts
SearchCriteria {
  destination?, destinationLabel?, destinations?[],   // canonical key + label (+ multi-city)
  checkIn?, checkOut?, travelMonth?, nights?,
  adults?, children?, budgetMin?, budgetMax?,          // budget per night, USD
  occasion?, brands?[], amenities?[], vibes?[], nearby?,
  notes?[],           // freeform prefs (pets, high floor, dietary…) — accumulated, never re-asked
  requestedCount?     // "show me 3" persists until changed
}
```

Other core types:
- `Hotel` — vendor-agnostic hotel shape. The service layer maps Amadeus /
  WhataHotel payloads *into* this, so the UI and engine never depend on a vendor
  format.
- `Recommendation extends Hotel` — adds `{ reason, matchScore (0–100, internal),
  fitScore (5.0–10.0, shown), rank, matchTags[], estimatedTotal?, distanceLabel? }`.
- `AdvisorAction` (`lib/chat/types.ts`) = `ask | recommend | compare | book |
  chat | explain | live | qa | local`.
- `AdvisorPayload` — the structured data streamed to the client after the prose.

---

## 2. Request lifecycle (one chat turn)

`POST /api/chat` — SSE, Node runtime (`app/api/chat/route.ts`):

1. Per-IP rate limit (30 requests / 60s).
2. `const { ctx, payload } = await runTurn(body)` — the brain: memory + decide +
   gather.
3. Overlay beach/sargassum intelligence when the destination is coastal
   (`attachBeachIntelligence`).
4. Stream Server-Sent Events:
   ```
   for await (chunk of streamReply(ctx))  → send { type: "text", value: chunk }
   send { type: "final", payload }
   ```

Each turn yields **two things**:
- `ctx` — a `ReplyContext` (`lib/ai/context.ts`): the grounded situation the
  reply generator speaks from.
- `payload` — an `AdvisorPayload`: the structured data the UI renders as cards,
  comparison tables, and booking forms.

Text streams first, structured payload lands last.

---

## 3. `runTurn` pipeline — the brain (`lib/ai/advisor.ts`)

```
runTurn(body) →
 0. Load session state (criteria + lastRecommendations + booking)      [session-storage]
 1. If an active booking exists, is incomplete, no pivot phrase, and
    intent != compare → continueBooking()                              [flow priority]
 1b. If the message is JUST a sign-off → farewell (action:"chat")      [closing detector]
 2. IN PARALLEL:  extractCriteriaPatch()  +  classifyTurn()            [memory + router]
     → mergeCriteria(); fold cross-bot memory notes; parseIsoDates();
       compute learned[] (PATCH_TO_FIELD); save session
 2b. Resolve the action via a LAYERED fallback (below)
 2c. Detect "new search vs follow-up" (dynamic search context)
 3+. Branch on action → gather real data from the service layer
 last. Build ReplyContext + AdvisorPayload; persist lastRecommendations
```

### Layered intent resolution (step 2b)

Most trustworthy signal wins:

```ts
explicitIntent =
  intent?.type ??                                          // 1. explicit UI intent (card button)
  (refersToShown && regexIntent ∈ {explain,qa,compare,local} ? regexIntent : undefined) ??  // 2. on-screen reference
  routedIntent ??                                          // 3. fast-LLM router (classifyTurn)
  regexIntent;                                             // 4. deterministic regex router (detectIntent)
```

- `intent?.type` — a card button ("Compare", "Book", "Details") beats everything.
- `refersToShown` — message points at on-screen hotels (`the first`, `these`,
  `which of them`, `it`…) and there ARE last recommendations → trust the
  deterministic explain/qa/compare read so a follow-up never silently re-runs a
  search.
- `routedIntent` — the fast LLM classifier's action.
- `regexIntent` — the always-available floor.

### Dynamic search context (step 2c)

Decides whether this turn is a **new/changed search** or a **follow-up about
hotels already on screen**:

```ts
turnIntent   = parseTravelIntent(lastUserMessage, criteria)
askedCount   = parseQuantity(lastUserMessage)        // persisted → criteria.requestedCount
shownLimit   = criteria.requestedCount ?? 5
changedSearch = learned ∩ {destination,dates,budget,occasion,amenities,vibes,brands,nearby,guests}
searchIntentChange =
  !refersToShown &&
  ( changedSearch
    || (turnIntent.proximity && wantsHotels)
    || (SWITCH_RE && (proximity || travelerTypes || wantsHotels)) )
// SWITCH_RE = actually|instead|never mind|switch to|make it|how about|rather|different city…
```

This is what makes "actually, make it Tokyo" replace *only* the city and
re-search, while keeping the preferences that didn't change.

### Action branches (evaluated top-to-bottom; first match returns)

| Guard | Action | Data gathered |
|---|---|---|
| active booking, no pivot | `book` | `continueBooking()` |
| message is only a sign-off | `chat` | farewell (`chosen` if a hotel was settled, else `open`) |
| `intent==="compare"` | `compare` | `resolveHotels()` (≥2, else top-2) → `detectPriority()` → **`buildLiveComparison(top-3, checkIn, checkOut, priority)`** |
| `explain` + refers to shown, not a new search | `explain` | `focus` = resolved shown hotels (no recs in payload — cards already on screen) |
| `qa` + refers to shown | `qa` | `focus` via `resolveByNames(route.targetHotels)`; `qaQuestion = route.question` |
| `local` + not a new search | `local` | `focusHotel` resolved; `CITY_POIS[key]` → `localArea{city, hotelName, pois}` |
| country named, no city | `ask` | `askCityCountry` — ask which city |
| named specific properties | `live` | `searchHotelsByName()` ×≤3, dedup by `sourceHotelId`, `attachLiveInfo` (`namedLookup:true`, `notFoundNames`) |
| brand named (+ city) | `live` / `ask` | per city×brand: `brandHotelsForCity()` → anchor pipeline → `rankLiveHotels()` (best per city); asks dates if missing |
| brand named, no city | `ask` | `askBrandCity:true` |
| ≥2 cities | `live` / `ask` | per city (≤5, parallel): `getCityHotelsBeachAware()` → anchor pipeline → `rankLiveHotels().slice(0,3)`, grouped by city |
| place known, no prefs, nothing shown, <2 assistant turns | `ask` | `discovery:"purpose"` — one warm preference question first |
| city + dates | `live` | single-city live search (the happy path — see §7) |
| `readyToRecommend` & (changed/switch/nothing shown) | `recommend` | local catalogue via `recommendationService.recommend()` → `applyIntentRanking()` |
| fallback | `ask` / `chat` | `missingFields()`, greeting detection, `destinationSuggestions` |

### Notable helpers (advisor.ts)

- `detectIntent(text)` → `compare|book|explain|recommend|qa|local|null`. Ordered
  regex; `local` before `explain`, `explain` before `qa`, `recommend` last (so
  "why does X rank higher" wins over a re-search).
- `resolveHotels(text, last, explicitIds?)` — matches explicit IDs, then hotel
  name / second word, then an `ORDINALS` map (`first/1st/one → 0`…).
- `resolveByNames(names, last)` — router-supplied names/ordinals → shown recs.
- `detectPriority(text, criteria)` → `spa|dining|location|value|families|romance|
  pool&beach|business`, falling back to `criteria.occasion` / first amenity.
- `buildAdvisorUser(isFirstTurn)` — from `getCurrentUser()` + trips →
  `{firstName, travelerType, membership, lastTripCity, upcomingTripCity, greet}`.
- `scanCitiesInText`, `parseIsoDates`, `heuristicCity`, `wantsBeach(intent)`,
  `nextBookingField`, `valueForBookingField`; constants `CITY_STOPWORDS`,
  `ORDINALS`, `BOOKING_FIELDS`, `PATCH_TO_FIELD`.

---

## 4. Memory + NLU (`lib/services/conversation-memory.ts`)

`parseMessage(text, current) → Partial<SearchCriteria>` — a **dependency-free
NLU** built from regex/keyword tables. Extracts (only what's confidently
detected, so merging never clobbers prior context):

- **budget** — absolute (`$1.2k`, `1200 a night`, `under 700`) AND relative
  (`increase my budget` → ×1.4, `make it cheaper` → ×0.7).
- **guests** — `2 adults`, `family of 4` → 2 adults + 2 kids, `just the two of
  us` → 2, `solo` → 1.
- **occasion, amenities, vibes, brands** — keyword tables (amenities and vibes
  accumulate; brands accumulate).
- **nights, travel month, destination** (`resolveDestination`), **nearby
  landmark** (`near the Eiffel Tower`).

Companion functions:
- `mergeCriteria(current, patch)` — patch wins, `undefined`/`null` ignored,
  `notes` accumulate deduped (last 12), a stale landmark is cleared when the city
  changes.
- `missingFields(c)` — high-value unknowns in ask order: destination → dates →
  budget → occasion → guests.
- `readyToRecommend(c)` — destination present AND ≥2 of {dates, budget,
  occasion/vibe, adults, amenities} known.

### LLM refinement (`extractCriteriaPatch` in `provider.ts`)

Deterministic `parseMessage` runs first (reliable); when an LLM is configured a
**fast model** `generateObject` against a Zod schema (`criteriaPatchSchema`)
refines it, LLM winning on conflicts. Destinations are normalized to canonical
keys/labels (known cities → key, unknown → title-cased label kept for live
search). Multi-city ("New York, Miami and Orlando") is captured into
`destinations[]`, with the first seeding the primary `destination`.

---

## 5. The router (`classifyTurn` in `provider.ts`)

A fast-model `generateObject` classifies the turn into one action:
`recommend | compare | book | explain | qa | local | live | smalltalk | ask`,
plus `targetHotels[]` (ordinals/names of on-screen hotels) and a precise
`question` for QA. Returns `null` with no key → the regex `detectIntent`
fallback takes over. `qa/explain/compare` are only chosen when hotels are
already shown.

---

## 6. Recommendation engine — deterministic & explainable (`lib/services/recommendation-engine.ts`)

`scoreHotel(hotel, criteria)` — the "brain an LLM would otherwise approximate",
kept deterministic so picks are reproducible and explainable:

```
score  = prestige(brand) × 8            // brand tier 7–10 → baseline 56–80
       + max(0, (rating − 8.5) × 6)     // real guest rating nudge
       + budget:  +16 within,  +7 within 1.25×
       + occasion match: +14
       + amenities: min(matched × 5, 20)
       + vibes:     min(matched × 4, 12)
       + preferred brand: +16
       + nearby landmark hit: +8
       → capped at 100;  fitScore = clamp(score / 10, 5..10)
```

Each hotel gets a human `generateReason()` ("I chose X because you mentioned your
anniversary, and it offers a renowned spa…"). Results are sorted by `matchScore`,
sliced to `requestedCount` (default 5), and ranked 1..n. `buildComparison(hotels)`
produces static side-by-side rows + a best-value verdict (lowest nightly rate
when guest ratings aren't available).

`PRESTIGE` is a brand → tier table (Aman/Four Seasons/Ritz-Carlton… = 10,
Shangri-La/Jumeirah = 9, JW Marriott/Westin = 8, Marriott/Hilton/Hyatt = 7.5,
unknown = 7).

---

## 7. Travel-intent parsing & geographic ranking (`lib/ai/travel-intent.ts`)

For live/geographic searches ("near the beach/airport/a landmark", traveller
types, price sort), this parses the *stated* intent and ranks live hotels with
**real geography**.

### `parseTravelIntent(message, criteria) → TravelIntent`

```ts
TravelIntent {
  proximity: { kind, label } | null,   // beach|airport|cruise|downtown|nightlife|shopping|attraction|transit
  travelerTypes: TravelerType[],       // honeymoon|family|business|luxury|budget|quiet|pet|accessible|walkable
  carFree: boolean,
  priceSort: "cheapest"|"premium"|"ignore"|null,
  budgetMax?: number
}
```

- **proximity** — ordered `PROXIMITY_PATTERNS`, first match wins; a named
  landmark overrides a generic downtown/shopping category (→ `kind:"attraction"`)
  but not beach/airport/cruise.
- **travelerTypes** — regex tables, plus folded from `criteria.occasion` and each
  `criteria.notes` entry.
- **carFree** — `no car / public transport / walk everywhere` → also adds
  `walkable`.
- **priceSort** — precedence: ignore → cheapest → premium → (budget type →
  cheapest) → (luxury type → premium).

`parseQuantity(message)` extracts "how many hotels to show" (`top 3`, `best 5`,
`just one`), rejecting "3 nights / 2 adults / 5-star", capped at 12.

### Anchor / geocoding chain (`getAnchor`)

1. **Curated first** — `CITY_ANCHORS`: ~18 cities with hand-set lat/lng per
   proximity kind + landmark regexes (Miami, Vegas, NYC, Paris, London, Dubai,
   Tokyo, Bali, Maui, Cancún, Honolulu…).
2. **Live fallback** — `geocodeAnchor`: **Google Geocoding**
   (`GOOGLE_PLACES_API_KEY`, 4s timeout, needs `status==="OK"`) → **Nominatim/OSM**
   fallback. Results cached, including negatives.
3. **`validateAnchor(anchor, hotels)`** — min haversine to any hotel with coords;
   if **> 150 km**, discard the anchor (geocoder hit the wrong continent) and fall
   back to qualitative ranking. No coords → pass through.

`haversineKm(a,b)` (R = 6371 km); `distanceLabel(km,label)` → `~<m|km> from
<label>`.

### Scoring — `scoreHotel(h, local, coords, anchor, intent)`

Enriches each live hotel from the local catalogue by `sourceHotelId`. Additive:

```
proximity (real distance):   +max(0, 45 − km × 3)   // 0km→+45, ~0 by 15km
beach + beachfront (no coords): +30
per traveller-type:
   +7 each matched amenity (TYPE_AMENITIES)
   +12 occasion match (TYPE_OCCASION)
   +8 vibe match (TYPE_VIBE)
   luxury: +10 if 5★, +4 if branded
base quality:  rating (r − 8.5) × 4;   perks min(6, n × 1.5)
```

### `rankLiveHotels(hotels, intent, anchor)`

```
hasIntent   = proximity || travelerTypes.length || priceActive
priceWeight = cheapest 40 / premium 12 / else 0
priceScore  = normalized approxNightly across the set:
                cheapest → weight × (1 − norm),  premium → weight × norm
relevanceScore = scoreHotel + priceScore
if !hasIntent → return as-is (cheapest-first)
sort by relevanceScore (original-rank tiebreak)
geo filter — beach/airport/cruise: radius 8km airport / 6km else,
             applied only if ≥3 hotels within it
budget cap: keep approxNightly ≤ budgetMax × 1.10 (null-price kept; if all
             filtered, cheapest 3)
```

### `applyIntentRanking(recs, intent, limit, anchor)` — local-catalogue path

```
budget filter: keep startingRate ≤ budgetMax × 1.05
if cheapest && no anchor → pure price-asc sort
else blended = matchScore + anchorBoost + priceScore
     anchorBoost = max(0, 30 − km × 3), capped at 12km
     priceWeight = cheapest 50 / premium 12
assign rank + distanceLabel
```

### Single-city live search (branch `4c`, the happy path)

```ts
live   = getCityHotelsBeachAware({ city, checkIn, checkOut, includeBeach: wantsBeach(intent) })
anchor = intent.proximity ? getAnchor(city, proximity, live[0]?.country) : null
if (anchor) { live = attachLiveCoordinates(live, 18); anchor = validateAnchor(anchor, live) }
ranked = rankLiveHotels(live, intent, anchor)
pool   = ranked.slice(0, beach ? max(shownLimit,10) : shownLimit)
if (proximity || travelerTypes || beach)
  pool = attachLiveInfo(pool).map(h => ({ ...h, matchReason: buildLiveMatchReason(h,intent) ?? h.matchReason }))
if (beach) pool = stable-sort beachfront-first
liveHotels = pool.slice(0, shownLimit)   // liveNote warns if beach requested but nothing beachfront
```

### Match-reason & beach helpers

- `buildLiveMatchReason(hotel, intent)` — leads with `LEAD_LABEL[type]`, appends
  up to 3 `AMENITY_PHRASE`, adds `dining incl. <restaurant>` for honeymoon/luxury.
- `isBeachfrontHotel(h)` — `beachfront` amenity, OR distance ≤ 3km, OR a
  beach-city regex (South Beach / Waikiki / Nusa Dua / Cancún / Tulum…).
- `summarizeIntent(intent)` — one-line string for the reply prompt.

---

## 8. The voice layer (`lib/ai/provider.ts` + `system-prompt.ts` + `advisor-voice.ts`)

`streamReply(ctx)`:
- LLM present → `streamFromClaude(ctx)`
- else → `streamDeterministic(composeReply(ctx))`

`buildSituation(ctx)` turns the action + gathered facts into a grounded
`SITUATION:` block. The LLM message carries: a persona line, a first-turn
greeting cue, `summarizeCriteria`, the last user message, the SITUATION facts,
and (when relevant) beach intelligence — all under `ADVISOR_SYSTEM_PROMPT`.

The system prompt enforces the product rules:
- **Memory is sacred** — never re-ask anything already known.
- **Evidence only** — never invent a rating, amenity, perk, or hotel; if a detail
  isn't given, don't state it.
- **Never quote a nightly rate** — live rates render separately in the UI.
- **Brand-lock** — when a brand is named, speak only about that brand's
  properties.
- **Consultative discovery** — ask one thing at a time; recognise when there's
  enough and stop.
- **Graceful recovery** — never dead-end on "no results"; offer alternatives.
- **Warm farewells** — recognise sign-offs and close without pushing.

`advisor-voice.ts` is the no-LLM twin: it composes the same replies
deterministically from `ctx`, so the product is fully functional with zero keys.

### Provider selection (`provider.ts`)

- `PROVIDER` = OpenAI if `OPENAI_API_KEY`, else Anthropic if `ANTHROPIC_API_KEY`.
- `MODEL` (reply) + `FAST_MODEL` (extraction/routing), overridable via
  `AI_MODEL` / `AI_FAST_MODEL`; a model id that belongs to the other provider is
  ignored so switching keys "just works".
- Uses the Vercel AI SDK (`ai` + `@ai-sdk/openai` / `@ai-sdk/anthropic`),
  `generateObject` for structured extraction/routing and `streamText` for the
  reply.

---

## 9. Service layer — modular, mock ↔ live (`lib/services/`)

The UI and engine never import a vendor SDK. Each service has a stable signature
and degrades to mock data:

```
amadeus-hotel-search   Hotel search        (mock ↔ Amadeus)
hotel-details          Single property
room-availability      Rooms & rates
pricing                Quotes, taxes, advisor savings
images                 Galleries + safe fallback
advisor-perks          WhataHotel-exclusive benefits
destination-knowledge  Editorial intelligence about places
beach-intelligence     Sargassum / beach conditions (USF/NOAA)
conversation-memory    Criteria merge + dependency-free NLU
recommendation-engine  Scoring, human reasons, comparison
session-storage        Per-conversation server memory (Redis ↔ in-memory)
live-rates             The real WhataHotel API (rates / cityrates / search / info)
mock-data              Curated luxury inventory
```

`live-rates.ts` is the production data source: dated room rates, city search, and
hotel info, with in-memory caching (per hotel + date range) and request
serialization (the source throttles concurrent requests — calls are chained
through per-method queues, with a retry on a transient miss).

---

## 10. State & wire contracts

### Server memory (`lib/services/session-storage.ts`)

Keyed by `sessionId`: `{ criteria, lastRecommendations, booking, updatedAt }`.
Redis-backed (Vercel KV / Upstash) with an in-memory `Map` fallback + a
per-instance cache, 6h TTL. This is what resolves "compare the first and third"
and "book the second" without the client re-sending state.

### Client (`store/`)

Zustand stores hold the conversation (`conversation-store.ts`), compare selection,
preferences, travel dates, traveller memory, and voice state. `sessionId` is
persisted in `localStorage`. Saved hotels are a persisted Zustand store.

### Wire format (`lib/chat/types.ts`)

- `AdvisorPayload` — `{ action, criteria, recommendations?, totalFound?,
  comparison?, missing?, booking?, liveHotels?, liveCity?, cities?, beachAlert? }`.
- SSE stream — `{ type: "text", value }` deltas, then a final
  `{ type: "final", payload }`.
- `ChatRequestBody` — `{ sessionId, messages, intent?, memory?, timeOfDay? }`.

---

## 11. How to reuse it (the portable recipe)

1. Define **one criteria object** as the source of truth + vendor-agnostic domain
   types.
2. Write a **deterministic NLU** (regex/keyword tables) → `parse` + `merge` +
   `missing`/`ready`. This alone makes the app work with no LLM.
3. Add a **fast-LLM refiner** (`generateObject` + schema) that only *sharpens* the
   deterministic parse (LLM wins conflicts).
4. Build a **router** (fast LLM → action enum, regex fallback) with a **layered
   override**: explicit UI intent > on-screen reference > LLM > regex.
5. Keep a **deterministic engine** that scores/ranks and writes human reasons —
   explainable, reproducible, LLM-optional.
6. Split **"what to say" (grounded facts)** from **"how to say it" (voice)**: feed
   the voice a `SITUATION` block and forbid it from inventing anything.
7. Put all data access behind a **service layer** that degrades to mocks; keep
   **server session state** keyed by id so follow-ups ("the first one") resolve.
8. Stream **prose first, structured payload last**; render cards/tables from the
   payload, never from the model's text.

### Ranking takeaways specific to this domain

- **Distance beats everything** (+45 live / +30 local) and decays ~3 pts/km, so
  "near X" genuinely leads.
- **Price is a *weight*, not a filter** (except explicit "cheapest"), normalized
  across the current set — robust to any currency/market.
- **Every geocode is guarded** by a 150km sanity check + a "≥3 hotels in radius"
  rule, so a bad geocode never wrecks the list.
- **Two parallel engines** (curated-local vs live) share the same `TravelIntent`
  and the same distance/price math — that's what lets it behave identically with
  mock data or the live API.

---

## Appendix — file map

```
app/api/chat/route.ts          SSE endpoint: rate limit → runTurn → streamReply
lib/ai/
  advisor.ts                   runTurn(): memory → decide action → gather → ReplyContext + payload
  provider.ts                  LLM (Vercel AI SDK) OR deterministic; extractCriteriaPatch, classifyTurn, streamReply
  system-prompt.ts             ADVISOR_SYSTEM_PROMPT + summarizeCriteria
  advisor-voice.ts             deterministic "advisor voice" (no key needed)
  travel-intent.ts             parseTravelIntent, getAnchor, rankLiveHotels, applyIntentRanking
  context.ts                   ReplyContext (the grounded situation object)
  brands.ts, hotel-knowledge.ts, comparison-knowledge.ts, itinerary.ts, beach.ts, country-links.ts
lib/services/
  conversation-memory.ts       parseMessage (NLU), mergeCriteria, missingFields, readyToRecommend
  recommendation-engine.ts     scoreHotel, recommend(), buildComparison
  session-storage.ts           per-session server memory (Redis ↔ in-memory)
  live-rates.ts                real WhataHotel API (rates/cityrates/search/info) + cache + serialization
  types.ts                     SearchCriteria, Hotel, Recommendation, …
lib/chat/types.ts              AdvisorAction, AdvisorPayload, ChatRequestBody, SSE events
store/                         Zustand client stores (conversation, compare, preferences, …)
```
