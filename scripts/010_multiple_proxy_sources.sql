-- Add support for multiple Git proxy sources
ALTER TABLE proxy_config ADD COLUMN IF NOT EXISTS git_urls TEXT[] DEFAULT ARRAY['https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt'];
-- Keep git_url for backwards compatibility but deprecate it
UPDATE proxy_config SET git_urls = ARRAY[git_url] WHERE git_urls IS NULL AND git_url IS NOT NULL;

COMMIT;
