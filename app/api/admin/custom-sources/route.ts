import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    })

    const { data: sources, error } = await supabase
      .from("custom_proxy_sources")
      .select("*")
      .order("sort_order", { ascending: true })

    if (error) throw error

    return NextResponse.json({ sources: sources || [] })
  } catch (error) {
    console.error("Error fetching custom sources:", error)
    return NextResponse.json({ sources: [] })
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    })

    const body = await request.json()
    const { name, proxy_url, description } = body

    if (!name || !proxy_url) {
      return NextResponse.json({ error: "Name and proxy_url are required" }, { status: 400 })
    }

    // Get max sort_order
    const { data: maxOrder } = await supabase
      .from("custom_proxy_sources")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .single()

    const newOrder = (maxOrder?.sort_order || 0) + 1

    const { data, error } = await supabase
      .from("custom_proxy_sources")
      .insert({
        name,
        proxy_url,
        description: description || "",
        enabled: true,
        sort_order: newOrder,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, source: data })
  } catch (error) {
    console.error("Error creating custom source:", error)
    return NextResponse.json({ error: "Failed to create source" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    })

    const body = await request.json()
    const { id, enabled, name, proxy_url, description } = body

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    if (typeof enabled === "boolean") updateData.enabled = enabled
    if (name) updateData.name = name
    if (proxy_url) updateData.proxy_url = proxy_url
    if (typeof description === "string") updateData.description = description

    const { error } = await supabase.from("custom_proxy_sources").update(updateData).eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating custom source:", error)
    return NextResponse.json({ error: "Failed to update source" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    })

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    const { error } = await supabase.from("custom_proxy_sources").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting custom source:", error)
    return NextResponse.json({ error: "Failed to delete source" }, { status: 500 })
  }
}
