import { NextResponse } from "next/server"

export async function GET() {
  try {
    const response = await fetch("https://vavoo.to/channels", {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch channels")
    }

    const data = await response.json()

    return NextResponse.json(Array.isArray(data) ? data : [])
  } catch (error) {
    console.error("[v0] Error fetching channels:", error)
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 })
  }
}
