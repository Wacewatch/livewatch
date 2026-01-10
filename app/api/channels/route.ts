import { NextResponse } from "next/server"
import { VavooClient } from "@/lib/vavoo-client"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get("country")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    console.log("[v0] Fetching channels from VAVOO...", { country, limit })

    const vavooClient = new VavooClient()

    let channels: Record<string, string[]>

    if (country) {
      const groups = await vavooClient.getGroups()
      const countryGroups = groups.filter((g) => g.includes(country))
      channels = await vavooClient.getChannelsByGroups(countryGroups.slice(0, 5))
    } else {
      channels = await vavooClient.getAllChannels()
    }

    const channelArray = Object.entries(channels).flatMap(([name, urls]) => {
      return urls.slice(0, 3).map((url, index) => ({
        id: `${name}-${index}`,
        name: name,
        url: url,
        country: country || "France",
        logo: `https://michaz1988.github.io/logos/${name.replace(/\s/g, "").toLowerCase()}.png`,
      }))
    })

    const limitedChannels = channelArray.slice(0, limit * 3)

    console.log(`[v0] Loaded ${Object.keys(channels).length} unique channels`)
    console.log(`[v0] Loaded ${limitedChannels.length} channel sources`)

    return NextResponse.json(limitedChannels)
  } catch (error) {
    console.error("[v0] Error fetching channels:", error)
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 })
  }
}
