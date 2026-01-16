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

    const { data: config, error: configError } = await supabase.from("proxy_config").select("*").single()

    const { count: totalProxies } = await supabase.from("proxy_pool").select("id", { count: "exact", head: true })
    const { count: activeProxies } = await supabase
      .from("proxy_pool")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)

    if (proxiesError || configError) throw proxiesError || configError

    return NextResponse.json({
      proxies: proxies || [],
      config: config || null,
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
      const updateData: any = {
        update_interval_minutes: data.update_interval_minutes,
        auto_update_enabled: data.auto_update_enabled,
        min_success_rate: data.min_success_rate,
        max_response_time_ms: data.max_response_time_ms,
        updated_at: new Date().toISOString(),
      }

      if (data.git_urls && Array.isArray(data.git_urls)) {
        updateData.git_urls = data.git_urls
      } else if (data.git_url) {
        updateData.git_url = data.git_url
        updateData.git_urls = [data.git_url]
      }

      const { error } = await supabase.from("proxy_config").update(updateData).eq("id", 1)

      if (error) throw error

      return NextResponse.json({ success: true })
    }

    if (action === "sync_proxies") {
      const { data: config } = await supabase.from("proxy_config").select("*").single()

      const gitUrls = config?.git_urls || (config?.git_url ? [config.git_url] : [])

      if (!gitUrls || gitUrls.length === 0) {
        return NextResponse.json({ error: "No Git URLs configured" }, { status: 400 })
      }

      let added = 0
      let skipped = 0
      let totalProxiesFound = 0

      for (const gitUrl of gitUrls) {
        console.log("[v0] Fetching proxy list from:", gitUrl)
        try {
          const response = await fetch(gitUrl, { signal: AbortSignal.timeout(10000) })
          const text = await response.text()

          const proxyLines = text
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith("#"))

          totalProxiesFound += proxyLines.length
          console.log("[v0] Found", proxyLines.length, "proxy entries from", gitUrl)

          for (const line of proxyLines.slice(0, 100)) {
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
        } catch (err) {
          console.error("[v0] Failed to fetch from", gitUrl, err)
        }
      }

      await supabase.from("proxy_config").update({ last_update: new Date().toISOString() }).eq("id", 1)

      console.log("[v0] Proxy sync complete:", { added, skipped, total: totalProxiesFound })

      return NextResponse.json({ success: true, added, skipped, total: totalProxiesFound, sources: gitUrls.length })
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
