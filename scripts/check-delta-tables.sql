-- Check Delta tables row counts
SELECT 'delta_channels' as table_name, COUNT(*) as row_count FROM delta_channels
UNION ALL
SELECT 'delta_countries' as table_name, COUNT(*) as row_count FROM delta_countries;
