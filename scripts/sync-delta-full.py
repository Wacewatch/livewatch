#!/usr/bin/env python3
"""
Trigger immediate Delta synchronization
Fetches all channels and countries from VAVOO and inserts into Supabase
"""
import os
import sys
import requests
import time

def trigger_sync():
    # Get the deployed app URL from environment or use default
    base_url = os.environ.get('VERCEL_URL', 'http://localhost:3000')
    if not base_url.startswith('http'):
        base_url = f'https://{base_url}'
    
    sync_url = f'{base_url}/api/delta/sync'
    
    print(f"[v0] Triggering Delta sync at {sync_url}")
    print("[v0] This will take several minutes to fetch ~8000+ channels...")
    
    try:
        # Use a long timeout since this can take 5+ minutes
        response = requests.post(
            sync_url,
            headers={'Content-Type': 'application/json'},
            timeout=600  # 10 minute timeout
        )
        
        print(f"[v0] Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"[v0] ✓ Sync completed successfully!")
            print(f"[v0]   Countries: {data.get('countries_count', 0)}")
            print(f"[v0]   Channels: {data.get('channels_count', 0)}")
            print(f"[v0]   Duration: {data.get('duration_seconds', 0)}s")
            return 0
        else:
            print(f"[v0] ✗ Sync failed: {response.text}")
            return 1
            
    except requests.exceptions.Timeout:
        print("[v0] ✗ Request timed out - sync may still be running in background")
        print("[v0]   Check the admin dashboard to verify sync status")
        return 1
    except Exception as e:
        print(f"[v0] ✗ Error: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(trigger_sync())
