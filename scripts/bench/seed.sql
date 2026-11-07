WITH r AS (
    SELECT i, substr(md5(random()::text), 1, 7) AS code
    FROM generate_series(1, 12000) AS i
),
d AS (
    SELECT DISTINCT ON (code) code, i
    FROM r
)
INSERT INTO codes (code, url)
SELECT code, 'https://example.com/' || i
FROM d
LIMIT 10000;

INSERT INTO clicks (code_id, created_at)
SELECT 1 + floor(10000 * random() ^ 3)::int,
       now() - (random() * INTERVAL '12 months')
FROM generate_series(1, 1000000);

VACUUM ANALYZE codes;
VACUUM ANALYZE clicks;
