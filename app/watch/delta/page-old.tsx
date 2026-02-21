"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { ArrowLeft, Lock, Sparkles, X } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { UserMenu } from "@/components/user-menu"
import { VersionToggle } from "@/components/version-toggle"

function DeltaWatchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const channelId = searchParams.get("id")
  const channelName = searchParams.get("name") || "Chaîne inconnue"
  
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [showAdModal, setShowAdModal] = useState(true)
  const [adWatched, setAdWatched] = useState(false)

  // Load stream when channel ID is available and ad is watched
  useEffect(() => {
    if (!channelId || !adWatched) return

    const loadStream = async () => {
      try {
        setIsLoading(true)
        setHasError(false)

        console.log("[v0] Delta: Resolving channel", channelId)

        // Step 1: Get channel info to get the URL
        const channelsRes = await fetch(`/api/delta/channels?country=${searchParams.get("country") || "France"}`)
        if (!channelsRes.ok) throw new Error("Failed to fetch channels")
        
        const channels = await channelsRes.json()
        const channel = channels.find((ch: any) => ch.id === channelId)
        
        if (!channel || !channel.url) {
          console.error("[v0] Delta: Channel not found")
          throw new Error("Channel not found")
        }

        console.log("[v0] Delta: Channel URL:", channel.url)

        // Step 2: Resolve the channel URL to get stream URL
        const resolveRes = await fetch(
          `/api/delta/stream-proxy?action=resolve&url=${encodeURIComponent(channel.url)}`
        )
        if (!resolveRes.ok) throw new Error("Failed to resolve stream")

        const { stream_url } = await resolveRes.json()
        console.log("[v0] Delta: Stream URL resolved")

        // Step 3: Use proxy to pipe the stream
        const proxyUrl = `/api/delta/stream-proxy?action=pipe&url=${encodeURIComponent(stream_url)}&name=${encodeURIComponent(channelName)}`
        console.log("[v0] Delta: Proxy URL ready")

        setStreamUrl(proxyUrl)
        setIsLoading(false)
      } catch (error) {
        console.error("[v0] Delta: Error loading stream:", error)
        setHasError(true)
        setIsLoading(false)
      }
    }

    loadStream()
  }, [channelId, adWatched, channelName, searchParams])

  // Initialize HLS player once stream URL is available
  useEffect(() => {
    if (!streamUrl || isLoading || hasError) return

    const video = document.getElementById("delta-video") as HTMLVideoElement
    if (!video) return

    // Load HLS.js
    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest"
    script.async = true
    
    script.onload = () => {
      const Hls = (window as any).Hls
      
      if (Hls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 10,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          startLevel: -1,
          autoStartLoad: true,
          startFragPrefetch: true,
          manifestLoadingMaxRetry: 3,
          levelLoadingMaxRetry: 3,
          fragLoadingMaxRetry: 3,
          fragLoadingTimeOut: 20000,
          manifestLoadingTimeOut: 10000,
          levelLoadingTimeOut: 10000,
        })

        console.log("[v0] HLS.js loading stream:", streamUrl)
        hls.loadSource(streamUrl)
        hls.attachMedia(video)

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log("[v0] HLS manifest parsed, starting playback")
          video.play().catch((e) => console.error("[v0] Autoplay failed:", e))
        })

        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
          console.error("[v0] HLS error:", data.type, data.details)
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log("[v0] Network error, trying to recover...")
                hls.startLoad()
                break
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log("[v0] Media error, trying to recover...")
                hls.recoverMediaError()
                break
              default:
                setHasError(true)
                break
            }
          }
        })

        return () => {
          hls.destroy()
        }
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native HLS support (Safari)
        console.log("[v0] Using native HLS support")
        video.src = streamUrl
        video.play().catch((e) => console.error("[v0] Autoplay failed:", e))
      } else {
        console.error("[v0] HLS not supported")
        setHasError(true)
      }
    }

    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [streamUrl, isLoading, hasError])

  const handleUnlockStream = () => {
    // Open ad in new tab
    try {
      window.open("https://foreignabnormality.com/bhqwpkdk?key=8f460637798a19e18426b1b949b45e95", "_blank")
    } catch (e) {
      console.error("[v0] Failed to open ad:", e)
    }
    
    // Close modal and mark ad as watched
    setTimeout(() => {
      setShowAdModal(false)
      setAdWatched(true)
    }, 500)
  }

  const skipAd = () => {
    setShowAdModal(false)
    setAdWatched(true)
  }

  if (!channelId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Chaîne non spécifiée</p>
          <Link href="/" className="text-primary hover:underline mt-4 inline-block">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-card border-b border-border/50 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-3 p-3 md:p-5">
          <div className="flex items-center gap-2 md:gap-4">
            <Link
              href={`/channels/delta?country=${searchParams.get("country") || "France"}`}
              className="hover:opacity-70 transition-opacity"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <Link href="/" className="relative w-32 h-8 md:w-40 md:h-10">
              <Image src="/livewatch-logo.png" alt="LiveWatch" fill className="object-contain" priority />
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <VersionToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Video Player */}
      <main className="flex-1 relative bg-black">
        {/* Channel Info Overlay */}
        <div className="absolute top-0 left-0 z-10 p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/50">
              <span className="text-purple-400 font-bold text-xs">DELTA</span>
            </div>
            <h1 className="text-lg md:text-xl font-bold text-white drop-shadow-lg">{channelName}</h1>
          </div>
        </div>

        {/* Video Element */}
        {!showAdModal && (
          <video
            id="delta-video"
            className="w-full h-full"
            controls
            playsInline
            autoPlay
            style={{ backgroundColor: "#000" }}
          />
        )}

        {/* Loading State */}
        {isLoading && !showAdModal && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
            <Image src="/livewatch-logo.png" alt="LiveWatch" width={200} height={80} className="mb-8 opacity-80" />
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full animate-pulse" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-white font-semibold mb-1">Chargement du flux...</p>
                <p className="text-sm text-gray-400">Connexion au serveur...</p>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {hasError && !showAdModal && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-center p-8">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
              <X className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Flux indisponible</h2>
            <p className="text-gray-400 mb-6">Impossible de charger ce stream. Essayez une autre source.</p>
            <Link
              href={`/channels/delta?country=${searchParams.get("country") || "France"}`}
              className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-colors"
            >
              Retour aux chaînes
            </Link>
          </div>
        )}

        {/* Ad Modal (exactly like Alpha) */}
        {showAdModal && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0d1f3c] via-[#060d18] to-black z-50">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />
            
            <div className="relative flex flex-col items-center gap-6 max-w-lg mx-auto px-6 text-center">
              {/* Logo */}
              <div className="text-6xl mb-2 animate-bounce-slow">🔒</div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30">
                <span className="text-purple-400 font-bold text-sm tracking-wider">DELTAWATCH</span>
              </div>

              {/* Title */}
              <h2 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-white via-gray-200 to-amber-200 bg-clip-text text-transparent">
                Stream verrouillé
              </h2>

              {/* Subtitle */}
              <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-md">
                Regardez une courte publicité pour débloquer ce stream
              </p>

              {/* Support Message */}
              <p className="text-amber-400 text-sm font-semibold flex items-center gap-2">
                <span>Merci pour votre soutien</span>
                <span className="text-red-500">❤️</span>
              </p>

              {/* Steps Box */}
              <div className="w-full glass-card border border-white/10 rounded-2xl p-5 backdrop-blur-lg space-y-3 text-left">
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    1
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Cliquez sur <strong className="text-amber-400">"Débloquer le stream"</strong> — un onglet publicitaire s'ouvre
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    2
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Attendez quelques secondes, puis <strong className="text-amber-400">fermez cet onglet</strong>
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    3
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Revenez ici — la <strong className="text-purple-400">lecture démarre automatiquement</strong> ▶️
                  </p>
                </div>
              </div>

              {/* Unlock Button */}
              <button
                onClick={handleUnlockStream}
                className="w-full px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-lg rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center justify-center gap-2"
              >
                <Lock className="w-5 h-5" />
                Débloquer le stream
              </button>

              {/* Skip Link */}
              <button
                onClick={skipAd}
                className="text-gray-500 hover:text-gray-300 text-xs underline transition-colors"
              >
                Cliquez ici si le bouton ne fonctionne pas
              </button>

              {/* VIP Option */}
              <div className="mt-4 pt-4 border-t border-white/10 w-full">
                <p className="text-gray-400 text-sm mb-3">Ou profitez sans publicité !</p>
                <Link
                  href="/vip"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-xl transition-all duration-200 hover:scale-105"
                >
                  <Sparkles className="w-5 h-5" />
                  Devenez VIP - 5€ à vie
                </Link>
              </div>

              {/* Channel Name */}
              <p className="text-gray-600 text-xs tracking-wide mt-2">▶ {channelName}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function DeltaWatchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400" /></div>}>
      <DeltaWatchContent />
    </Suspense>
  )
}
