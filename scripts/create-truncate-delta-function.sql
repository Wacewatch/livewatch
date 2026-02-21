-- Function to truncate delta tables for clean sync
CREATE OR REPLACE FUNCTION truncate_delta_channels()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  TRUNCATE TABLE delta_channels RESTART IDENTITY CASCADE;
END;
$$;

CREATE OR REPLACE FUNCTION truncate_delta_countries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  TRUNCATE TABLE delta_countries RESTART IDENTITY CASCADE;
END;
$$;
