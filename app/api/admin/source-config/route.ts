import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from("app_config").select("*").eq("key", "source_config").single()

    if (error || !data) {
      // Return default config
      return NextResponse.json({
        source1_enabled: true,
        source2_enabled: true,
        source3_enabled: true,
        source4_enabled: true,
        external_proxy_url: "", // Added external proxy URL support
        default_tvvoo_source: 1, // Default to beta (second) alternative source
        alpha_enabled: true, // Alpha source enabled by default
        beta_enabled: true, // Beta source enabled by default
      })
    }

    return NextResponse.json(data.value)
  } catch (error) {
    console.error("[v0] Error fetching source config:", error)
    return NextResponse.json({
      source1_enabled: true,
      source2_enabled: true,
      source3_enabled: true,
      source4_enabled: true,
      external_proxy_url: "",
      default_tvvoo_source: 0,
    })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const config = await request.json()

    const fullConfig = {
      source1_enabled: config.source1_enabled ?? true,
      source2_enabled: config.source2_enabled ?? true,
      source3_enabled: config.source3_enabled ?? true,
      source4_enabled: config.source4_enabled ?? true,
      external_proxy_url: config.external_proxy_url ?? "",
      default_tvvoo_source: config.default_tvvoo_source ?? 0,
    }

    const { error } = await supabase.from("app_config").upsert({
      key: "source_config",
      value: fullConfig,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error("[v0] Error updating source config:", error)
      return NextResponse.json({ error: "Failed to update config" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in source config PUT:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
