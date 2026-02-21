// fetch is global in Node.js 18+
async function triggerSync() {
  console.log('[Sync] Starting Delta synchronization...');
  console.log('[Sync] This will take 2-5 minutes to fetch ~8000 channels from VAVOO API');
  
  const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.error('[Sync] ERROR: CRON_SECRET environment variable not set');
    process.exit(1);
  }
  
  try {
    const response = await fetch(`${apiUrl}/api/delta/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Sync] ERROR:', response.status, errorText);
      process.exit(1);
    }
    
    const result = await response.json();
    
    console.log('[Sync] ✓ Synchronization complete!');
    console.log('[Sync] Countries:', result.totalCountries);
    console.log('[Sync] Channels:', result.totalChannels);
    console.log('[Sync] Duration:', result.duration);
    
  } catch (error) {
    console.error('[Sync] ERROR:', error.message);
    process.exit(1);
  }
}

triggerSync();
