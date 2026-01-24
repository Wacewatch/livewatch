-- Add Source 4 (Vavoo) to source config
DO $$
BEGIN
  -- Check if source_config already exists
  IF EXISTS (SELECT 1 FROM app_config WHERE key = 'source_config') THEN
    -- Update existing config to add source4_enabled
    UPDATE app_config
    SET value = jsonb_set(
      COALESCE(value, '{}'::jsonb),
      '{source4_enabled}',
      'true'::jsonb
    ),
    updated_at = NOW()
    WHERE key = 'source_config';
  ELSE
    -- Create new config with all sources
    INSERT INTO app_config (key, value)
    VALUES ('source_config', '{"source1_enabled": true, "source2_enabled": true, "source3_enabled": true, "source4_enabled": true}');
  END IF;
END $$;
