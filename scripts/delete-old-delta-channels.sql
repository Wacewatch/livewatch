-- Delete old Delta channels that are preventing sync
DELETE FROM delta_channels WHERE id IN (
  SELECT id FROM delta_channels ORDER BY created_at DESC OFFSET 0
);
