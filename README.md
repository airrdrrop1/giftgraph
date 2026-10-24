# GiftGraph

**Tell us three things they love. We'll find the gift.**

GiftGraph is a taste-driven gift finder built for the Qloo Agentic Hackathon
(Devpost, deadline 31 Oct 2026). Describe 3–5 things the gift recipient loves —
a band, a film, a city, anything — and the app builds a cross-domain gift
shortlist (experiences, books, brand goods, movies, podcasts) that matches
their taste, then refines it conversationally until the pick feels right.

No accounts, no PII: only Qloo entity IDs and aggregate taste signals.

Powered by Qloo's Taste AI — https://www.qloo.com

## Run it

Requirements: Node 18+ (tested on Node 24), npm.

```bash
npm install
# create .env.local with your key:
#   QLOO_API_KEY=<your key>          (never commit this file)
#   QLOO_BASE_URL=https://hackathon.api.qloo.com
npm run dev     # http://localhost:3000
npm run build   # production build
```

## Environment variables

| Variable       | Required | Description                                            |
| -------------- | -------- | ------------------------------------------------------ |
| `QLOO_API_KEY` | yes      | Qloo API key. **Server-side only** — never exposed to the browser. |
| `QLOO_BASE_URL`| no       | Qloo base URL, defaults to `https://hackathon.api.qloo.com`. |

`.env.local` is git-ignored. Copy `.env.example` to `.env.local` and fill in your key.

## Architecture

```
src/app/api/search/route.ts      GET  ?q=         free-text → entity IDs (seed picking)
src/app/api/trending/route.ts    GET              instant seed chips (live or curated fallback)
src/app/api/recommend/route.ts   POST {seeds,...} parallel /v2/insights fan-out per category
src/app/api/refine/route.ts      POST {action,..} refinement loop (see below)
src/lib/qloo.ts                  Qloo client: 30s timeout, 429 backoff+retry, 5-min cache
src/lib/recommend.ts             shared recommendation engine (merge/dedupe/tier/budget)
src/lib/reasons.ts               deterministic, data-anchored reason generator (NO LLM)
src/lib/refine.ts                deterministic free-text instruction parser (regex, NO LLM)
```

All Qloo calls happen in server-side API routes; the API key never reaches the client.
Frontend state lives in the client (no database).

### Recommendation flow

`POST /api/recommend` fans out **in parallel** to Qloo `/v2/insights` once per
output category — `place`, `book`, `brand`, `movie`, `podcast` — all with the
same `signal.interests.entities` seed signal (`take=8` each). If `city` is
provided, `filter.location.query=<city>` is added **only** to the place call.
Results are merged, deduplicated by `entity_id`, and each pick is tagged with
its source category.

### Ranking: tiers, never raw affinity

Qloo affinity scores cluster high and would all look fake as "97% match", so
we rank **relatively within each category** and surface only tiers:

- **Top match** — rank 1 in the category
- **Strong match** — ranks 2–3
- **Wildcard** — the rest

### Budget rule (deterministic, local)

Qloo returns no prices, so the budget is mapped to category priority instead
of dollar filtering:

- `budget <= 25` → hard-exclude `brand` and `place` (typically the priciest
  gift types); keep `book`, `podcast`, `movie`.
- `25 < budget <= 100` → soft priority: `book`, `podcast`, `movie` before
  `brand`, `place` (category ordering only).
- `budget > 100` or unset → no restrictions.

The rule applied is echoed in `meta.budgetRule` so the UI can display it.

### Refinement loop (`POST /api/refine`)

| action        | effect |
| ------------- | ------ |
| `exclude`     | thumbs-down an entity → re-runs recommend with `filter.exclude.entities` added; returns up to 3 replacement picks per category (skipping already-shown IDs) |
| `instruction` | free text parsed by a deterministic regex parser (`src/lib/refine.ts`): "under $30" → budget=30; "nothing edible"/"no food" → drop `place`; "nothing to wear"/"no clothes" → drop `brand`; "too many books" → drop `book`; "more practical" → prioritize book/podcast/movie. The parsed intent is echoed back as `{budget?, excludedCategories, priorityCategories?, message}` |
| `addSeed`     | appends a seed and re-runs recommend; returns the updated seed list |

### Reasons (no LLM — deliberate)

`src/lib/reasons.ts` builds 1–2 sentence reasons anchored to real data only:
a **named seed** + a **tag from the entity's own Qloo tags** + the **tier word**.
Thin signal (affinity < 0.7 or no tags) → honest message:
"No strong signal from your seeds — try adding broader tastes." No invented facts, ever.

## Honesty guarantees

- The key lives only in server-side code (`src/lib/qloo.ts` + route handlers).
- API errors are returned as `{ error, status }` — never fabricated data.
- Thin/no Qloo signal → empty categories + honest messages, not placeholders.
