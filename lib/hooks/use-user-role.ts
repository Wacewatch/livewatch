"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"

export type UserRole = "admin" | "vip" | "member" | null

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    async function fetchRole() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setRole(null)
          setLoading(false)
          return
        }

        const { data, error } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

        if (error) {
          console.error("[v0] Error fetching user role:", error)
          setRole("member")
        } else {
          setRole((data?.role as UserRole) || "member")
        }
      } catch (err) {
        console.error("[v0] Error in useUserRole:", err)
        setRole(null)
      } finally {
        setLoading(false)
      }
    }

    fetchRole()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchRole()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return {
    role,
    loading,
    isAdmin: role === "admin",
    isVip: role === "vip" || role === "admin", // Admins have VIP benefits
    isMember: role === "member",
  }
}
