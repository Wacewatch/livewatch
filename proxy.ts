import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse } from "next/server"

export async function proxy(request: any) {
  // Temporarily disable Supabase middleware if env vars are not set
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log("[v0] Supabase env vars not set, skipping middleware")
    return NextResponse.next()
  }
  return await updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
