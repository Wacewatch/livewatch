#!/usr/bin/env python3
"""
Check Delta table counts and perform full sync
"""
import os
import sys

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client

# Get Supabase credentials
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Missing Supabase credentials")
    sys.exit(1)

print("="*60)
print("DELTA TABLE CHECK AND SYNC")
print("="*60)

# Create Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Check current counts
print("\n[Check] Counting current rows...")
channels_response = supabase.table("delta_channels").select("id", count="exact").execute()
countries_response = supabase.table("delta_countries").select("id", count="exact").execute()

channels_count = channels_response.count if hasattr(channels_response, 'count') else len(channels_response.data)
countries_count = countries_response.count if hasattr(countries_response, 'count') else len(countries_response.data)

print(f"[Check] delta_channels: {channels_count} rows")
print(f"[Check] delta_countries: {countries_count} rows")

if channels_count > 0 or countries_count > 0:
    print(f"\n[Clean] Tables are NOT empty - deleting all rows...")
    
    # Delete all channels
    if channels_count > 0:
        print(f"[Clean] Deleting {channels_count} channels...")
        supabase.rpc("delete_all_delta_channels").execute()
        print("[Clean] ✓ Channels deleted")
    
    # Delete all countries  
    if countries_count > 0:
        print(f"[Clean] Deleting {countries_count} countries...")
        supabase.rpc("delete_all_delta_countries").execute()
        print("[Clean] ✓ Countries deleted")
        
    print("[Clean] ✓ Tables are now empty")
else:
    print("\n[Check] ✓ Tables are already empty")

print("\n[Sync] Triggering Delta synchronization...")
print("[Sync] This will fetch ~9500 channels from VAVOO API...")

# Call the sync API
import requests
sync_url = f"{SUPABASE_URL.replace('supabase.co', 'vercel.app')}/api/delta/sync"
response = requests.post(sync_url, timeout=600)

if response.status_code == 200:
    result = response.json()
    print(f"\n✓ Sync completed successfully!")
    print(f"  - Countries: {result.get('countries', 0)}")
    print(f"  - Channels: {result.get('channels', 0)}")
else:
    print(f"\n✗ Sync failed: {response.status_code}")
    print(response.text)
    sys.exit(1)
