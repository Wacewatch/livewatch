-- Table pour stocker les sources proxy personnalisées
CREATE TABLE IF NOT EXISTS custom_proxy_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  proxy_url VARCHAR(1000) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour trier par ordre
CREATE INDEX IF NOT EXISTS idx_custom_proxy_sources_sort ON custom_proxy_sources(sort_order, enabled);

-- Insérer des exemples
INSERT INTO custom_proxy_sources (name, proxy_url, description, enabled, sort_order)
VALUES 
  ('Proxy VPS Principal', 'https://votre-vps.com/proxy.php?url=', 'Proxy PHP principal sur VPS', false, 1)
ON CONFLICT DO NOTHING;
