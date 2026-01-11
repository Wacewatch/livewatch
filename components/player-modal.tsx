"use client"

import { useState, useEffect, useRef } from "react"
import { X, Maximize, Minimize, RefreshCw, Loader2, Lock, Unlock, Crown, Sparkles } from "lucide-react"
import type { ChannelWithFavorite } from "@/lib/types"
import Hls from "hls.js"
import { useUserRole } from "@/lib/hooks/use-user-role"
import { VipUpgradeModal } from "@/components/vip-upgrade-modal"

interface PlayerModalProps {
  channel: ChannelWithFavorite | null
  isOpen: boolean
  onClose: () => void
}

const AD_URL = "https://foreignabnormality.com/fg5c1f95w?key=5966fa8bf3f39db1aae7bc8b8d6bb8d8"

export function PlayerModal({ channel, isOpen, onClose }: PlayerModalProps) {
  const { role, isVip, isAdmin } = useUserRole()
  const [adUnlocked, setAdUnlocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionStartTime, setSessionStartTime] = useState<number>(0)
  const [showVipModal, setShowVipModal] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<any>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isOpen && channel) {
      console.log("[v0] Opening player for channel:", channel.baseName)
      document.body.style.overflow = "hidden"

      if (isVip || isAdmin) {
        console.log("[v0] VIP/Admin user detected, bypassing ad lock")
        setAdUnlocked(true)
        setTimeout(() => loadStreamSource(), 100)
      } else {
        setAdUnlocked(false)
      }

      setStreamUrl(null)
      setError(null)
      setVideoLoaded(false)
      setSelectedSourceIndex(0)
    } else if (!isOpen) {
      document.body.style.overflow = ""
      stopTrackingSession()
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.src = ""
      }
    }

    return () => {
      document.body.style.overflow = ""
      stopTrackingSession()
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [isOpen, channel, isVip, isAdmin])

  const startTrackingSession = async () => {
    if (!channel) return

    try {
      const response = await fetch("/api/tracking/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channel.baseId,
          channelName: channel.baseName,
        }),
      })

      const data = await response.json()
      if (data.sessionId) {
        setSessionId(data.sessionId)
        setSessionStartTime(Date.now())
        startHeartbeat(data.sessionId)
        console.log("[v0] Session tracking started:", data.sessionId)
      }
    } catch (error) {
      console.error("[v0] Failed to start session tracking:", error)
    }
  }

  const startHeartbeat = (sid: string) => {
    // Clear any existing heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }

    // Send heartbeat every 30 seconds
    heartbeatIntervalRef.current = setInterval(async () => {
      try {
        await fetch("/api/tracking/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid }),
        })
      } catch (error) {
        console.error("[v0] Heartbeat failed:", error)
      }
    }, 30000)
  }

  const stopTrackingSession = async () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }

    if (sessionId) {
      const durationSeconds = Math.floor((Date.now() - sessionStartTime) / 1000)

      try {
        await fetch("/api/tracking/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            durationSeconds,
          }),
        })
        console.log("[v0] Session tracking stopped, duration:", durationSeconds, "seconds")
      } catch (error) {
        console.error("[v0] Failed to stop session tracking:", error)
      }

      setSessionId(null)
      setSessionStartTime(0)
    }
  }

  const unlockStream = () => {
    console.log("[v0] Unlock button clicked")

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

    setTimeout(() => {
      setAdUnlocked(true)
      loadStreamSource()
    }, 1000)
  }

  const loadStreamSource = async (sourceIndex: number = selectedSourceIndex) => {
    if (!channel || !channel.sources[sourceIndex]) return

    setLoading(true)
    setError(null)
    setVideoLoaded(false)

    try {
      const selectedSource = channel.sources[sourceIndex]
      console.log("[v0] Fetching stream for source:", selectedSource.name, selectedSource.id)

      const response = await fetch(`/api/stream?id=${encodeURIComponent(selectedSource.id)}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Stream data received")

      if (data.success && data.data && data.data.sources && data.data.sources.length > 0) {
        const originalUrl = data.data.sources[0].url
        const proxiedUrl = `/api/proxy-stream?url=${encodeURIComponent(originalUrl)}`
        console.log("[v0] Playing stream via proxy")
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

  const playSource = async (url: string) => {
    const video = videoRef.current
    if (!video) return

    console.log("[v0] Setting video source:", url)

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    const isM3U8 = url.includes(".m3u8") || url.includes("m3u8")

    if (isM3U8 && Hls.isSupported()) {
      console.log("[v0] Using HLS.js for M3U8 stream")
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      })

      hlsRef.current = hls

      hls.loadSource(url)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("[v0] HLS manifest parsed")
        setVideoLoaded(true)
        setLoading(false)
        startTrackingSession()
        video.play().catch((e) => console.log("[v0] Autoplay blocked:", e))
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("[v0] HLS error:", data)
        if (data.fatal) {
          setError("Erreur de lecture du flux")
          setLoading(false)
        }
      })
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      console.log("[v0] Using native HLS support")
      video.src = url
      video.addEventListener("loadedmetadata", () => {
        console.log("[v0] Video metadata loaded")
        setVideoLoaded(true)
        setLoading(false)
        startTrackingSession()
        video.play().catch((e) => console.log("[v0] Autoplay blocked:", e))
      })
    } else {
      setError("HLS non supporté par ce navigateur")
      setLoading(false)
    }
  }

  const handleReload = () => {
    console.log("[v0] Reloading stream")
    setVideoLoaded(false)
    setError(null)
    stopTrackingSession()
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

  const switchSource = (index: number) => {
    setSelectedSourceIndex(index)
    stopTrackingSession()
    loadStreamSource(index)
  }

  if (!isOpen || !channel) return null

  const availableQualities = Array.from(new Set(channel.sources.map((s) => s.quality))).sort((a, b) => {
    const order = { "4K": 4, FHD: 3, HD: 2, SD: 1 }
    return (order[b as keyof typeof order] || 0) - (order[a as keyof typeof order] || 0)
  })

  const currentQuality = channel.sources[selectedSourceIndex]?.quality || "SD"

  return (
    <>
      <div ref={containerRef} className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-gradient-to-b from-black to-transparent z-20">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-white">{channel.baseName}</h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500 text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              EN DIRECT
            </span>
            {isVip && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-black">
                <Crown className="w-3 h-3" />
                VIP
              </span>
            )}
            {isAdmin && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500 text-black">
                <Crown className="w-3 h-3" />
                ADMIN
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {channel.sources.length > 1 && adUnlocked && (
              <div className="flex items-center gap-2 flex-wrap px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                <span className="text-xs text-white/60 font-medium mr-1">Sources:</span>
                {channel.sources.map((source, index) => {
                  const isActive = index === selectedSourceIndex
                  return (
                    <button
                      key={index}
                      onClick={() => switchSource(index)}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                        isActive
                          ? "bg-cyan-500 text-black shadow-lg"
                          : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                      title={source.name}
                    >
                      {source.quality} #{index + 1}
                    </button>
                  )
                })}
              </div>
            )}

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

        <div className="flex-1 relative">
          <video
            ref={videoRef}
            controls
            className="absolute inset-0 w-full h-full"
            style={{ display: videoLoaded ? "block" : "none" }}
          />

          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
              <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mb-4" />
              <p className="text-white text-lg">Chargement du flux...</p>
            </div>
          )}

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

          {!adUnlocked && !loading && !error && !isVip && !isAdmin && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black px-4">
              <Lock className="w-20 h-20 text-red-400 mb-6 animate-pulse" />
              <h3 className="text-3xl font-bold text-white mb-4 text-center">Stream verrouillé</h3>
              <p className="text-white/70 text-lg mb-2 text-center">
                Regardez une courte publicité pour débloquer ce stream
              </p>
              <p className="text-red-400 font-bold mb-8">Merci pour votre soutien ❤️</p>
              <button
                onClick={unlockStream}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-lg hover:scale-105 transition-all shadow-lg shadow-red-500/50"
              >
                <Unlock className="w-6 h-6" />
                <span>Débloquer le stream</span>
              </button>
              <div className="mt-8 text-center">
                <p className="text-white/50 text-sm mb-3">Ou profitez sans publicité !</p>
                <button
                  onClick={() => setShowVipModal(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-black font-bold hover:scale-105 transition-all shadow-lg shadow-amber-500/30 mx-auto"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Devenez VIP - 5€ à vie</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <VipUpgradeModal isOpen={showVipModal} onClose={() => setShowVipModal(false)} />
    </>
  )
}
