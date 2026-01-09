import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || "4070446369"
  const targetUrl = `https://vavoo.to/play/${id}/index.m3u8`

  console.log("[v0] Debug: Testing stream for ID:", id)

  try {
    const response = await fetch(targetUrl, {
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        Origin: "https://vavoo.to",
        Referer: "https://vavoo.to/",
      },
    })

    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get("location")
      if (!location) {
        return NextResponse.json({
          success: false,
          error: "Redirect without location header",
          originalUrl: targetUrl,
          status: response.status,
        })
      }

      console.log("[v0] Following redirect to:", location)

      const cdnResponse = await fetch(location, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "*/*",
          "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      })

      const text = await cdnResponse.text()
      const contentType = cdnResponse.headers.get("content-type") || ""

      return NextResponse.json({
        success: true,
        originalUrl: targetUrl,
        redirectUrl: location,
        finalUrl: cdnResponse.url,
        status: cdnResponse.status,
        statusText: cdnResponse.statusText,
        contentType: contentType,
        contentLength: text.length,
        isM3U8: text.trim().startsWith("#EXTM3U"),
        contentPreview: text.substring(0, 1000),
        headers: Object.fromEntries(cdnResponse.headers.entries()),
      })
    }

    const text = await response.text()
    const contentType = response.headers.get("content-type") || ""

    return NextResponse.json({
      success: true,
      originalUrl: targetUrl,
      finalUrl: response.url,
      status: response.status,
      statusText: response.statusText,
      contentType: contentType,
      contentLength: text.length,
      isM3U8: text.trim().startsWith("#EXTM3U"),
      contentPreview: text.substring(0, 1000),
      headers: Object.fromEntries(response.headers.entries()),
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      originalUrl: targetUrl,
    })
  }
}
