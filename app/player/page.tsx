"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import type { Channel } from "@/lib/types"
import { PlayerModal } from "@/components/player-modal"

function PlayerContent() {
  const searchParams = useSearchParams()
  const channelId = searchParams.get("url")
  const [channel, setChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!channelId) return

    const fetchChannel = async () => {
      try {
        const response = await fetch("/api/catalog")
        const data = await response.json()
        const channels = data.channels || []

        // Try to find channel by exact match or decoded match
        let found = channels.find((c: Channel) => c.baseId === channelId || c.id === channelId)

        // If not found, try decoding the channelId once
        if (!found) {
          const decodedId = decodeURIComponent(channelId)
          found = channels.find((c: Channel) => c.baseId === decodedId || c.id === decodedId)
        }

        if (found) {
          setChannel(found)
        }
      } catch (error) {
        console.error("[v0] Error fetching channel:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchChannel()
  }, [channelId])

  if (!channelId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Chaîne non trouvée</h1>
          <p className="text-white/70">Aucun ID de chaîne fourni</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Stream not available</h1>
          <p className="text-white/70">Channel ID: {channelId}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <PlayerModal
        channel={channel}
        isOpen={true}
        onClose={() => {
          // Redirect to home on close
          window.location.href = "/"
        }}
      />
    </div>
  )
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <PlayerContent />
    </Suspense>
  )
}
