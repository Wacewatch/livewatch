"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function PlayerVIPContent() {
  const searchParams = useSearchParams()
  const channelId = searchParams.get("url")

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

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <iframe
        src={`/api/player?channelId=${encodeURIComponent(channelId)}&skipAd=true`}
        className="w-full h-screen border-0"
        allow="autoplay; fullscreen"
      />
    </div>
  )
}

export default function PlayerVIPPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PlayerVIPContent />
    </Suspense>
  )
}
