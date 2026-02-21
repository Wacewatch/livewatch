#!/usr/bin/env node

/**
 * Script to trigger initial Delta synchronization
 * This populates the database with Delta channels and countries
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
const CRON_SECRET = process.env.CRON_SECRET

if (!CRON_SECRET) {
  console.error("❌ CRON_SECRET environment variable is not set")
  process.exit(1)
}

console.log("🚀 Triggering Delta synchronization...")
console.log("📍 URL:", `${SITE_URL}/api/delta/sync`)

try {
  const response = await fetch(`${SITE_URL}/api/delta/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CRON_SECRET}`,
    },
  })

  const data = await response.json()

  if (response.ok) {
    console.log("✅ Synchronization successful!")
    console.log("📊 Results:")
    console.log(`   - Countries: ${data.countries || 0}`)
    console.log(`   - Channels: ${data.channels || 0}`)
    console.log(`   - Total: ${data.data?.totalChannels || 0} channels`)
    console.log(`   - Countries: ${data.data?.totalCountries || 0} countries`)
  } else {
    console.error("❌ Synchronization failed:")
    console.error(JSON.stringify(data, null, 2))
    process.exit(1)
  }
} catch (error) {
  console.error("❌ Error:", error.message)
  process.exit(1)
}
