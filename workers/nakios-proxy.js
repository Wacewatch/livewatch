export default {
  async fetch(request) {
    const url = new URL(request.url)
    const channelId = url.searchParams.get("channel")

    if (!channelId) {
      return new Response(JSON.stringify({ error: "Missing channel parameter" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }

    try {
      const nakiosUrl = `https://nakios.site/api/tv-live/channel/${channelId}`

      console.log("Calling Nakios:", nakiosUrl)

      const nakiosResponse = await fetch(nakiosUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          Referer: "https://nakios.site/",
          Origin: "https://nakios.site",
          DNT: "1",
          Connection: "keep-alive",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          Priority: "u=1, i",
        },
      })

      console.log("Nakios response status:", nakiosResponse.status)

      if (!nakiosResponse.ok) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Nakios returned ${nakiosResponse.status}`,
            details: await nakiosResponse.text(),
          }),
          {
            status: nakiosResponse.status,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        )
      }

      const data = await nakiosResponse.json()
      console.log("Nakios data:", JSON.stringify(data).substring(0, 200))

      let streamUrl = null

      // Try different paths in the response
      if (data?.data?.streamer) {
        streamUrl = data.data.streamer
      } else if (data?.streamer) {
        streamUrl = data.streamer
      } else if (data?.data?.streamUrl) {
        streamUrl = data.data.streamUrl
      } else if (data?.streamUrl) {
        streamUrl = data.streamUrl
      }

      console.log("Extracted stream URL:", streamUrl)

      return new Response(
        JSON.stringify({
          success: !!streamUrl,
          streamUrl: streamUrl,
          channelData: data?.data || data,
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
      console.error("Worker error:", error.message)
      return new Response(
        JSON.stringify({
          success: false,
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
