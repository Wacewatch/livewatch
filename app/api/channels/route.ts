import { NextResponse } from "next/server"
import { VavooClient } from "@/lib/vavoo-client"
import { NagaClient } from "@/lib/naga-client"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get("country")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    console.log("[v0] Fetching channels...", { country, limit })

    // Get source configuration
    const supabase = await createClient()
    const { data: config } = await supabase
      .from("app_config")
      .select("naga_enabled, naga_default")
      .eq("key", "source_config")
      .single()

    const nagaEnabled = config?.naga_enabled !== false
    const nagaDefault = config?.naga_default === true

    console.log("[v0] Source config:", { nagaEnabled, nagaDefault })

    // Fetch from all enabled sources in parallel
    const fetchPromises: Promise<any>[] = []

    // Always fetch VAVOO
    const vavooPromise = (async () => {
      const vavooClient = new VavooClient()
      let channels: Record<string, string[]>

      if (country) {
        const groups = await vavooClient.getGroups()
        const countryGroups = groups.filter((g) => g.includes(country))
        channels = await vavooClient.getChannelsByGroups(countryGroups.slice(0, 5))
      } else {
        channels = await vavooClient.getAllChannels()
      }

      return Object.entries(channels).flatMap(([name, urls]) => {
        return urls.slice(0, 3).map((url, index) => ({
          id: `${name}-${index}`,
          name: name,
          url: url,
          country: country || "France",
          logo: `https://michaz1988.github.io/logos/${name.replace(/\s/g, "").toLowerCase()}.png`,
          source: "vavoo",
        }))
      })
    })()

    fetchPromises.push(vavooPromise)

    // Fetch Naga if enabled
    if (nagaEnabled) {
      const nagaPromise = (async () => {
        try {
          const nagaClient = new NagaClient()
          const nagaChannels = await nagaClient.getChannels()

          return nagaChannels.map((channel: any) => ({
            id: `naga-${channel.name}`,
            name: channel.name,
            url: "", // Naga doesn't use direct URLs
            country: channel.country || country || "France",
            logo: channel.logo || `https://michaz1988.github.io/logos/${channel.name.replace(/\s/g, "").toLowerCase()}.png`,
            source: "naga",
          }))
        } catch (error) {
          console.error("[v0] Naga fetch error:", error)
          return []
        }
      })()

      fetchPromises.push(nagaPromise)
    }

    const results = await Promise.all(fetchPromises)
    const allChannels = results.flat()

    // If Naga is default, put Naga channels first
    if (nagaDefault) {
      const nagaChannels = allChannels.filter((ch) => ch.source === "naga")
      const otherChannels = allChannels.filter((ch) => ch.source !== "naga")
      const sortedChannels = [...nagaChannels, ...otherChannels]
      const limitedChannels = sortedChannels.slice(0, limit * 3)

      console.log(`[v0] Loaded ${nagaChannels.length} Naga channels, ${otherChannels.length} other channels`)
      console.log(`[v0] Returning ${limitedChannels.length} total channels (Naga priority)`)

      return NextResponse.json(limitedChannels)
    } else {
      const limitedChannels = allChannels.slice(0, limit * 3)

      console.log(`[v0] Loaded ${allChannels.length} total channels`)
      console.log(`[v0] Returning ${limitedChannels.length} channels`)

      return NextResponse.json(limitedChannels)
    }
  } catch (error) {
    console.error("[v0] Error fetching channels:", error)
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 })
  }
}
