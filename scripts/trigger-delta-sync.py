#!/usr/bin/env python3

import os
import urllib.request
import json
import sys

def trigger_sync():
    print('[Sync] Starting Delta synchronization...')
    print('[Sync] This will take 2-5 minutes to fetch ~8000 channels from VAVOO API')
    
    api_url = os.environ.get('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')
    cron_secret = os.environ.get('CRON_SECRET')
    
    if not cron_secret:
        print('[Sync] ERROR: CRON_SECRET environment variable not set')
        sys.exit(1)
    
    try:
        url = f'{api_url}/api/delta/sync'
        headers = {
            'Authorization': f'Bearer {cron_secret}',
            'Content-Type': 'application/json',
        }
        
        req = urllib.request.Request(url, method='POST', headers=headers)
        
        print(f'[Sync] Calling {url}...')
        
        with urllib.request.urlopen(req, timeout=300) as response:
            result = json.loads(response.read().decode())
            
            print('[Sync] ✓ Synchronization complete!')
            print(f'[Sync] Countries: {result.get("totalCountries", 0)}')
            print(f'[Sync] Channels: {result.get("totalChannels", 0)}')
            print(f'[Sync] Duration: {result.get("duration", "N/A")}')
            
    except urllib.error.HTTPError as e:
        error_text = e.read().decode()
        print(f'[Sync] ERROR: {e.code} {error_text}')
        sys.exit(1)
    except Exception as e:
        print(f'[Sync] ERROR: {str(e)}')
        sys.exit(1)

if __name__ == '__main__':
    trigger_sync()
