"use client"

import { useState, useEffect } from "react"

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    const stored = localStorage.getItem("tv-favorites")
    if (stored) {
      setFavorites(JSON.parse(stored))
    }
  }, [])

  const toggleFavorite = (channelName: string) => {
    setFavorites((prev) => {
      const newFavorites = prev.includes(channelName)
        ? prev.filter((name) => name !== channelName)
        : [...prev, channelName]

      localStorage.setItem("tv-favorites", JSON.stringify(newFavorites))
      return newFavorites
    })
  }

  const isFavorite = (channelName: string) => favorites.includes(channelName)

  return { favorites, toggleFavorite, isFavorite, count: favorites.length }
}
