\timing on

SELECT 'sizes_before' AS section;
SELECT pg_relation_size('clicks') AS clicks_table_bytes,
       pg_relation_size('ix_click_code') AS ix_click_code_bytes,
       pg_size_pretty(pg_relation_size('clicks')) AS clicks_table_pretty,
       pg_size_pretty(pg_relation_size('ix_click_code')) AS ix_click_code_pretty,
       pg_size_pretty(pg_relation_size('clicks') + pg_relation_size('ix_click_code')) AS total_pretty;

-- with index: 3 runs
\echo 'WITH_INDEX_RUN_1'
BEGIN;
INSERT INTO clicks (code_id, created_at)
SELECT 1 + floor(10000 * random() ^ 3)::int,
       now() - (random() * INTERVAL '12 months')
FROM generate_series(1, 100000);
ROLLBACK;

\echo 'WITH_INDEX_RUN_2'
BEGIN;
INSERT INTO clicks (code_id, created_at)
SELECT 1 + floor(10000 * random() ^ 3)::int,
       now() - (random() * INTERVAL '12 months')
FROM generate_series(1, 100000);
ROLLBACK;

\echo 'WITH_INDEX_RUN_3'
BEGIN;
INSERT INTO clicks (code_id, created_at)
SELECT 1 + floor(10000 * random() ^ 3)::int,
       now() - (random() * INTERVAL '12 months')
FROM generate_series(1, 100000);
ROLLBACK;

-- drop index
DROP INDEX ix_click_code;

-- without index: 3 runs
\echo 'WITHOUT_INDEX_RUN_1'
BEGIN;
INSERT INTO clicks (code_id, created_at)
SELECT 1 + floor(10000 * random() ^ 3)::int,
       now() - (random() * INTERVAL '12 months')
FROM generate_series(1, 100000);
ROLLBACK;

\echo 'WITHOUT_INDEX_RUN_2'
BEGIN;
INSERT INTO clicks (code_id, created_at)
SELECT 1 + floor(10000 * random() ^ 3)::int,
       now() - (random() * INTERVAL '12 months')
FROM generate_series(1, 100000);
ROLLBACK;

\echo 'WITHOUT_INDEX_RUN_3'
BEGIN;
INSERT INTO clicks (code_id, created_at)
SELECT 1 + floor(10000 * random() ^ 3)::int,
       now() - (random() * INTERVAL '12 months')
FROM generate_series(1, 100000);
ROLLBACK;

-- recreate and analyze
CREATE INDEX ix_click_code ON clicks (code_id, created_at);
VACUUM ANALYZE clicks;

SELECT 'sizes_after' AS section;
SELECT pg_relation_size('clicks') AS clicks_table_bytes,
       pg_relation_size('ix_click_code') AS ix_click_code_bytes,
       pg_size_pretty(pg_relation_size('clicks')) AS clicks_table_pretty,
       pg_size_pretty(pg_relation_size('ix_click_code')) AS ix_click_code_pretty,
       pg_size_pretty(pg_relation_size('clicks') + pg_relation_size('ix_click_code')) AS total_pretty;
