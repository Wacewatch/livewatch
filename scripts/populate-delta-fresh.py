#!/usr/bin/env python3
"""Populate Delta tables ONLY - does NOT touch Alpha tables"""
import os, sys, requests

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing Supabase credentials"); sys.exit(1)

headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}

print("=== DELTA POPULATION ===\n")
print("[1/4] Getting VAVOO token...")
r = requests.get("https://vavoo.to/api25/vavoo_app_json/livetv_p_ios/getdata", headers={'addonSig':'NONE'}, timeout=10)
sig = r.json().get("addonSig")
print(f"✓ Token: {sig[:20]}...\n")

print("[2/4] Fetching channels...")
all_channels, cursor, page = [], None, 0
while True:
    page += 1
    url = f"https://vavoo.to/api25/vavoo_app_json/livetv_p_ios/catalog.php?addonSig={sig}"
    if cursor: url += f"&cursor={cursor}"
    r = requests.get(url, timeout=15)
    data = r.json()
    channels = data.get("metas", [])
    all_channels.extend(channels)
    print(f"  Page {page}: {len(channels)} channels (Total: {len(all_channels)})")
    cursor = data.get("cursor")
    if not cursor or not channels: break
print(f"✓ Fetched {len(all_channels)} channels\n")

print("[3/4] Processing countries...")
country_map = {"Arabic":"arabia","Balkans":"balkans","Bulgaria":"bulgaria","France":"france","Germany":"germany","Italy":"italy","Netherlands":"netherlands","Poland":"poland","Portugal":"portugal","Romania":"romania","Russia":"russia","Spain":"spain","Turkey":"turkey","Albania":"albania"}
country_set = set(ch.get("country") for ch in all_channels if ch.get("country"))
countries = [{"id":country_map.get(name,name.lower().replace(" ","-")),"name":name} for name in sorted(country_set)]
print(f"✓ Found {len(countries)} countries: {[c['name'] for c in countries]}\n")

db_channels = []
for ch in all_channels:
    db_channels.append({"id":ch.get("id"),"name":ch.get("name",""),"clean_name":ch.get("name","").upper().replace(" ",""),"logo":ch.get("logo",""),"url":ch.get("url",""),"country":ch.get("country","")})
print(f"✓ Prepared {len(db_channels)} channels\n")

print("[4/4] Inserting into database...")
print("  -> delta_countries...")
r = requests.post(f'{SUPABASE_URL}/rest/v1/delta_countries', headers=headers, json=countries)
if r.status_code in [200,201]: print(f"  ✓ {len(countries)} countries inserted")
else: print(f"  ERROR: {r.status_code} - {r.text}")

print("  -> delta_channels (batches of 1000)...")
batch_size, total = 1000, 0
for i in range(0, len(db_channels), batch_size):
    batch = db_channels[i:i+batch_size]
    r = requests.post(f'{SUPABASE_URL}/rest/v1/delta_channels', headers=headers, json=batch)
    if r.status_code in [200,201]:
        total += len(batch)
        print(f"    Batch {i//batch_size+1}: {len(batch)} channels inserted ({total}/{len(db_channels)})")
    else: print(f"    ERROR: {r.status_code}")

print(f"\n✓ SUCCESS! Delta tables populated with {total} channels and {len(countries)} countries!")
