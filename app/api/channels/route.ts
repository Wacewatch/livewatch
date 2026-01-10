import { NextResponse } from "next/server"
import { VavooClient } from "@/lib/vavoo-client"

export async function GET() {
  try {
    console.log("[v0] Fetching channels from VAVOO...")

    const vavooClient = new VavooClient()
    const channels = await vavooClient.getAllChannels()

    // Transform to array format expected by frontend
    const channelArray = Object.entries(channels).flatMap(([name, urls]) => {
      return urls.map((url, index) => ({
        id: `${name}-${index}`,
        name: name,
        url: url,
        country: "France", // Default country, can be enhanced
        logo: `https://michaz1988.github.io/logos/${name.replace(/\s/g, "").toLowerCase()}.png`,
      }))
    })

    console.log(`[v0] Loaded ${channelArray.length} channel sources`)

    return NextResponse.json(channelArray)
  } catch (error) {
    console.error("[v0] Error fetching channels:", error)
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 })
  }
}
