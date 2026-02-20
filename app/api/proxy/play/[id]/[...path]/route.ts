import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 60

interface RouteParams {
  params: Promise<{
    id: string
    path: string[]
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, path } = await params
    const pathStr = path.join("/")

    console.log("[v0] Play request:", { id, path: pathStr })

    // Get source configuration
    const supabase = await createClient()
    const { data: config } = await supabase
      .from("app_config")
      .select("naga_enabled, naga_default")
      .eq("key", "source_config")
      .single()

    const nagaEnabled = config?.naga_enabled !== false
    const nagaDefault = config?.naga_default === true

    // Parse channel ID to get the actual channel name and source info
    // Format can be: "channelName-0", "naga-channelName", etc.
    const idParts = id.split("-")
    const isNagaSource = idParts[0] === "naga"
    const channelName = isNagaSource ? idParts.slice(1).join("-") : idParts.slice(0, -1).join("-")
    
    // If Naga is enabled and either default or explicitly requested
    if (nagaEnabled && (nagaDefault || isNagaSource)) {
      console.log("[v0] Using Naga source for:", channelName)
      
      // Call Naga API to get the stream
      const nagaUrl = new URL(`${request.nextUrl.origin}/api/naga/proxy`)
      nagaUrl.searchParams.set("channel", channelName)
      nagaUrl.searchParams.set("path", pathStr)
      
      // Forward range header if present
      const rangeHeader = request.headers.get("range")
      const headers: HeadersInit = {}
      if (rangeHeader) {
        headers["Range"] = rangeHeader
      }

      const nagaResponse = await fetch(nagaUrl.toString(), { headers })
      
      if (nagaResponse.ok) {
        const contentType = nagaResponse.headers.get("content-type") || ""
        const responseHeaders: HeadersInit = {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Range",
          "Cache-Control": pathStr.includes(".m3u8")
            ? "public, max-age=10, s-maxage=10"
            : "public, max-age=21600, s-maxage=21600, immutable",
        }

        const contentLength = nagaResponse.headers.get("content-length")
        if (contentLength) {
          responseHeaders["Content-Length"] = contentLength
        }

        const contentRange = nagaResponse.headers.get("content-range")
        if (contentRange) {
          responseHeaders["Content-Range"] = contentRange
        }

        return new NextResponse(nagaResponse.body, {
          status: nagaResponse.status,
          headers: responseHeaders,
        })
      }

      // If Naga fails and it was default, fall through to other sources
      if (!nagaDefault && isNagaSource) {
        return NextResponse.json({ error: "Naga source unavailable" }, { status: 502 })
      }
    }

    // Fallback to other sources
    // Get the channel from the channels list
    const channelsResponse = await fetch(`${request.nextUrl.origin}/api/channels`)
    if (!channelsResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 })
    }

    const channels = await channelsResponse.json()
    const channel = channels.find((ch: any) => ch.id === id)

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 })
    }

    // Use the channel URL and proxy it
    if (pathStr === "index.m3u8") {
      // Get the M3U8 manifest
      const proxyUrl = new URL(`${request.nextUrl.origin}/api/proxy`)
      proxyUrl.searchParams.set("url", channel.url)

      const response = await fetch(proxyUrl.toString())
      
      if (!response.ok) {
        return NextResponse.json({ error: "Stream unavailable" }, { status: 502 })
      }

      return new NextResponse(response.body, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Range",
          "Cache-Control": "public, max-age=10, s-maxage=10",
        },
      })
    } else {
      // Proxy segment or playlist
      // Extract base URL from channel URL
      const channelUrl = new URL(channel.url)
      const baseUrl = channelUrl.origin + channelUrl.pathname.substring(0, channelUrl.pathname.lastIndexOf("/") + 1)
      const segmentUrl = baseUrl + pathStr

      const proxyUrl = new URL(`${request.nextUrl.origin}/api/proxy`)
      proxyUrl.searchParams.set("url", segmentUrl)

      const rangeHeader = request.headers.get("range")
      const headers: HeadersInit = {}
      if (rangeHeader) {
        headers["Range"] = rangeHeader
      }

      const response = await fetch(proxyUrl.toString(), { headers })

      if (!response.ok) {
        return NextResponse.json({ error: "Segment unavailable" }, { status: 502 })
      }

      const contentType = response.headers.get("content-type") || ""
      const responseHeaders: HeadersInit = {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Range",
        "Cache-Control": "public, max-age=21600, s-maxage=21600, immutable",
      }

      const contentLength = response.headers.get("content-length")
      if (contentLength) {
        responseHeaders["Content-Length"] = contentLength
      }

      const contentRange = response.headers.get("content-range")
      if (contentRange) {
        responseHeaders["Content-Range"] = contentRange
      }

      return new NextResponse(response.body, {
        status: response.status,
        headers: responseHeaders,
      })
    }
  } catch (error) {
    console.error("[v0] Play proxy error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Range",
    },
  })
}
