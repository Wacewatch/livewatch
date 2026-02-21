#!/usr/bin/env python3
"""
Trigger immediate Delta synchronization
"""
import os
import requests
import sys

def trigger_sync():
    """Trigger the Delta sync API endpoint"""
    
    # Get base URL and CRON_SECRET from environment
    base_url = os.getenv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')
    cron_secret = os.getenv('CRON_SECRET')
    
    if not cron_secret:
        print("Error: CRON_SECRET environment variable not set")
        sys.exit(1)
    
    url = f"{base_url}/api/delta/sync"
    headers = {
        'Authorization': f'Bearer {cron_secret}',
        'Content-Type': 'application/json'
    }
    
    print(f"Triggering Delta sync at {url}...")
    
    try:
        response = requests.post(url, headers=headers, timeout=300)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Sync successful!")
            print(f"  Countries: {data.get('countries', 0)}")
            print(f"  Channels: {data.get('channels', 0)}")
            print(f"  Timestamp: {data.get('timestamp', 'N/A')}")
        else:
            print(f"✗ Sync failed with status {response.status_code}")
            print(f"  Response: {response.text}")
            sys.exit(1)
    
    except requests.exceptions.Timeout:
        print("✗ Request timed out after 5 minutes")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    trigger_sync()
