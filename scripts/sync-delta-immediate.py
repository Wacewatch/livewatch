#!/usr/bin/env python3
"""
Immediate Delta synchronization - Populate database with all channels
This will take several minutes due to the large number of channels (~8000+)
"""

import urllib.request
import urllib.error
import json
import os

def sync_delta():
    """Trigger Delta sync via API"""
    print("🔄 Starting Delta synchronization...")
    print("⏳ This will take several minutes to fetch and insert ~8000+ channels...")
    
    # Get the base URL
    base_url = os.environ.get('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
    if 'localhost' not in base_url:
        # Use the deployed URL
        sync_url = f"{base_url}/api/delta/sync"
    else:
        # Fallback to project URL
        sync_url = "https://v0-tvchannelstreamer11-ki5l0wyyg-tesrys-projects.vercel.app/api/delta/sync"
    
    try:
        print(f"📡 Calling sync API: {sync_url}")
        
        req = urllib.request.Request(
            sync_url,
            method='GET',
            headers={
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        )
        
        with urllib.request.urlopen(req, timeout=600) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            if data.get('success'):
                print(f"✅ Sync completed successfully!")
                print(f"   - Countries: {data.get('countries', 0)}")
                print(f"   - Channels: {data.get('channels', 0)}")
                return True
            else:
                print(f"❌ Sync failed: {data.get('error', 'Unknown error')}")
                return False
                
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else 'No details'
        print(f"❌ HTTP Error {e.code}: {error_body}")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = sync_delta()
    exit(0 if success else 1)
