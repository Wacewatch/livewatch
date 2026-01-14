"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { setupIframeAuth, type IframeAuthMessage } from "@/lib/iframe-auth"

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

        const { data, error } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

        if (error) {
          console.error("[v0] Error fetching user role:", error)
          setRole("member")
        } else {
          setRole((data?.role as UserRole) || "member")
        }
      } catch (err: any) {
        console.error("[v0] Error in useUserRole:", err?.message || err)
        setRole(null)
      } finally {
        setLoading(false)
      }
    }

    fetchRole()

    setupIframeAuth((authData: IframeAuthMessage) => {
      console.log("[v0] Received auth from parent iframe:", authData)
      if (authData.role) {
        setRole(authData.role as UserRole)
        setLoading(false)
      }
    })

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
