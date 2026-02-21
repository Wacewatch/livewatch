#!/usr/bin/env python3
"""
Simple script to populate Delta tables (delta_channels and delta_countries)
Fetches data from VAVOO API and inserts into Supabase - does NOT touch Alpha tables
"""

import os
import sys
import json
import requests
from supabase import create_client, Client

# Supabase connection
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("ERROR: Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("=== Delta Synchronization ===")
print("Fetching data from VAVOO API...")

# Step 1: Get addon signature (token)
print("\n1. Getting VAVOO token...")
ping_response = requests.post("https://newm3u.vavoo.to/api/addon/ping", json={})
sig = ping_response.json().get("addonSig")
print(f"   Token: {sig[:20]}...")

# Step 2: Fetch all channels with pagination
print("\n2. Fetching channels from VAVOO catalog...")
all_channels = []
cursor = None
page = 0

while True:
    page += 1
    payload = {"addonSig": sig}
    if cursor:
        payload["cursor"] = cursor
    
    response = requests.post("https://newm3u.vavoo.to/api/addon/catalog", json=payload)
    data = response.json()
    
    channels = data.get("data", [])
    all_channels.extend(channels)
    print(f"   Page {page}: {len(channels)} channels (Total: {len(all_channels)})")
    
    cursor = data.get("cursor")
    if not cursor:
        break

print(f"\n   ✓ Fetched {len(all_channels)} total channels")

# Step 3: Extract unique countries
print("\n3. Extracting countries...")
country_map = {
    "Arabic": "arabia",
    "Balkans": "balkans",
    "Bulgaria": "bulgaria",
    "France": "france",
    "Germany": "germany",
    "Italy": "italy",
    "Netherlands": "netherlands",
    "Poland": "poland",
    "Portugal": "portugal",
    "Romania": "romania",
    "Russia": "russia",
    "Spain": "spain",
    "Turkey": "turkey",
    "Albania": "albania"
}

country_set = set()
for channel in all_channels:
    if "country" in channel and channel["country"]:
        country_set.add(channel["country"])

countries = []
for country_name in sorted(country_set):
    country_id = country_map.get(country_name, country_name.lower().replace(" ", "-"))
    countries.append({
        "id": country_id,
        "name": country_name
    })

print(f"   ✓ Found {len(countries)} countries: {[c['name'] for c in countries]}")

# Step 4: Prepare channels for database
print("\n4. Preparing channels for database...")
db_channels = []
for channel in all_channels:
    db_channels.append({
        "id": channel.get("_id"),
        "name": channel.get("name", ""),
        "clean_name": channel.get("name", "").replace(" ", "").replace("+", "Plus").lower(),
        "logo": channel.get("image", ""),
        "url": "",  # Will be resolved on playback
        "country": channel.get("country", "")
    })

print(f"   ✓ Prepared {len(db_channels)} channels")

# Step 5: Clear existing Delta data (NOT Alpha!)
print("\n5. Clearing existing Delta data...")
supabase.table("delta_channels").delete().neq("id", "xxxxx-impossible").execute()
supabase.table("delta_countries").delete().neq("id", "xxxxx-impossible").execute()
print("   ✓ Cleared delta_channels and delta_countries")

# Step 6: Insert countries into delta_countries
print("\n6. Inserting countries into delta_countries...")
supabase.table("delta_countries").insert(countries).execute()
print(f"   ✓ Inserted {len(countries)} countries")

# Step 7: Insert channels into delta_channels (in batches)
print("\n7. Inserting channels into delta_channels...")
batch_size = 1000
for i in range(0, len(db_channels), batch_size):
    batch = db_channels[i:i + batch_size]
    supabase.table("delta_channels").insert(batch).execute()
    print(f"   Batch {i // batch_size + 1}/{(len(db_channels) + batch_size - 1) // batch_size} inserted ({len(batch)} channels)")

print(f"\n✓ SUCCESS! Inserted {len(db_channels)} Delta channels and {len(countries)} countries")
print("Delta tables are now populated!")
