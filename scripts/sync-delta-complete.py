#!/usr/bin/env python3
"""
Trigger complete Delta synchronization
Fetches all channels from VAVOO API and populates database
"""

import urllib.request
import urllib.error
import json
import os
import time

def trigger_sync():
    """Trigger the Delta sync endpoint"""
    
    # Get the deployment URL
    vercel_url = os.getenv("VERCEL_URL")
    if vercel_url:
        base_url = f"https://{vercel_url}"
    else:
        base_url = "http://localhost:3000"
    
    sync_url = f"{base_url}/api/delta/sync"
    
    print(f"[Sync] Triggering Delta synchronization at {sync_url}")
    print("[Sync] This will fetch ALL channels from VAVOO API (may take 5-10 minutes)...")
    
    try:
        # Create request with POST method
        req = urllib.request.Request(sync_url, method="POST")
        req.add_header("Content-Type", "application/json")
        
        # Set long timeout for complete sync
        with urllib.request.urlopen(req, timeout=600) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                print("\n✓ Delta synchronization completed successfully!")
                print(f"  Countries: {data.get('countries', 'N/A')}")
                print(f"  Channels: {data.get('channels', 'N/A')}")
                print(f"  Message: {data.get('message', 'N/A')}")
                return True
            else:
                print(f"\n✗ Sync failed with status: {response.status}")
                return False
                
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else "No error body"
        print(f"\n✗ HTTP Error {e.code}: {e.reason}")
        print(f"  Details: {error_body}")
        return False
        
    except urllib.error.URLError as e:
        print(f"\n✗ URL Error: {e.reason}")
        return False
        
    except Exception as e:
        print(f"\n✗ Unexpected error: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("DELTA COMPLETE SYNCHRONIZATION")
    print("=" * 60)
    print()
    
    success = trigger_sync()
    
    print()
    print("=" * 60)
    if success:
        print("STATUS: SYNC COMPLETED")
    else:
        print("STATUS: SYNC FAILED")
    print("=" * 60)
