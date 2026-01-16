-- Table pour gérer les pays
CREATE TABLE IF NOT EXISTS countries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour le système de proxy rotatif
CREATE TABLE IF NOT EXISTS proxy_pool (
  id SERIAL PRIMARY KEY,
  proxy_url TEXT NOT NULL UNIQUE,
  protocol TEXT NOT NULL DEFAULT 'http',
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  country TEXT,
  anonymity_level TEXT,
  speed_ms INTEGER,
  success_rate DECIMAL(5,2) DEFAULT 100.00,
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ,
  times_used INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les logs d'utilisation des proxies
CREATE TABLE IF NOT EXISTS proxy_usage_logs (
  id SERIAL PRIMARY KEY,
  proxy_id INTEGER REFERENCES proxy_pool(id) ON DELETE CASCADE,
  channel_id TEXT,
  success BOOLEAN,
  response_time_ms INTEGER,
  error_message TEXT,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour la configuration du proxy rotatif
CREATE TABLE IF NOT EXISTS proxy_config (
  id SERIAL PRIMARY KEY,
  git_url TEXT NOT NULL,
  update_interval_minutes INTEGER DEFAULT 30,
  last_update TIMESTAMPTZ,
  auto_update_enabled BOOLEAN DEFAULT true,
  min_success_rate DECIMAL(5,2) DEFAULT 70.00,
  max_response_time_ms INTEGER DEFAULT 5000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter quelques pays par défaut
INSERT INTO countries (id, name, enabled) VALUES
  ('FR', 'France', true),
  ('US', 'États-Unis', true),
  ('UK', 'Royaume-Uni', true),
  ('DE', 'Allemagne', true),
  ('ES', 'Espagne', true),
  ('IT', 'Italie', true),
  ('BE', 'Belgique', true),
  ('CA', 'Canada', true)
ON CONFLICT (id) DO NOTHING;

-- Configuration par défaut du proxy rotatif
INSERT INTO proxy_config (git_url, update_interval_minutes, auto_update_enabled)
VALUES ('https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt', 30, true)
ON CONFLICT DO NOTHING;

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_proxy_pool_active ON proxy_pool(is_active, success_rate DESC, speed_ms ASC);
CREATE INDEX IF NOT EXISTS idx_proxy_pool_last_used ON proxy_pool(last_used NULLS FIRST);
CREATE INDEX IF NOT EXISTS idx_proxy_usage_logs_proxy_id ON proxy_usage_logs(proxy_id);
CREATE INDEX IF NOT EXISTS idx_countries_enabled ON countries(enabled);

COMMIT;
