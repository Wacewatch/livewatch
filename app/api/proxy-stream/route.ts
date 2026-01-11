export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")

    if (!url) {
      return new Response("URL parameter required", { status: 400 })
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://movix.club/",
      },
    })

    if (!response.ok) {
      return new Response("Stream not available", { status: response.status })
    }

    // Forward all headers from the original response
    const headers = new Headers()
    response.headers.forEach((value, key) => {
      headers.set(key, value)
    })

    // Ensure proper CORS headers
    headers.set("Access-Control-Allow-Origin", "*")
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
    headers.set("Access-Control-Allow-Headers", "*")

    return new Response(response.body, {
      status: response.status,
      headers,
    })
  } catch (error) {
    console.error("[v0] Proxy stream error:", error)
    return new Response("Proxy error", { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  })
}
