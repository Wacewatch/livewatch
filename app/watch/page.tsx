"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { RefreshCw, Maximize, Minimize, Volume2, VolumeX } from "lucide-react"

function WatchPageContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get("id")
  const [channel, setChannel] = useState<any>(null)
  const [sources, setSources] = useState<any[]>([])
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showHeader, setShowHeader] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [statusText, setStatusText] = useState("Connexion...")
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<any>(null)

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
    if (!id) return

    fetch("/api/channels")
      .then((res) => res.json())
      .then((data) => {
        const channelsList = Array.isArray(data) ? data : []
        const foundChannel = channelsList.find((ch: any) => String(ch.id) === String(id))

        if (foundChannel) {
          setChannel(foundChannel)

          const normalizedName = foundChannel.name
            .toUpperCase()
            .replace(/\s*(HD|FHD|4K|UHD|SD)\s*/gi, "")
            .replace(/\s*$$\d+$$\s*/g, "")
            .replace(/\s+/g, " ")
            .trim()

          const alternativeSources = channelsList.filter((ch: any) => {
            const chNormalized = ch.name
              .toUpperCase()
              .replace(/\s*(HD|FHD|4K|UHD|SD)\s*/gi, "")
              .replace(/\s*$$\d+$$\s*/g, "")
              .replace(/\s+/g, " ")
              .trim()
            return chNormalized === normalizedName
          })

          setSources(alternativeSources)
        } else {
          setHasError(true)
        }
        setIsLoading(false)
      })
      .catch((error) => {
        console.error("[v0] Error fetching channel:", error)
        setHasError(true)
        setIsLoading(false)
      })
  }, [id])

  useEffect(() => {
    if (!sources[currentSourceIndex] || !videoRef.current) return

    const video = videoRef.current
    const streamUrl = `/api/proxy/play/${sources[currentSourceIndex].id}/index.m3u8`

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    setIsLoading(true)
    setStatusText("Connexion au flux...")
    setHasError(false)

    // Check if HLS.js is loaded
    const initHls = () => {
      if ((window as any).Hls && (window as any).Hls.isSupported()) {
        const hls = new (window as any).Hls({
          enableWorker: true,
          lowLatencyMode: false,

          // Buffer minimal pour démarrer IMMÉDIATEMENT
          backBufferLength: 5,
          maxBufferLength: 15, // Buffer max réduit
          maxMaxBufferLength: 30,
          maxBufferSize: 30 * 1000 * 1000,
          maxBufferHole: 0.5,

          // Démarrer dès le premier segment
          startLevel: 0, // Commencer avec la qualité la plus basse
          autoStartLoad: true,
          startFragPrefetch: true, // Précharger le premier fragment

          // Réduire les requêtes de manifest
          levelLoadingMaxRetry: 2,
          manifestLoadingMaxRetry: 2,

          // ABR agressif pour monter en qualité rapidement
          abrEwmaDefaultEstimate: 3000000, // Estimer 3Mbps par défaut
          abrEwmaFastLive: 2,
          abrEwmaSlowLive: 6,
          abrBandWidthFactor: 0.9,
          abrBandWidthUpFactor: 0.8,

          // Timeouts raisonnables
          fragLoadingTimeOut: 30000,
          fragLoadingMaxRetry: 2,
          fragLoadingRetryDelay: 500,
          manifestLoadingTimeOut: 15000,
          levelLoadingTimeOut: 15000,

          // Live sync - démarrer au plus proche du live
          liveSyncDurationCount: 2, // Juste 2 segments de buffer
          liveMaxLatencyDurationCount: 4,
          liveDurationInfinity: true,

          // Optimisations supplémentaires
          progressive: true,
          testBandwidth: false, // Ne pas tester, commencer direct
        })

        hls.loadSource(streamUrl)
        hls.attachMedia(video)

        hls.on((window as any).Hls.Events.MANIFEST_PARSED, () => {
          setStatusText("Chargement du flux...")
          // Lancer la lecture immédiatement
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
          console.log("[v0] HLS Error:", data.type, data.details, data.fatal)
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
        // Native HLS support (Safari)
        video.src = streamUrl
        video.addEventListener("loadedmetadata", () => {
          setIsLoading(false)
          video.play().catch(() => {})
        })
      }
    }

    // Wait for HLS.js to load
    if ((window as any).Hls) {
      initHls()
    } else {
      const checkInterval = setInterval(() => {
        if ((window as any).Hls) {
          clearInterval(checkInterval)
          initHls()
        }
      }, 50)

      // Timeout après 5 secondes
      setTimeout(() => clearInterval(checkInterval), 5000)
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [sources, currentSourceIndex])

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

  if (!id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-black to-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Paramètre ID manquant</h1>
          <p className="text-muted-foreground">Usage: /watch?id=CHANNEL_ID</p>
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
          <a href="/" className="text-primary hover:underline font-bold">
            Retour à l&apos;accueil
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
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
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm glass-card border border-emerald-400/50 text-emerald-400 hover:scale-105 transition-all duration-300"
            >
              Retour
            </a>
          </div>
        </div>

        {sources.length > 1 && (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-muted-foreground text-xs mr-2">Sources:</span>
            {sources.map((src, index) => (
              <button
                key={src.id}
                onClick={() => {
                  setCurrentSourceIndex(index)
                  setIsLoading(true)
                  setHasError(false)
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                  index === currentSourceIndex
                    ? "bg-primary text-primary-foreground"
                    : "glass-card border border-border hover:border-primary/50 hover:text-primary"
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
            console.error("[v0] Video element error")
            setHasError(true)
            setIsLoading(false)
          }}
        />
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-br from-black via-primary/5 to-accent/5 flex flex-col items-center justify-center backdrop-blur-sm z-30">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
          <p className="text-primary font-bold text-lg mt-4">{statusText}</p>
        </div>
      )}
    </div>
  )
}

export default function WatchPage() {
  return (
    <Suspense fallback={null}>
      <WatchPageContent />
    </Suspense>
  )
}
