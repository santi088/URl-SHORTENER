CREATE TABLE codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days')
);

CREATE TABLE clicks (
    id BIGSERIAL PRIMARY KEY,
    code_id BIGINT NOT NULL REFERENCES codes(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- original index present in dev DB; drop for BEFORE measurement
CREATE INDEX ix_click_code ON clicks (code_id, created_at);
