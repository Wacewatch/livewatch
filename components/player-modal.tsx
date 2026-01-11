"use client"

import { useState, useEffect, useRef } from "react"
import { X, Maximize, Minimize, RefreshCw, Loader2, Lock, Unlock } from "lucide-react"
import type { ChannelWithFavorite } from "@/lib/types"

interface PlayerModalProps {
  channel: ChannelWithFavorite | null
  isOpen: boolean
  onClose: () => void
}

const AD_URL = "https://foreignabnormality.com/fg5c1f95w?key=5966fa8bf3f39db1aae7bc8b8d6bb8d8"

export function PlayerModal({ channel, isOpen, onClose }: PlayerModalProps) {
  const [adUnlocked, setAdUnlocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (isOpen && channel) {
      console.log("[v0] Opening player for channel:", channel.name)
      document.body.style.overflow = "hidden"
      setAdUnlocked(false)
      setStreamUrl(null)
      setError(null)
      setVideoLoaded(false)
    } else if (!isOpen) {
      document.body.style.overflow = ""
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.src = ""
      }
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen, channel])

  const unlockStream = () => {
    console.log("[v0] Unlock button clicked")

    // Open ad
    try {
      const popup = window.open(AD_URL, "_blank", "width=1024,height=768")

      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        const link = document.createElement("a")
        link.href = AD_URL
        link.target = "_blank"
        link.rel = "noopener noreferrer"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (e) {
      console.error("[v0] Failed to open ad:", e)
    }

    // Unlock player
    setTimeout(() => {
      setAdUnlocked(true)
      loadStreamSource()
    }, 1000)
  }

  const loadStreamSource = async () => {
    if (!channel) return

    setLoading(true)
    setError(null)

    try {
      console.log("[v0] Fetching stream for channel:", channel.id)
      const response = await fetch(`/api/stream?id=${encodeURIComponent(channel.id)}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Stream data received:", data)

      if (data.success && data.data && data.data.sources && data.data.sources.length > 0) {
        const originalUrl = data.data.sources[0].url
        const proxiedUrl = `/api/proxy-stream?url=${encodeURIComponent(originalUrl)}`
        console.log("[v0] Playing proxied stream")
        setStreamUrl(proxiedUrl)
        playSource(proxiedUrl)
      } else {
        throw new Error("Aucune source disponible")
      }
    } catch (err) {
      console.error("[v0] Error loading stream:", err)
      setError(err instanceof Error ? err.message : "Erreur de chargement")
      setLoading(false)
    }
  }

  const playSource = (url: string) => {
    const video = videoRef.current
    if (!video) return

    console.log("[v0] Setting video source:", url)
    video.src = url
    video.load()

    const loadTimeout = setTimeout(() => {
      if (!videoLoaded) {
        console.log("[v0] Video taking longer than expected...")
      }
    }, 15000)

    video.onloadeddata = () => {
      console.log("[v0] Video loaded")
      clearTimeout(loadTimeout)
      setVideoLoaded(true)
      setLoading(false)
      video.play().catch((e) => console.log("[v0] Autoplay blocked:", e))
    }

    video.oncanplay = () => {
      console.log("[v0] Video can play")
      clearTimeout(loadTimeout)
      setVideoLoaded(true)
      setLoading(false)
    }

    video.onerror = () => {
      console.error("[v0] Video error")
      clearTimeout(loadTimeout)
      setError("Erreur de lecture du flux")
      setLoading(false)
    }
  }

  const handleReload = () => {
    console.log("[v0] Reloading stream")
    setVideoLoaded(false)
    setError(null)
    if (streamUrl) {
      playSource(streamUrl)
    } else {
      loadStreamSource()
    }
  }

  const toggleFullscreen = () => {
    const container = containerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true))
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false))
    }
  }

  if (!isOpen || !channel) return null

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-gradient-to-b from-black to-transparent z-20">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">{channel.name}</h2>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500 text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            EN DIRECT
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReload}
            className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
            title="Recharger"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-red-500/80 text-white hover:bg-red-500 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Video player area */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          controls
          className="absolute inset-0 w-full h-full"
          style={{ display: videoLoaded ? "block" : "none" }}
        />

        {/* Loading state */}
        {loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
            <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mb-4" />
            <p className="text-white text-lg">Chargement du flux...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
            <div className="text-center">
              <div className="text-red-400 text-6xl mb-6 animate-pulse">⚠️</div>
              <p className="text-white text-lg mb-4">{error}</p>
              <button
                onClick={handleReload}
                className="px-6 py-3 rounded-xl bg-cyan-500 text-black font-bold hover:bg-cyan-400 transition-all"
              >
                <RefreshCw className="w-5 h-5 inline mr-2" />
                Réessayer
              </button>
            </div>
          </div>
        )}

        {/* Ad lock overlay */}
        {!adUnlocked && !loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
            <Lock className="w-20 h-20 text-red-400 mb-6 animate-pulse" />
            <h3 className="text-3xl font-bold text-white mb-4">Stream verrouillé</h3>
            <p className="text-white/70 text-lg mb-2">Regardez une courte publicité pour débloquer ce stream</p>
            <p className="text-red-400 font-bold mb-8">Merci pour votre soutien ❤️</p>
            <button
              onClick={unlockStream}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-lg hover:scale-105 transition-all shadow-lg shadow-red-500/50"
            >
              <Unlock className="w-6 h-6" />
              <span>Débloquer le stream</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
