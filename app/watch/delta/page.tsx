"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { RefreshCw, Maximize, Minimize, Volume2, VolumeX, Lock, Sparkles, X } from "lucide-react"
import { useUserRole } from "@/lib/hooks/use-user-role"
import Image from "next/image"
import Link from "next/link"

function DeltaWatchContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get("id")
  const { isAdmin, isVip } = useUserRole()
  
  const [channel, setChannel] = useState<any>(null)
  const [sources, setSources] = useState<any[]>([])
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showHeader, setShowHeader] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [statusText, setStatusText] = useState("Connexion...")
  const [showAdModal, setShowAdModal] = useState(true)
  const [adWatched, setAdWatched] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<any>(null)

  // Check if user is VIP or admin - skip ad
  useEffect(() => {
    if (isAdmin || isVip) {
      setShowAdModal(false)
      setAdWatched(true)
    }
  }, [isAdmin, isVip])

  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.11/dist/hls.min.js"
    script.async = true
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  useEffect(() => {
    if (!id || !adWatched) return

    const country = searchParams.get("country") || "France"
    
    fetch(`/api/delta/channels?country=${country}`)
      .then((res) => res.json())
      .then((data) => {
        const channelsList = Array.isArray(data) ? data : []
        const foundChannel = channelsList.find((ch: any) => String(ch.id) === String(id))

        if (foundChannel) {
          setChannel(foundChannel)

          const normalizedName = foundChannel.name
            .toUpperCase()
            .replace(/\s*(HD|FHD|4K|UHD|SD)\s*/gi, "")
            .replace(/\s*\(\d+\)\s*/g, "")
            .replace(/\s+/g, " ")
            .trim()

          const alternativeSources = channelsList.filter((ch: any) => {
            const chNormalized = ch.name
              .toUpperCase()
              .replace(/\s*(HD|FHD|4K|UHD|SD)\s*/gi, "")
              .replace(/\s*\(\d+\)\s*/g, "")
              .replace(/\s+/g, " ")
              .trim()
            return chNormalized === normalizedName
          })

          setSources(alternativeSources.length > 0 ? alternativeSources : [foundChannel])
        } else {
          setHasError(true)
        }
        setIsLoading(false)
      })
      .catch((error) => {
        console.error("[v0] Delta: Error fetching channel:", error)
        setHasError(true)
        setIsLoading(false)
      })
  }, [id, adWatched, searchParams])

  useEffect(() => {
    if (!sources[currentSourceIndex] || !videoRef.current || !adWatched) return

    const video = videoRef.current
    const streamUrl = `/api/delta/proxy/play/${sources[currentSourceIndex].id}/index.m3u8`

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      console.log("[v0] Delta: Destroying previous HLS instance")
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    setIsLoading(true)
    setStatusText("Connexion au flux Delta...")
    setHasError(false)

    const initHls = () => {
      if ((window as any).Hls && (window as any).Hls.isSupported()) {
        const hls = new (window as any).Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 10,
          maxBufferLength: 20,
          maxMaxBufferLength: 30,
          maxBufferSize: 30 * 1000 * 1000,
          maxBufferHole: 0.5,
          startLevel: -1,
          autoStartLoad: true,
          startFragPrefetch: false,
          levelLoadingMaxRetry: 1,
          manifestLoadingMaxRetry: 1,
          manifestLoadingMaxRetryTimeout: 10000,
          levelLoadingMaxRetryTimeout: 10000,
          fragLoadingTimeOut: 20000,
          fragLoadingMaxRetry: 2,
          fragLoadingRetryDelay: 500,
          manifestLoadingTimeOut: 10000,
          levelLoadingTimeOut: 10000,
          liveSyncDurationCount: 2,
          liveMaxLatencyDurationCount: 5,
          liveDurationInfinity: true,
          progressive: true,
          testBandwidth: false,
        })

        hls.loadSource(streamUrl)
        hls.attachMedia(video)

        hls.on((window as any).Hls.Events.MANIFEST_PARSED, () => {
          setStatusText("Chargement du flux...")
          video.play().catch((e: any) => {
            video.muted = true
            video.play().catch(() => {})
          })
        })

        hls.on((window as any).Hls.Events.FRAG_LOADING, () => {
          setStatusText("Chargement...")
        })

        hls.on((window as any).Hls.Events.FRAG_LOADED, () => {
          setStatusText("Démarrage...")
        })

        hls.on((window as any).Hls.Events.FRAG_BUFFERED, () => {
          setIsLoading(false)
        })

        hls.on((window as any).Hls.Events.ERROR, (event: any, data: any) => {
          console.log("[v0] Delta HLS Error:", data.type, data.details, data.fatal)
          if (data.fatal) {
            switch (data.type) {
              case (window as any).Hls.ErrorTypes.NETWORK_ERROR:
                setStatusText("Reconnexion...")
                setTimeout(() => hls.startLoad(), 1000)
                break
              case (window as any).Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError()
                break
              default:
                hls.destroy()
                setHasError(true)
                break
            }
          }
        })

        hlsRef.current = hls
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamUrl
        video.addEventListener("loadedmetadata", () => {
          setIsLoading(false)
          video.play().catch(() => {})
        })
      }
    }

    if ((window as any).Hls) {
      initHls()
    } else {
      const checkInterval = setInterval(() => {
        if ((window as any).Hls) {
          clearInterval(checkInterval)
          initHls()
        }
      }, 50)
      setTimeout(() => clearInterval(checkInterval), 5000)
    }

    return () => {
      console.log("[v0] Delta: Cleanup - destroying HLS and stopping video")
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.src = ""
        videoRef.current.load()
      }
    }
  }, [sources, currentSourceIndex, adWatched])

  useEffect(() => {
    let timer: NodeJS.Timeout
    const handleMove = () => {
      setShowHeader(true)
      clearTimeout(timer)
      timer = setTimeout(() => setShowHeader(false), 3000)
    }

    window.addEventListener("mousemove", handleMove)
    window.addEventListener("touchstart", handleMove)
    timer = setTimeout(() => setShowHeader(false), 3000)

    return () => {
      clearTimeout(timer)
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("touchstart", handleMove)
    }
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true))
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false))
    }
  }

  const handleReload = () => {
    setIsLoading(true)
    setHasError(false)
    const currentSrc = currentSourceIndex
    setCurrentSourceIndex(-1)
    setTimeout(() => setCurrentSourceIndex(currentSrc), 100)
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleUnlockStream = () => {
    setShowAdModal(false)
    setAdWatched(true)
  }

  if (!id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-black to-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Paramètre ID manquant</h1>
          <p className="text-muted-foreground">Usage: /watch/delta?id=CHANNEL_ID</p>
        </div>
      </div>
    )
  }

  if (hasError && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-black to-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Chaîne non trouvée</h1>
          <p className="text-muted-foreground mb-4">ID: {id}</p>
          <Link href={`/channels/delta?country=${searchParams.get("country") || "France"}`} className="text-primary hover:underline font-bold">
            Retour aux chaînes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Ad Modal - only for non-VIP/non-admin users */}
      {showAdModal && !adWatched && !isAdmin && !isVip && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center">
          <div className="max-w-md w-full mx-4 text-center">
            <div className="mb-8">
              <Image
                src="/livewatch-logo.png"
                alt="LiveWatch"
                width={250}
                height={80}
                className="mx-auto"
              />
            </div>

            <div className="mb-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <Lock className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Stream verrouillé</h2>
              <p className="text-muted-foreground mb-4">
                Regardez une courte publicité pour débloquer ce stream
              </p>
              <p className="text-sm text-amber-400 font-semibold">Merci pour votre soutien ❤️</p>
            </div>

            <button
              onClick={handleUnlockStream}
              className="w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 mb-4 bg-red-500 text-white hover:bg-red-600 hover:scale-105"
            >
              <Lock className="w-5 h-5 inline mr-2" />
              Débloquer le stream
            </button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">Ou profitez sans publicité !</p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:scale-105 transition-all duration-300"
              >
                <Sparkles className="w-5 h-5" />
                Devenez VIP - 5€ à vie
              </Link>
            </div>

            <button
              onClick={() => {
                setShowAdModal(false)
                setAdWatched(true)
              }}
              className="mt-6 text-sm text-muted-foreground hover:text-foreground underline"
            >
              Cliquez ici si le bouton ne fonctionne pas
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-all duration-300 ${
          showHeader ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold glass-card border border-red-500/50 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
              EN DIRECT
            </span>
            <span className="px-4 py-2 rounded-full text-xs font-bold glass-card border border-purple-500/50 text-purple-400">
              DELTA
            </span>
            <span className="px-4 py-2 rounded-full text-xs font-bold glass-card border border-primary/50 text-primary">
              {channel?.name}
            </span>
            {sources.length > 1 && (
              <span className="px-4 py-2 rounded-full text-xs font-bold glass-card border border-accent/50 text-accent">
                Source {currentSourceIndex + 1}/{sources.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/channels/delta?country=${searchParams.get("country") || "France"}`}
              className="p-2 rounded-lg glass-card border border-border/50 hover:border-primary/50 transition-all hover:scale-105"
              title="Retour aux chaînes"
            >
              <X className="w-5 h-5 text-foreground" />
            </Link>
            <button
              onClick={toggleMute}
              className="p-2.5 rounded-xl glass-card border border-accent/50 text-accent hover:scale-105 transition-all duration-300"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleReload}
              className="p-2.5 rounded-xl glass-card border border-accent/50 text-accent hover:scale-105 transition-all duration-300"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl glass-card border border-primary/50 text-primary hover:scale-105 transition-all duration-300"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
            <Link
              href={`/channels/delta?country=${searchParams.get("country") || "France"}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm glass-card border border-emerald-400/50 text-emerald-400 hover:scale-105 transition-all duration-300"
            >
              Retour
            </Link>
          </div>
        </div>

        {sources.length > 1 && (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-muted-foreground text-xs mr-2">Sources alternatives:</span>
            {sources.map((src, index) => (
              <button
                key={`${src.id}-${index}`}
                onClick={() => {
                  setCurrentSourceIndex(index)
                  setIsLoading(true)
                  setHasError(false)
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                  index === currentSourceIndex
                    ? "bg-purple-500 text-white"
                    : "glass-card border border-border hover:border-purple-500/50 hover:text-purple-400"
                }`}
              >
                Source {index + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Video Player */}
      <div className="w-full h-full flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          controls
          autoPlay
          playsInline
          onPlaying={() => setIsLoading(false)}
          onWaiting={() => {
            setIsLoading(true)
            setStatusText("Mise en mémoire...")
          }}
          onCanPlay={() => setIsLoading(false)}
          onError={() => {
            console.error("[v0] Delta: Video element error")
            setHasError(true)
            setIsLoading(false)
          }}
        />
      </div>

      {/* Loading overlay */}
      {isLoading && adWatched && (
        <div className="absolute inset-0 bg-gradient-to-br from-black via-purple-900/5 to-pink-900/5 flex flex-col items-center justify-center backdrop-blur-sm z-30">
          <div className="mb-8">
            <Image
              src="/livewatch-logo.png"
              alt="LiveWatch"
              width={200}
              height={64}
              className="mx-auto opacity-80"
            />
          </div>
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          </div>
          <p className="text-purple-400 font-bold text-lg mt-4">{statusText}</p>
          <p className="text-muted-foreground text-sm mt-2">Connexion au serveur...</p>
          <p className="text-xs text-muted-foreground mt-1">Source Delta (Proxy par défaut)</p>
        </div>
      )}
    </div>
  )
}

export default function DeltaWatchPage() {
  return (
    <Suspense fallback={null}>
      <DeltaWatchContent />
    </Suspense>
  )
}
