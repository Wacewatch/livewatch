"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    async function loadFavorites() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()
        setUser(currentUser)

        if (currentUser) {
          // Load from database
          const response = await fetch("/api/favorites")
          const data = await response.json()
          setFavorites(data.favorites || [])
        } else {
          // Load from localStorage
          const stored = localStorage.getItem("tv-favorites")
          if (stored) {
            setFavorites(JSON.parse(stored))
          }
        }
      } catch (error) {
        console.error("[v0] Error loading favorites:", error)
        // Fallback to localStorage
        const stored = localStorage.getItem("tv-favorites")
        if (stored) {
          setFavorites(JSON.parse(stored))
        }
      } finally {
        setLoading(false)
      }
    }

    loadFavorites()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      loadFavorites()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const toggleFavorite = async (channelId: string) => {
    const isCurrentlyFavorite = favorites.includes(channelId)

    // Optimistic update
    setFavorites((prev) => (isCurrentlyFavorite ? prev.filter((id) => id !== channelId) : [...prev, channelId]))

    try {
      if (user) {
        // Save to database
        if (isCurrentlyFavorite) {
          await fetch("/api/favorites", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channel_id: channelId }),
          })
        } else {
          await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channel_id: channelId }),
          })
        }
      } else {
        // Save to localStorage
        const newFavorites = isCurrentlyFavorite
          ? favorites.filter((id) => id !== channelId)
          : [...favorites, channelId]
        localStorage.setItem("tv-favorites", JSON.stringify(newFavorites))
      }
    } catch (error) {
      console.error("[v0] Error toggling favorite:", error)
      // Revert on error
      setFavorites((prev) => (isCurrentlyFavorite ? [...prev, channelId] : prev.filter((id) => id !== channelId)))
    }
  }

  const isFavorite = (channelId: string) => favorites.includes(channelId)

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    count: favorites.length,
    user,
    loading,
  }
}
