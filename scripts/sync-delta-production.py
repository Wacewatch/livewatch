#!/usr/bin/env python3
"""
Delta Synchronization - Production
Triggers the sync endpoint on the deployed Vercel application
"""

import urllib.request
import json
import sys

# Get the production URL from environment or use default
PRODUCTION_URL = "https://v0-tvchannelstreamer11-ki5l0wygg-tesrys-projects.vercel.app"
SYNC_ENDPOINT = f"{PRODUCTION_URL}/api/delta/sync"

print("=" * 60)
print("DELTA PRODUCTION SYNCHRONIZATION")
print("=" * 60)
print()

print(f"[Sync] Triggering Delta synchronization at {SYNC_ENDPOINT}")
print("[Sync] Fetching all channels from VAVOO API (may take 5-10 minutes)...")
print()

try:
    # Make POST request to sync endpoint
    req = urllib.request.Request(
        SYNC_ENDPOINT,
        method='POST',
        headers={
            'Content-Type': 'application/json'
        }
    )
    
    with urllib.request.urlopen(req, timeout=600) as response:
        result = json.loads(response.read().decode())
        
        print("=" * 60)
        print("STATUS: SYNC COMPLETED SUCCESSFULLY")
        print("=" * 60)
        print()
        print(f"Countries synced: {result.get('countriesCount', 0)}")
        print(f"Channels synced: {result.get('channelsCount', 0)}")
        print()
        
        sys.exit(0)
        
except urllib.error.HTTPError as e:
    error_body = e.read().decode()
    print(f"✗ HTTP Error {e.code}: {error_body}")
    sys.exit(1)
    
except urllib.error.URLError as e:
    print(f"✗ URL Error: {e.reason}")
    sys.exit(1)
    
except Exception as e:
    print(f"✗ Unexpected error: {str(e)}")
    sys.exit(1)
