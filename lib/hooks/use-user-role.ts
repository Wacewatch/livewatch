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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchRole()
    })

    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from trusted domains
      const trustedDomains = ["https://beta.wavewatch.xyz", "https://wavewatch.xyz", "http://localhost:3000"]

      if (!trustedDomains.some((domain) => event.origin.startsWith(domain))) {
        return
      }

      if (event.data.type === "AUTH_STATE") {
        const { role: parentRole, isAuthenticated } = event.data
        if (isAuthenticated && parentRole) {
          console.log("[v0] Received auth from parent iframe:", parentRole)
          setRole(parentRole as UserRole)
          setLoading(false)
        }
      }
    }

    window.addEventListener("message", handleMessage)

    // Request auth state from parent if in iframe
    if (window !== window.parent) {
      console.log("[v0] Running in iframe, requesting auth from parent")
      window.parent.postMessage({ type: "REQUEST_AUTH" }, "*")
    }

    return () => {
      subscription.unsubscribe()
      window.removeEventListener("message", handleMessage)
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
