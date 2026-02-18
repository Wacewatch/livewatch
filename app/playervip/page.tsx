"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import type { Channel } from "@/lib/types"
import { PlayerModal } from "@/components/player-modal"

function PlayerVIPContent() {
  const searchParams = useSearchParams()
  const channelId = searchParams.get("url")
  const [channel, setChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!channelId) return

    const fetchChannel = async () => {
      try {
        console.log("[v0] [VIP] Fetching channel with ID:", channelId)
        
        const country = channelId.split('.').pop()?.toUpperCase() || 'FR'
        const response = await fetch(`/api/tvvoo/channels?countries=${country}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch channels: ${response.statusText}`)
        }
        
        const channels = await response.json()

        const found = channels.find((c: any) => {
          if (c.baseId === channelId || c.id === channelId) return true
          
          try {
            const decodedId = decodeURIComponent(channelId)
            if (c.baseId === decodedId || c.id === decodedId) return true
          } catch (e) {
            // Ignore
          }

          try {
            const encodedBaseId = encodeURIComponent(c.baseId)
            if (encodedBaseId === channelId) return true
          } catch (e) {
            // Ignore
          }

          return false
        })

        console.log("[v0] [VIP] Channel found:", found ? found.baseName : "not found")

        if (found) {
          setChannel(found)
        }
      } catch (error) {
        console.error("[v0] [VIP] Error fetching channel:", error)
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
        forceNoAds={true}
      />
    </div>
  )
}

export default function PlayerVIPPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <PlayerVIPContent />
    </Suspense>
  )
}
