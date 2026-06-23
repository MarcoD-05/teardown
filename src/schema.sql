CREATE TABLE IF NOT EXISTS reviews (
  id             SERIAL PRIMARY KEY,
  document       TEXT NOT NULL,
  verdict        TEXT NOT NULL,
  summary        TEXT,
  raw_reviews    JSONB,
  open_questions JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS findings (
  id         SERIAL PRIMARY KEY,
  review_id  INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  severity   TEXT NOT NULL,
  issue      TEXT NOT NULL,
  raised_by  JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);