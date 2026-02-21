-- Force delete ALL Delta data using WHERE 1=1 which always matches
DELETE FROM delta_channels WHERE 1=1;
DELETE FROM delta_countries WHERE 1=1;
