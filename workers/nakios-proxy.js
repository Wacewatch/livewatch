export default {
  async fetch(request) {
    const url = new URL(request.url)
    const channelId = url.searchParams.get("channel")

    if (!channelId) {
      return new Response(JSON.stringify({ error: "Missing channel parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    try {
      // Call Nakios API with proper headers to bypass restrictions
      const nakiosUrl = `https://nakios.site/api/tv-live/channel/${channelId}`

      const nakiosResponse = await fetch(nakiosUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
          Referer: "https://nakios.site/",
          Origin: "https://nakios.site",
          DNT: "1",
          Connection: "keep-alive",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
        },
      })

      if (!nakiosResponse.ok) {
        return new Response(JSON.stringify({ error: `Nakios error: ${nakiosResponse.status}` }), {
          status: nakiosResponse.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        })
      }

      const data = await nakiosResponse.json()

      // Return stream URL with CORS headers
      return new Response(
        JSON.stringify({
          success: true,
          streamUrl: data?.data?.streamer || null,
          channelData: data?.data || null,
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        },
      )
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch from Nakios",
          details: error.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      )
    }
  },
}
