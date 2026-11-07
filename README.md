# URL Shortener

A small anonymous URL shortener API built to practice schema design, database constraints, and index-driven performance. Submit a long URL, get a short code back, visit the code to be redirected, and look up how many times a code was visited.

**Live:** TODO (deployed URL)

## Stack

TypeScript, Express 5, PostgreSQL (`pg`, raw SQL, no ORM), zod, pino, Vitest + supertest, `express-rate-limit`. TODO: confirm this list matches `package.json`.

## API

| Method | Path | Description |
|---|---|---|
| POST | `/api/code` | Create a short code. Body: `{ "url": "https://...", "expires_at": <1-31> }` (`expires_at` optional). Returns `{ code, expires_at }`. |
| GET | `/api/code/:code` | Redirects (302) to the original URL and logs a click. 404 for unknown, inactive or expired codes. |
| GET | `/api/code/:code/stats` | Returns `{ count }`. Optional query: `period=today\|week\|month`, or `year` and `month` for a specific month. |

TODO: confirm the exact `period` values and what `expires_at` means (days from now?).

Only `http` and `https` URLs are accepted. Anything else (such as `javascript:`) is rejected with 400.

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

TODO: replace this block with the real migration so the README matches it exactly.

## Design decisions

- **Each submission gets its own code.** Submitting the same URL twice gives two codes. A code's click history therefore belongs to exactly one purpose, and no stranger sees someone else's stats. There is no separate `url` table, so the address lives in one place and cannot drift.
- **Codes are random, 7 characters, alphanumeric,** from a cryptographically secure source (`crypto`). That is about 3.5 trillion possibilities, so they can't be guessed or enumerated.
- **The database guarantees uniqueness, not the app.** A check-then-insert has a gap where two simultaneous requests both see "free". The `UNIQUE` index rejects the second insert, and the create handler retries with a new code on Postgres error `23505`, up to 3 attempts. Other errors are not retried.
- **Clicks are an append-only log.** Counts and breakdowns are questions asked of the log. A counter column would lose history and race under concurrent visits.
- **Redirects use 302, not 301.** A 301 is cached by browsers, so repeat visits would never reach the server and would never be counted.
- **The click insert is awaited, and its failure is caught and logged.** The visitor is redirected even if the insert fails. This trades one extra database round trip for durability and bounded concurrency, instead of unbounded fire-and-forget inserts.
- **Stats return a total only,** with no per-day breakdown. This is a deliberate scope cut.
- **Time ranges are half-open** (`created_at >= start AND created_at < end`), so a click on a boundary instant belongs to exactly one range. Day, week and month boundaries use `Asia/Manila`. TODO: state whether "this week" is Monday-start calendar week or the last 7 days.
- **The unique index on `code` covers active codes only.** A deactivated code string could in theory be reissued. With random 7-character codes the chance is negligible. It would matter if custom aliases were added.
- **No auth and no list-all endpoint,** so there is no way to browse other people's links. Ownership would be the first thing auth adds.
- **Rate limiting:** TODO (limit and window, and what it protects).

## Performance

The stats query counts one code's clicks in a date range. Index `ix_click_code (code_id, created_at)` is sorted by code first, then time, so one code's clicks sit together in time order and a date range is a single contiguous slice.

**Benchmark setup:** separate database, 10,000 codes, 1,000,000 clicks spread over 12 months, skewed so a few codes are hot (`code_id = 1 + floor(10000 * random()^3)`). Local PostgreSQL, warm cache, 3 runs per case (median reported), `VACUUM ANALYZE` before measuring. The "no index" case is the same query on the same data with `ix_click_code` dropped. The app always runs with the index.

| Case | Rows counted | No index | With index | Pages touched (no index → index) |
|---|---|---|---|---|
| Hot code, 1 month | 761 | 20.6 ms (Parallel Seq Scan) | 0.25 ms (Index Only Scan) | 6,381 → ~10 |
| Hot code, 12 months | 45,479 | 47.4 ms | 7.7 ms | 6,381 → ~181 |
| Cold code, 1 month | 0 | 20.7 ms | 0.08 ms | 6,381 → ~6 |

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

TODO: fill in from the write-cost benchmark.

| Index | Insert 100k clicks | Rows/sec | Index size vs table size |
|---|---|---|---|
| No | TODO | TODO | n/a |
| Yes | TODO | TODO | TODO |

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

TODO: env vars (`DATABASE_URL`, port), how to run migrations, `npm run dev`.

## Not built

Auth and link ownership, custom aliases, per-day breakdowns, geo and IP analytics, a cache layer, a click-count rollup.
