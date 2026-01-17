import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const country = searchParams.get("country")

    if (country) {
      // Get banner for specific country
      const { data: banner } = await supabase.from("country_banners").select("*").eq("country_name", country).single()

      return NextResponse.json({ banner })
    } else {
      // Get global banner and all country banners
      const [globalRes, countryRes] = await Promise.all([
        supabase.from("global_banners").select("*").order("id", { ascending: false }).limit(1).single(),
        supabase.from("country_banners").select("*").order("country_name"),
      ])

      return NextResponse.json({
        globalBanner: globalRes.data,
        countryBanners: countryRes.data || [],
      })
    }
  } catch (error) {
    console.error("Error fetching banners:", error)
    return NextResponse.json({ error: "Failed to fetch banners" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { action, country, message, enabled, bg_color, text_color } = body

    if (action === "update_global") {
      const { error } = await supabase.from("global_banners").upsert({
        id: 1,
        message: message || "",
        enabled: enabled ?? true,
        bg_color: bg_color || "#3b82f6",
        text_color: text_color || "#ffffff",
        updated_at: new Date().toISOString(),
      })

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === "update_country") {
      if (!country) {
        return NextResponse.json({ error: "Country name required" }, { status: 400 })
      }

      const { error } = await supabase.from("country_banners").upsert(
        {
          country_name: country,
          message: message || "",
          enabled: enabled ?? true,
          bg_color: bg_color || "#f59e0b",
          text_color: text_color || "#000000",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "country_name" },
      )

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error updating banner:", error)
    return NextResponse.json({ error: "Failed to update banner" }, { status: 500 })
  }
}
