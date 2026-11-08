# URL Shortener

A small anonymous URL shortener API built to practice schema design, database constraints, and index-driven performance. Submit a long URL, get a short code back, visit the code to be redirected, and look up how many times a code was visited.

**Live:** https://url-shortener-dj8n.onrender.com

> Hosted on free tiers (Render for the server, Neon for Postgres). The server sleeps after 15 minutes without traffic and the database suspends when idle, so the first request after a quiet period can take several seconds, up to about a minute. This is a hosting limit, not a bug.

## Stack

TypeScript, Express 5, PostgreSQL (`pg`, raw SQL, no ORM), zod, pino, `express-rate-limit`, Vitest + supertest. Deployed on Render with Neon Postgres.

## API

| Method | Path | Description |
|---|---|---|
| POST | `/api/code` | Create a short code. Body: `{ "url": "https://...", "expires_at": <1-31> }`. `expires_at` is optional, in days from now, and defaults to 30. Returns `201` with `{ code, expires_at }`. |
| GET | `/api/code/:code` | Redirects (302) to the original URL and logs a click. 404 for unknown, inactive or expired codes. |
| GET | `/api/code/:code/stats` | Returns `{ count }`. Optional query: `period=today\|week\|month`, or `year` and `month` for a specific month. |

Only `http` and `https` URLs are accepted. Anything else (such as `javascript:`) is rejected with 400, and so are invalid query values (bad month, bad year, unknown period).

Example:

```bash
curl -X POST https://url-shortener-dj8n.onrender.com/api/code \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

## Schema

```sql
create table codes (
  id         bigint generated always as identity primary key,
  code       varchar(10) not null,
  url        text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active  boolean not null default true
);

create unique index ix_unique_code on codes (code) where is_active = true;

create table clicks (
  id         bigint generated always as identity primary key,
  code_id    bigint not null references codes (id),
  created_at timestamptz not null default now()
);

create index ix_click_code on clicks (code_id, created_at);
```

## Design decisions

- **Each submission gets its own code.** Submitting the same URL twice gives two codes. A code's click history belongs to exactly one purpose, and no stranger sees someone else's stats. There is no separate `url` table, so the address lives in one place and cannot drift.
- **Codes are random, 7 characters, alphanumeric,** from a cryptographically secure source (`crypto`). That is about 3.5 trillion possibilities, so they can't be guessed or enumerated.
- **The database guarantees uniqueness, not the app.** A check-then-insert has a gap where two simultaneous requests both see "free". The `UNIQUE` index rejects the second insert, and the create handler retries with a new code on Postgres error `23505`, up to 3 attempts. Other errors are not retried.
- **Clicks are an append-only log.** Counts are questions asked of the log. A counter column would lose history and race under concurrent visits.
- **Redirects use 302, not 301.** A 301 is cached by browsers, so repeat visits would never reach the server and would never be counted.
- **The click insert is awaited, and its failure is caught and logged.** The visitor is redirected even if the insert fails. This trades one extra database round trip for durability and bounded concurrency, instead of unbounded fire-and-forget inserts.
- **Stats return a total only,** with no per-day breakdown. This is a deliberate scope cut.
- **Time ranges are half-open** (`created_at >= start AND created_at < end`), so a click on a boundary instant belongs to exactly one range. Day, week and month boundaries use `Asia/Manila`.
- **The unique index on `code` covers active codes only.** A deactivated code string could in theory be reissued. With random 7-character codes the chance is negligible. It would matter if custom aliases were added.
- **No auth and no list-all endpoints,** so there is no way to browse other people's links or clicks. Ownership would be the first thing auth adds.
- **Rate limiting** with `express-rate-limit`: 100 requests per 15-minute window per client IP. The app runs behind Render's proxies, so the number of trusted proxy hops is set with the `TRUST_PROXY_HOPS` environment variable (never `trust proxy = true`, which would let clients spoof their IP).

## Performance

The stats query counts one code's clicks in a date range. Index `ix_click_code (code_id, created_at)` is sorted by code first, then time, so one code's clicks sit together in time order and a date range is a single contiguous slice.

**Benchmark setup:** separate database, 10,000 codes, 1,000,000 clicks spread over 12 months, skewed so a few codes are hot (`code_id = 1 + floor(10000 * random()^3)`). A "hot" code has many clicks and a "cold" code has few. Local PostgreSQL, warm cache, 3 runs per case (median reported), `VACUUM ANALYZE` before measuring. The "no index" case is the same query on the same data with `ix_click_code` dropped. The deployed app always has the index.

| Case | Rows counted | No index | With index | Pages touched (no index → index) |
|---|---|---|---|---|
| Hot code (46,240 clicks), 1 month | 761 | 20.6 ms (Parallel Seq Scan) | 0.25 ms (Index Only Scan) | 6,381 → ~10 |
| Hot code, 12 months | 45,479 | 47.4 ms | 7.7 ms | 6,381 → ~181 |
| Cold code (19 clicks), 1 month | 0 | 20.7 ms | 0.08 ms | 6,381 → ~6 |

What the numbers show:

- Without the index, cost is the same whichever code you ask for: every row is read and filtered. With the index, cost follows the size of the answer.
- The speedup shrinks as the answer grows (about 270x for an empty result, 80x for 761 rows, 6x for 45k rows).
- All indexed plans were true index-only scans (`Heap Fetches: 0`), so the table itself was never read.
- The sequential scan grows with table size (about 20 ms at 1M rows, so roughly 200 ms at 10M if it scales linearly, which is an extrapolation and not a measurement). Index cost grows with tree depth, which changes by about one page per 100x more data.

Caveats:

- Times are executor time only. Planning added 0.6-0.9 ms, which is more than the execution time of the fastest indexed case. Including planning, the hot 1-month speedup is closer to 20x.
- The cache was warm and the data was uniformly random. Real traffic is burstier, and a cold cache would hurt the sequential scan more than the index.
- The no-index runs used 2 parallel workers. On a single-core host the scan would be slower.
- Known limit: counting still reads one index entry per click, so a single code with tens of millions of clicks would slow down again. The fix would be a stored daily rollup, which trades write cost and a consistency risk for fast reads. Not built, since measurements don't justify it yet.

### The cost of the index

Measured on the same 1M-row benchmark database. Inserting 100,000 clicks in one statement (random timestamps, skewed codes), median of 3 runs:

| Index | Insert 100k clicks | Rows/sec | Index size vs table size |
|---|---|---|---|
| No | 1,021 ms | 97,960 | n/a |
| Yes | 1,684 ms | 59,388 | 60% (index 30 MB, table 50 MB) |

The index makes bulk inserts about 1.65x slower, roughly 6.6 µs extra per row.

Clicks are written far more often than stats are read, so the index is a deliberate trade: a small per-insert cost to keep stats queries from scaling with total table size, which the requirement "stats stay fast at huge scale" demands. On total work, break-even is about one stats query per 3,000 clicks. If click writes ever become the bottleneck, batching inserts or a stored rollup are the next options.

Caveats: this was a bulk insert, not per-request inserts (where network and commit time dominate), and the random timestamps likely overstate the cost compared with real, time-ordered clicks.

## Testing

Integration tests (Vitest + supertest) run against a separate real Postgres test database, because the constraints and queries are what is being tested. 17 tests cover:

- create validation (invalid URL, missing URL, invalid `expires_at`)
- redirect, and 404 for an unknown code
- expired code returns 404 and logs no click
- collision retry (the generator returns an already-taken code first, and create still succeeds)
- stats: total, counts after a redirect, `period=today` with a click from two days ago, and the month 10 / month 11 boundary (clicks at `23:59:59+08` and `00:00:00+08`)
- validation rejects (bad period, year, month)

```bash
npm test
```

## Running locally

1. Create a Postgres database and run the migration SQL above against it.
2. Set `DATABASE_URL` (for example `postgres://localhost/url_shortener`). `TRUST_PROXY_HOPS` defaults to 0 locally.
3. `npm install`, then start the server with your dev script (`npm run dev`).

Benchmark scripts and raw `EXPLAIN` outputs are in `scripts/bench/`.

## Not built

Auth and link ownership, custom aliases, per-day breakdowns, geo and IP analytics, a cache layer, a click-count rollup.
