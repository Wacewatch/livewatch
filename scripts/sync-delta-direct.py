#!/usr/bin/env python3
"""Direct Delta synchronization - bypasses API and writes directly to Supabase"""
import os
import sys
import json
import time
from datetime import datetime

try:
    from supabase import create_client, Client
    import requests
except ImportError:
    print("Installing required packages...")
    os.system(f"{sys.executable} -m pip install -q supabase requests")
    from supabase import create_client, Client
    import requests

# Supabase connection
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("🚀 Starting Direct Delta Synchronization")
print("=" * 60)

# Step 1: DELETE ALL existing data
print("\n📦 Step 1/4: Clearing existing data...")
try:
    # Delete all channels
    result = supabase.table("delta_channels").delete().neq("id", "").execute()
    print(f"   ✓ Cleared delta_channels table")
    
    # Delete all countries
    result = supabase.table("delta_countries").delete().neq("id", "").execute()
    print(f"   ✓ Cleared delta_countries table")
except Exception as e:
    print(f"   ⚠ Clear error (may be empty): {e}")

# Step 2: Get VAVOO token
print("\n🔐 Step 2/4: Getting VAVOO token...")
ping_url = "https://www.lokke.app/api/app/ping"
payload = {
    "reason": "app-focus",
    "locale": "en",
    "hasAddon": True,
    "version": "3.1.8"
}
response = requests.post(ping_url, json=payload, timeout=15)
token = response.json().get("addonSig")
if not token:
    print("❌ Failed to get token")
    sys.exit(1)
print(f"   ✓ Token obtained: {token[:20]}...")

# Step 3: Fetch all channels
print("\n📥 Step 3/4: Fetching channels from VAVOO...")
catalog_url = "https://vavoo.to/mediahubmx-catalog.json"
headers = {
    "mediahubmx-signature": token,
    "Accept-Language": "en",
    "Content-Type": "application/json"
}

all_channels = []
cursor = None
page = 1

while True:
    payload = {
        "language": "en",
        "region": "US",
        "catalogId": "iptv",
        "id": "iptv",
        "adult": False,
        "cursor": cursor,
        "clientVersion": "3.0.2"
    }
    
    response = requests.post(catalog_url, json=payload, headers=headers, timeout=30)
    data = response.json()
    items = data.get("items", [])
    
    if not items:
        break
    
    for item in items:
        if item.get("type") == "iptv":
            group = item.get("group", "")
            country = group.split("➾")[0].strip() if "➾" in group else group.split("->")[0].strip() if "->" in group else group
            if not country:
                country = "default"
            
            all_channels.append({
                "id": item["ids"]["id"],
                "name": item.get("name", ""),
                "url": item.get("url", ""),
                "logo": item.get("logo", ""),
                "country": country,
                "group": group,
                "genre": "",
                "quality": ""
            })
    
    print(f"   Page {page}: {len(items)} channels (total: {len(all_channels)})")
    cursor = data.get("nextCursor")
    if not cursor:
        break
    page += 1
    time.sleep(0.5)

print(f"\n   ✓ Total channels fetched: {len(all_channels)}")

# Step 4: Insert into database
print("\n💾 Step 4/4: Inserting into database...")

# Extract and insert countries
countries_set = set()
for ch in all_channels:
    if ch["country"] and ch["country"] != "default":
        countries_set.add(ch["country"])

countries_list = sorted(list(countries_set))
print(f"   Found {len(countries_list)} countries")

country_flags = {
    "France": "🇫🇷", "Italy": "🇮🇹", "Spain": "🇪🇸", "Germany": "🇩🇪",
    "Netherlands": "🇳🇱", "Portugal": "🇵🇹", "Poland": "🇵🇱", "Turkey": "🇹🇷"
}

countries_data = []
for country_name in countries_list:
    country_id = country_name.lower().replace(" ", "-")
    countries_data.append({
        "id": country_id,
        "name": country_name,
        "flag": country_flags.get(country_name, "🌍"),
        "enabled": True,
        "channel_count": 0
    })

try:
    result = supabase.table("delta_countries").insert(countries_data).execute()
    print(f"   ✓ Inserted {len(countries_data)} countries")
except Exception as e:
    print(f"   ❌ Countries insert error: {e}")
    sys.exit(1)

# Insert channels in batches
print(f"   Inserting {len(all_channels)} channels in batches...")
batch_size = 1000
inserted = 0

for i in range(0, len(all_channels), batch_size):
    batch = all_channels[i:i + batch_size]
    try:
        result = supabase.table("delta_channels").insert(batch).execute()
        inserted += len(batch)
        print(f"   ✓ Batch {i//batch_size + 1}: {inserted}/{len(all_channels)} channels")
    except Exception as e:
        print(f"   ❌ Batch {i//batch_size + 1} error: {e}")
        break

print("\n" + "=" * 60)
print(f"✅ SYNC COMPLETE!")
print(f"   Countries: {len(countries_data)}")
print(f"   Channels: {inserted}")
print("=" * 60)
