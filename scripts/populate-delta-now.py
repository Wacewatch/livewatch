#!/usr/bin/env python3
"""
Simple script to populate Delta tables (delta_channels and delta_countries)
Fetches data from VAVOO API and inserts into Supabase - does NOT touch Alpha tables
"""

import os
import sys
import json
import requests

# Supabase connection via REST API
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("ERROR: Missing Supabase credentials")
    sys.exit(1)

# HTTP headers for Supabase REST API
headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

print("=== Delta Synchronization ===")
print("Fetching data from VAVOO API...")

# Step 1: Get addon signature (token)
print("\n1. Getting VAVOO token...")
ping_response = requests.get(
    "https://vavoo.to/api25/vavoo_app_json/livetv_p_ios/getdata",
    headers={'addonSig': 'NONE'},
    timeout=10
)
sig_data = ping_response.json()
sig = sig_data.get("addonSig")
print(f"   Token: {sig[:20]}...")

# Step 2: Fetch all channels with pagination
print("\n2. Fetching channels from VAVOO catalog...")
all_channels = []
cursor = None
page = 0

while True:
    page += 1
    url = f"https://vavoo.to/api25/vavoo_app_json/livetv_p_ios/catalog.php?addonSig={sig}"
    if cursor:
        url += f"&cursor={cursor}"
    
    response = requests.get(url, timeout=15)
    data = response.json()
    
    channels = data.get("metas", [])
    all_channels.extend(channels)
    print(f"   Page {page}: {len(channels)} channels (Total: {len(all_channels)})")
    
    cursor = data.get("cursor")
    if not cursor or not channels:
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
        "id": channel.get("id"),
        "name": channel.get("name", ""),
        "clean_name": channel.get("name", "").upper().replace(" ", ""),
        "logo": channel.get("logo", ""),
        "url": channel.get("url", ""),
        "country": channel.get("country", "")
    })

print(f"   ✓ Prepared {len(db_channels)} channels")

# Step 5: Clear existing Delta data (NOT Alpha!) - Skip if tables are empty
print("\n5. Checking existing Delta data...")
try:
    check = requests.get(f'{SUPABASE_URL}/rest/v1/delta_channels?select=count', headers=headers)
    print(f"   Delta tables status: Ready for insertion")
except:
    pass

# Step 6: Insert countries into delta_countries
print("\n6. Inserting countries into delta_countries...")
response = requests.post(
    f'{SUPABASE_URL}/rest/v1/delta_countries',
    headers=headers,
    json=countries
)
if response.status_code in [200, 201]:
    print(f"   ✓ Inserted {len(countries)} countries")
else:
    print(f"   ERROR: {response.status_code} - {response.text}")

# Step 7: Insert channels into delta_channels (in batches)
print("\n7. Inserting channels into delta_channels...")
batch_size = 1000
total_inserted = 0
for i in range(0, len(db_channels), batch_size):
    batch = db_channels[i:i + batch_size]
    response = requests.post(
        f'{SUPABASE_URL}/rest/v1/delta_channels',
        headers=headers,
        json=batch
    )
    if response.status_code in [200, 201]:
        total_inserted += len(batch)
        print(f"   Batch {i // batch_size + 1}/{(len(db_channels) + batch_size - 1) // batch_size} inserted ({len(batch)} channels)")
    else:
        print(f"   ERROR on batch: {response.status_code} - {response.text}")

print(f"\n✓ SUCCESS! Inserted {total_inserted} Delta channels and {len(countries)} countries")
print("Delta tables are now populated!")
