-- COM-Unity: evidența confirmărilor la înregistrare
-- Aplicare manuală, numai după verificarea bazei D1 țintă.
CREATE TABLE IF NOT EXISTS registration_acceptances (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  terms_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  age_confirmed INTEGER NOT NULL CHECK (age_confirmed IN (0, 1)),
  privacy_acknowledged INTEGER NOT NULL CHECK (privacy_acknowledged IN (0, 1)),
  accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_registration_acceptances_accepted_at
  ON registration_acceptances(accepted_at);
