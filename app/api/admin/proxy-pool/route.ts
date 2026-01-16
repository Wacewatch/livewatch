import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: proxies, error: proxiesError } = await supabase
      .from("proxy_pool")
      .select("*")
      .order("success_rate", { ascending: false })
      .limit(100)

    const { data: proxySources, error: sourcesError } = await supabase
      .from("proxy_sources")
      .select("*")
      .order("created_at", { ascending: true })

    const { count: totalProxies } = await supabase.from("proxy_pool").select("id", { count: "exact", head: true })
    const { count: activeProxies } = await supabase
      .from("proxy_pool")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)

    if (proxiesError || sourcesError) throw proxiesError || sourcesError

    return NextResponse.json({
      proxies: proxies || [],
      proxySources: proxySources || [],
      totalProxies: totalProxies || 0,
      activeProxies: activeProxies || 0,
    })
  } catch (error) {
    console.error("[v0] Failed to fetch proxy pool:", error)
    return NextResponse.json({ error: "Failed to fetch proxy pool" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { action, ...data } = await request.json()

    if (action === "update_config") {
      const { error } = await supabase
        .from("proxy_config")
        .update({
          git_url: data.git_url,
          update_interval_minutes: data.update_interval_minutes,
          auto_update_enabled: data.auto_update_enabled,
          min_success_rate: data.min_success_rate,
          max_response_time_ms: data.max_response_time_ms,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1)

      if (error) throw error

      return NextResponse.json({ success: true })
    }

    if (action === "add_proxy_source") {
      const { error } = await supabase.from("proxy_sources").insert({
        name: data.name,
        git_url: data.git_url,
        sync_interval_minutes: data.sync_interval_minutes || 30,
        enabled: true,
      })

      if (error) throw error

      return NextResponse.json({ success: true })
    }

    if (action === "toggle_proxy_source") {
      const { error } = await supabase
        .from("proxy_sources")
        .update({ enabled: data.enabled, updated_at: new Date().toISOString() })
        .eq("id", data.id)

      if (error) throw error

      return NextResponse.json({ success: true })
    }

    if (action === "delete_proxy_source") {
      const { error } = await supabase.from("proxy_sources").delete().eq("id", data.id)

      if (error) throw error

      return NextResponse.json({ success: true })
    }

    if (action === "sync_proxies") {
      const { data: sources } = await supabase.from("proxy_sources").select("*").eq("enabled", true)

      if (!sources || sources.length === 0) {
        return NextResponse.json({ error: "No enabled proxy sources" }, { status: 400 })
      }

      let totalAdded = 0
      let totalSkipped = 0

      for (const source of sources) {
        console.log("[v0] Fetching proxy list from:", source.git_url)

        try {
          const response = await fetch(source.git_url)
          const text = await response.text()

          const proxyLines = text
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith("#"))

          console.log("[v0] Found", proxyLines.length, "proxy entries from", source.name)

          let added = 0
          let skipped = 0

          for (const line of proxyLines.slice(0, 200)) {
            const parts = line.split(":")
            if (parts.length >= 2) {
              const host = parts[0].trim()
              const port = Number.parseInt(parts[1].trim())

              if (host && !isNaN(port)) {
                const proxy_url = `http://${host}:${port}`

                const { error } = await supabase.from("proxy_pool").upsert(
                  {
                    proxy_url,
                    protocol: "http",
                    host,
                    port,
                    is_active: true,
                    last_checked: new Date().toISOString(),
                  },
                  {
                    onConflict: "proxy_url",
                    ignoreDuplicates: true,
                  },
                )

                if (error) {
                  skipped++
                } else {
                  added++
                }
              }
            }
          }

          totalAdded += added
          totalSkipped += skipped

          await supabase.from("proxy_sources").update({ last_sync: new Date().toISOString() }).eq("id", source.id)
        } catch (sourceError) {
          console.error(`[v0] Failed to sync from ${source.name}:`, sourceError)
        }
      }

      console.log("[v0] Proxy sync complete:", { totalAdded, totalSkipped })

      return NextResponse.json({ success: true, added: totalAdded, skipped: totalSkipped })
    }

    if (action === "delete_inactive") {
      const { error } = await supabase.from("proxy_pool").delete().eq("is_active", false)

      if (error) throw error

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Proxy pool action failed:", error)
    return NextResponse.json({ error: "Action failed" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (id) {
      const { error } = await supabase.from("proxy_pool").delete().eq("id", Number.parseInt(id))

      if (error) throw error
    } else {
      const { error } = await supabase.from("proxy_pool").delete().neq("id", 0)

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to delete proxy:", error)
    return NextResponse.json({ error: "Failed to delete proxy" }, { status: 500 })
  }
}
