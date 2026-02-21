-- Delete all Delta channels and countries for clean sync
DELETE FROM delta_channels WHERE id IS NOT NULL OR id IS NULL;
DELETE FROM delta_countries WHERE id IS NOT NULL OR id IS NULL;
