"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export type UserRole = "admin" | "vip" | "member" | null

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

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

        const { data, error } = await supabase.from("user_profiles").select("role, is_vip").eq("id", user.id).single()

        if (error) {
          console.error("[v0] Error fetching user role:", error)
          setRole("member")
        } else {
          // Determine role: admin > vip > member
          let userRole: UserRole = "member"
          if (data?.role === "admin") {
            userRole = "admin"
          } else if (data?.is_vip === true || data?.role === "vip") {
            userRole = "vip"
          }
          setRole(userRole)
        }
      } catch (err: any) {
        console.error("[v0] Error in useUserRole:", err?.message || err)
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
  }, [])

  return {
    role,
    loading,
    isAdmin: role === "admin",
    isVip: role === "vip" || role === "admin",
    isMember: role === "member",
  }
}
