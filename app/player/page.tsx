"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import type { Channel } from "@/lib/types"

function PlayerContent() {
  const searchParams = useSearchParams()
  const channelId = searchParams.get("url")
  const [channel, setChannel] = useState<Channel | null>(null)
  const [showAdLock, setShowAdLock] = useState(true)
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (!channelId) return

    const fetchChannel = async () => {
      try {
        const response = await fetch("/api/catalog")
        const data = await response.json()
        const channels = data.channels || []
        const found = channels.find((c: Channel) => c.id === channelId)
        if (found) {
          setChannel(found)
        }
      } catch (error) {
        console.error("[v0] Error fetching channel:", error)
      }
    }

    fetchChannel()
  }, [channelId])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleContinue = () => {
    if (countdown === 0) {
      setShowAdLock(false)
    }
  }

  if (!channelId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Chaîne non trouvée</h1>
          <p className="text-muted-foreground">Aucun ID de chaîne fourni</p>
        </div>
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (showAdLock) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-card border border-border/50 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl font-bold text-white">{countdown}</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{channel.name}</h2>
          <p className="text-muted-foreground mb-6">Veuillez patienter {countdown} secondes avant de continuer...</p>
          <button
            onClick={handleContinue}
            disabled={countdown > 0}
            className={`w-full py-4 rounded-xl font-bold transition-all ${
              countdown === 0
                ? "bg-gradient-to-r from-primary to-accent text-white hover:scale-105 cursor-pointer"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
            }`}
          >
            {countdown === 0 ? "Continuer" : `Patientez ${countdown}s`}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <iframe
        src={`/api/player?channelId=${encodeURIComponent(channelId)}&skipAd=false`}
        className="w-full h-screen border-0"
        allow="autoplay; fullscreen"
      />
    </div>
  )
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PlayerContent />
    </Suspense>
  )
}
