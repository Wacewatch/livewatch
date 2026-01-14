"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import {
  X,
  Maximize,
  Minimize,
  RefreshCw,
  Lock,
  Unlock,
  Crown,
  Sparkles,
  Link2,
  Copy,
  Check,
  Radio,
  Cast,
} from "lucide-react"
import type { ChannelWithFavorite } from "@/lib/types"
import Hls from "hls.js"
import { useUserRole } from "@/lib/hooks/use-user-role"
import { VipUpgradeModal } from "@/components/vip-upgrade-modal"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"

interface PlayerModalProps {
  channel: ChannelWithFavorite | null
  isOpen: boolean
  onClose: () => void
  forceNoAds?: boolean
  country?: string
}

const AD_URL = "https://foreignabnormality.com/fg5c1f95w?key=5966fa8bf3f39db1aae7bc8b8d6bb8d8"

const AD_URLS = [
  "https://foreignabnormality.com/fg5c1f95w?key=5966fa8bf3f39db1aae7bc8b8d6bb8d8",
  "https://foreignabnormality.com/fg5c1f95w?key=5966fa8bf3f39db1aae7bc8b8d6bb8d8",
]

type ProxyType = "default" | "external"

export function PlayerModal({ channel, isOpen, onClose, forceNoAds = false, country = "France" }: PlayerModalProps) {
  const { role, isVip, isAdmin } = useUserRole()
  const { toast } = useToast()
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
  const [showShareLinks, setShowShareLinks] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [currentProxy, setCurrentProxy] = useState<ProxyType>("default")
  const [originalStreamUrl, setOriginalStreamUrl] = useState<string | null>(null)
  const [adAttempted, setAdAttempted] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStatus, setLoadingStatus] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  // Corrected hlsRef declaration to match the rest of the code
  const hlsRef = useRef<any>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const hiddenLinkRef = useRef<HTMLAnchorElement>(null)
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isOpen && channel) {
      console.log("[v0] Opening player for channel:", channel.baseName, "country:", country)
      document.body.style.overflow = "hidden"

      const urlParams = new URLSearchParams(window.location.search)
      const sourceParam = urlParams.get("source")
      const initialProxy: ProxyType = sourceParam === "2" ? "external" : "default"
      console.log("[v0] URL source parameter:", sourceParam, "=> using proxy:", initialProxy)

      if (isVip || isAdmin || forceNoAds) {
        console.log("[v0] VIP/Admin/ForceNoAds detected, bypassing ad lock")
        setAdUnlocked(true)
        setTimeout(() => loadStreamSource(0, initialProxy), 100)
      } else {
        setAdUnlocked(false)
      }

      setStreamUrl(null)
      setOriginalStreamUrl(null)
      setError(null)
      setVideoLoaded(false)
      setSelectedSourceIndex(0)
      setCurrentProxy(initialProxy)
      setLoadingProgress(0)
      setLoadingStatus("")
    } else if (!isOpen) {
      document.body.style.overflow = ""
      stopTrackingSession()
      clearLoadingInterval()
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
      clearLoadingInterval()
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [isOpen, channel, isVip, isAdmin, forceNoAds, country])

  const clearLoadingInterval = () => {
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current)
      loadingIntervalRef.current = null
    }
  }

  const startLoadingAnimation = () => {
    clearLoadingInterval()
    setLoadingProgress(0)
    setLoadingStatus("Connexion au serveur...")

    let progress = 0
    loadingIntervalRef.current = setInterval(() => {
      progress += Math.random() * 15
      if (progress > 90) progress = 90
      setLoadingProgress(Math.min(progress, 90))

      if (progress < 30) {
        setLoadingStatus("Connexion au serveur...")
      } else if (progress < 60) {
        setLoadingStatus("Récupération du flux...")
      } else {
        setLoadingStatus("Chargement des segments...")
      }
    }, 500)
  }

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
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }

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
    console.log("[v0] Unlock button clicked - attempting multiple methods")
    setAdAttempted(true)

    const adUrl = AD_URLS[Math.floor(Math.random() * AD_URLS.length)]
    let adOpened = false

    try {
      const win = window.open(adUrl, "_blank")
      if (win && !win.closed) {
        adOpened = true
        console.log("[v0] Ad opened via window.open")
      }
    } catch (e) {
      console.log("[v0] window.open failed:", e)
    }

    if (!adOpened) {
      try {
        const link = document.createElement("a")
        link.href = adUrl
        link.target = "_blank"
        link.rel = "noopener"
        link.setAttribute("data-bypass", "true")
        link.style.display = "none"
        document.body.appendChild(link)

        const clickEvent = new MouseEvent("click", {
          view: window,
          bubbles: true,
          cancelable: true,
        })
        link.dispatchEvent(clickEvent)

        setTimeout(() => {
          document.body.removeChild(link)
        }, 100)

        adOpened = true
        console.log("[v0] Ad opened via created link click")
      } catch (e) {
        console.log("[v0] Link click method failed:", e)
      }
    }

    if (!adOpened && hiddenLinkRef.current) {
      try {
        hiddenLinkRef.current.href = adUrl
        hiddenLinkRef.current.click()
        adOpened = true
        console.log("[v0] Ad opened via hidden link ref")
      } catch (e) {
        console.log("[v0] Hidden link ref failed:", e)
      }
    }

    if (!adOpened) {
      try {
        const form = document.createElement("form")
        form.method = "GET"
        form.action = adUrl
        form.target = "_blank"
        form.style.display = "none"
        document.body.appendChild(form)
        form.submit()
        setTimeout(() => {
          document.body.removeChild(form)
        }, 100)
        adOpened = true
        console.log("[v0] Ad opened via form submission")
      } catch (e) {
        console.log("[v0] Form submission failed:", e)
      }
    }

    if (!adOpened) {
      try {
        const newWin = window.open("about:blank", "_blank")
        if (newWin) {
          newWin.location.href = adUrl
          adOpened = true
          console.log("[v0] Ad opened via location assign")
        }
      } catch (e) {
        console.log("[v0] Location assign failed:", e)
      }
    }

    if (!adOpened) {
      setTimeout(() => {
        try {
          window.open(adUrl, "_blank", "noopener,noreferrer")
          console.log("[v0] Ad opened via delayed window.open")
        } catch (e) {
          console.log("[v0] Delayed open failed:", e)
        }
      }, 50)
    }

    setTimeout(() => {
      setAdUnlocked(true)
      const urlParams = new URLSearchParams(window.location.search)
      const sourceParam = urlParams.get("source")
      const initialProxy: ProxyType = sourceParam === "2" ? "external" : "default"
      loadStreamSource(0, initialProxy)
    }, 800)
  }

  const handleUnlockMouseDown = (e: React.MouseEvent) => {
    if (hiddenLinkRef.current) {
      hiddenLinkRef.current.href = AD_URLS[0]
    }
  }

  const loadStreamSource = async (sourceIndex: number = selectedSourceIndex, proxyType: ProxyType = "default") => {
    if (!channel) return

    console.log(`[v0] Lancement de la Source ${proxyType === "default" ? "1" : "2"}`)

    setLoading(true)
    setError(null)
    setVideoLoaded(false)
    setCurrentProxy(proxyType)
    startLoadingAnimation()

    try {
      if (proxyType === "external") {
        console.log("[v0] Fetching alternative stream via worker for channel:", channel.baseId)

        const response = await fetch(`/api/stream-alt?channel=${encodeURIComponent(channel.baseId)}`)

        if (!response.ok) {
          throw new Error(`Erreur source alternative: HTTP ${response.status}`)
        }

        const data = await response.json()
        console.log("[v0] Alternative stream response:", data)

        if (data.success && data.streamUrl) {
          const streamUrl = data.streamUrl
          console.log("[v0] Alternative stream URL:", streamUrl)
          setOriginalStreamUrl(streamUrl)
          setStreamUrl(streamUrl)
          playSource(streamUrl, proxyType)
        } else {
          throw new Error("Aucune source alternative disponible")
        }
      } else {
        console.log("[v0] Fetching TvVoo stream for channel:", channel.baseId, "country:", country)

        const response = await fetch(
          `/api/tvvoo/stream?channel=${encodeURIComponent(channel.baseId)}&countries=${encodeURIComponent(country)}`,
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        console.log("[v0] TvVoo stream data received")

        if (data.originalUrl) {
          setOriginalStreamUrl(data.originalUrl)
          const finalUrl = `/api/proxy?url=${encodeURIComponent(data.originalUrl)}`
          setStreamUrl(finalUrl)
          playSource(finalUrl, proxyType)
        } else if (data.streamUrl) {
          setOriginalStreamUrl(data.streamUrl)
          setStreamUrl(data.streamUrl)
          playSource(data.streamUrl, proxyType)
        } else {
          throw new Error("Aucune source disponible")
        }
      }
    } catch (err) {
      console.error("[v0] Error loading stream:", err)
      setError(err instanceof Error ? err.message : "Erreur de chargement")
      setLoading(false)
      clearLoadingInterval()
    }
  }

  const switchProxySource = (proxyType: ProxyType) => {
    if (proxyType === currentProxy) return

    console.log(`[v0] Changement vers Source ${proxyType === "default" ? "1" : "2"}`)
    setCurrentProxy(proxyType)
    stopTrackingSession()
    loadStreamSource(selectedSourceIndex, proxyType)
  }

  const playSource = async (url: string, proxyType: ProxyType = currentProxy) => {
    const video = videoRef.current
    if (!video) return

    console.log(`[v0] Démarrage lecture avec Source ${proxyType === "default" ? "1" : "2"}:`, url)

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    const isM3U8 = url.includes(".m3u8") || url.includes("m3u8") || url.includes("proxy")

    if (isM3U8 && Hls.isSupported()) {
      console.log("[v0] Using HLS.js for M3U8 stream")

      const hlsConfig: any = {
        debug: false,
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 80 * 1000 * 1000,
        maxBufferHole: 0.5,
        fragLoadingTimeOut: 60000,
        fragLoadingMaxRetry: 10,
        fragLoadingRetryDelay: 300,
        manifestLoadingTimeOut: 30000,
        manifestLoadingMaxRetry: 8,
        levelLoadingTimeOut: 30000,
        levelLoadingMaxRetry: 8,
        startLevel: -1,
        autoStartLoad: true,
        startFragPrefetch: true,
        abrEwmaDefaultEstimate: 1000000,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
      }

      if (proxyType === "external") {
        hlsConfig.xhrSetup = (xhr: XMLHttpRequest, xhrUrl: string) => {
          console.log("[v0] HLS external requesting:", xhrUrl.substring(0, 100))
          xhr.withCredentials = false
          xhr.timeout = 60000
        }
      } else {
        hlsConfig.xhrSetup = (xhr: XMLHttpRequest, xhrUrl: string) => {
          console.log("[v0] HLS default requesting:", xhrUrl.substring(0, 100))
          xhr.timeout = 60000
        }
      }

      const hls = new Hls(hlsConfig)
      hlsRef.current = hls

      hls.loadSource(url)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log("[v0] HLS manifest parsed, levels:", data.levels?.length)
        setLoadingProgress(95)
        setLoadingStatus("Presque prêt...")
      })

      video.addEventListener(
        "canplay",
        () => {
          console.log("[v0] Video ready to play (canplay event)")
          setLoadingProgress(100)
          setLoadingStatus("Lecture...")
          clearLoadingInterval()
          setTimeout(() => {
            setVideoLoaded(true)
            setLoading(false)
            startTrackingSession()
          }, 500)
        },
        { once: true },
      )

      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        console.log("[v0] Fragment loaded:", data.frag?.sn)
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("[v0] HLS error:", data.type, data.details, data)
        if (data.fatal) {
          clearLoadingInterval()
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("[v0] Network error, trying to recover...")
              if (
                data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
                data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT
              ) {
                setError("Impossible de charger le flux. Essayez l'autre source.")
                setLoading(false)
              } else {
                hls.startLoad()
              }
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("[v0] Media error, trying to recover...")
              hls.recoverMediaError()
              break
            default:
              setError("Erreur de lecture du flux")
              setLoading(false)
              break
          }
        }
      })
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      console.log("[v0] Using native HLS support")
      video.src = url
      video.addEventListener(
        "canplay",
        () => {
          console.log("[v0] Video ready to play (native HLS)")
          setLoadingProgress(100)
          clearLoadingInterval()
          setTimeout(() => {
            setVideoLoaded(true)
            setLoading(false)
            startTrackingSession()
          }, 500)
        },
        { once: true },
      )
    } else {
      clearLoadingInterval()
      setError("HLS non supporté par ce navigateur")
      setLoading(false)
    }
    // Attempt to play video after setting source
    video.play().catch((e) => console.log("[v0] Autoplay blocked:", e))
  }

  const handleReload = () => {
    console.log("[v0] Reloading stream")
    setVideoLoaded(false)
    setError(null)
    stopTrackingSession()
    loadStreamSource(selectedSourceIndex, currentProxy)
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
    loadStreamSource(index, currentProxy)
  }

  const handleCast = () => {
    const video = videoRef.current
    if (!video) return

    if ("remote" in video && (video as any).remote) {
      const remotePlayback = (video as any).remote
      remotePlayback
        .prompt()
        .then(() => {
          console.log("[v0] Cast initiated successfully")
          toast({
            title: "Cast démarré",
            description: "La diffusion vers votre appareil a commencé",
          })
        })
        .catch((err: Error) => {
          if (err.name !== "AbortError") {
            console.log("[v0] Cast error:", err.message)
            toast({
              title: "Cast non disponible",
              description: "Aucun appareil de diffusion détecté",
              variant: "destructive",
            })
          }
        })
    } else if ((video as any).webkitShowPlaybackTargetPicker) {
      try {
        ;(video as any).webkitShowPlaybackTargetPicker()
        console.log("[v0] AirPlay picker shown")
        toast({
          title: "AirPlay",
          description: "Sélectionnez votre appareil AirPlay",
        })
      } catch (e) {
        console.log("[v0] AirPlay not available:", e)
        toast({
          title: "AirPlay non disponible",
          description: "AirPlay n'est pas pris en charge",
          variant: "destructive",
        })
      }
    } else {
      console.log("[v0] Cast not supported on this device")
      toast({
        title: "Cast non supporté",
        description: "La diffusion n'est pas disponible sur cet appareil",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = async (link: string, type: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedLink(type)
      setTimeout(() => setCopiedLink(null), 2000)
    } catch (err) {
      console.error("[v0] Failed to copy link:", err)
    }
  }

  if (!isOpen || !channel) return null

  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const shareLink = `${baseUrl}/player?url=${encodeURIComponent(channel.baseId)}`
  const shareLinkSource2 = `${baseUrl}/player?url=${encodeURIComponent(channel.baseId)}&source=2`

  return (
    <>
      <a
        ref={hiddenLinkRef}
        href="#"
        target="_blank"
        rel="noopener noreferrer"
        style={{ position: "absolute", left: "-9999px", opacity: 0 }}
        aria-hidden="true"
      >
        Ad Link
      </a>

      <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <div
          ref={containerRef}
          className="relative w-full max-w-7xl max-h-[98vh] sm:max-h-[95vh] bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-lg sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          <div className="relative flex flex-wrap items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 md:p-6 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border-b border-cyan-500/20">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="relative w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg overflow-hidden bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex-shrink-0">
                  <Image
                    src={channel.logo || "/placeholder.svg"}
                    alt={channel.baseName}
                    fill
                    className="object-contain p-1 sm:p-1.5"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-white truncate">
                    {channel.baseName}
                  </h2>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                      <Radio className="w-2 h-2 sm:w-2.5 sm:h-2.5 animate-pulse" />
                      <span className="hidden xs:inline">EN DIRECT</span>
                      <span className="xs:hidden">LIVE</span>
                    </span>
                    {(isVip || isAdmin) && (
                      <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30">
                        <Crown className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                        <span className="hidden sm:inline">{isAdmin ? "ADMIN" : "VIP"}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Source Buttons */}
              <button
                onClick={() => switchProxySource("default")}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded transition-all ${
                  currentProxy === "default"
                    ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/50"
                    : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
                }`}
                disabled={loading}
              >
                <span className="hidden sm:inline">Source 1</span>
                <span className="sm:hidden">S1</span>
              </button>
              <button
                onClick={() => switchProxySource("external")}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded transition-all ${
                  currentProxy === "external"
                    ? "bg-green-500 text-white shadow-lg shadow-green-500/50"
                    : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
                }`}
                disabled={loading}
              >
                <span className="hidden sm:inline">Source 2</span>
                <span className="sm:hidden">S2</span>
              </button>

              {/* Icon buttons with responsive sizing */}
              <button
                onClick={handleCast}
                className="p-1.5 sm:p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white transition-all"
                title="Diffuser"
                disabled={!videoLoaded}
              >
                <Cast className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                onClick={() => setShowShareLinks(!showShareLinks)}
                className="p-1.5 sm:p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white transition-all"
                title="Partager"
              >
                <Link2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                onClick={handleReload}
                className="p-1.5 sm:p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white transition-all"
                title="Recharger"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${loading ? "animate-spin" : ""}`} />
              </button>

              <button
                onClick={toggleFullscreen}
                className="hidden sm:flex p-1.5 sm:p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white transition-all"
                title="Plein écran"
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>

              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all border border-red-500/30"
                title="Fermer"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {showShareLinks && (
              <div className="absolute top-full right-3 sm:right-6 mt-2 w-[calc(100vw-2rem)] sm:w-96 bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-3 sm:p-4 z-10">
                <h3 className="text-xs sm:text-sm font-semibold text-white mb-2 sm:mb-3">Liens de partage</h3>
                <div className="space-y-2">
                  {/* Source 1 Link */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-900/50 rounded px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-700">
                      <p className="text-[10px] sm:text-xs text-gray-400 mb-0.5">Source 1 (Par défaut)</p>
                      <p className="text-xs sm:text-sm text-gray-300 truncate">{shareLink}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(shareLink, "source1")}
                      className="p-2 sm:p-2.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-all flex-shrink-0"
                    >
                      {copiedLink === "source1" ? (
                        <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                      ) : (
                        <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                      )}
                    </button>
                  </div>

                  {/* Source 2 Link */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-900/50 rounded px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-700">
                      <p className="text-[10px] sm:text-xs text-gray-400 mb-0.5">Source 2 (Alternative)</p>
                      <p className="text-xs sm:text-sm text-gray-300 truncate">{shareLinkSource2}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(shareLinkSource2, "source2")}
                      className="p-2 sm:p-2.5 rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-all flex-shrink-0"
                    >
                      {copiedLink === "source2" ? (
                        <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                      ) : (
                        <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden min-h-0">
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              controls
              playsInline
              autoPlay
              preload="auto"
            />

            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-10 p-4">
                <Image
                  src="/logo.png"
                  alt="LIVEWATCH"
                  width={200}
                  height={60}
                  className="mb-6 sm:mb-8 w-32 sm:w-48 md:w-56 h-auto"
                  priority
                />
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-4 sm:mb-6">
                  <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full" />
                  <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" />
                </div>
                <p className="text-white text-base sm:text-lg md:text-xl font-semibold mb-2 text-center px-4">
                  Chargement du flux...
                </p>
                <p className="text-gray-400 text-xs sm:text-sm mb-4 text-center px-4">{loadingStatus}</p>
                <div className="w-48 sm:w-64 md:w-80 bg-gray-800 rounded-full h-1.5 sm:h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <p className="text-xs sm:text-sm text-cyan-400 mt-2 sm:mt-3 text-center px-4">
                  Source {currentProxy === "default" ? "1" : "2"} (Proxy{" "}
                  {currentProxy === "default" ? "par défaut" : "externe"})
                </p>
              </div>
            )}

            {/* Error display */}
            {error && !loading && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-10 p-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4 sm:mb-6">
                  <X className="w-6 h-6 sm:w-8 sm:h-8 text-red-400" />
                </div>
                <p className="text-white text-base sm:text-lg md:text-xl font-semibold mb-2 text-center">
                  Erreur de chargement
                </p>
                <p className="text-gray-400 text-xs sm:text-sm mb-6 text-center max-w-md px-4">{error}</p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={handleReload}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-cyan-500 hover:bg-cyan-600 text-white text-sm sm:text-base rounded-lg transition-all"
                  >
                    Réessayer
                  </button>
                  <button
                    onClick={() => switchProxySource(currentProxy === "default" ? "external" : "default")}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-green-500 hover:bg-green-600 text-white text-sm sm:text-base rounded-lg transition-all"
                  >
                    Essayer Source {currentProxy === "default" ? "2" : "1"}
                  </button>
                </div>
              </div>
            )}

            {/* Ad unlock screen */}
            {!adUnlocked && !loading && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center z-20 p-4 overflow-y-auto">
                <div className="max-w-md w-full text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center border-2 border-red-500/30">
                    <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-red-400" />
                  </div>

                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 sm:mb-3">
                    Stream verrouillé
                  </h3>
                  <p className="text-sm sm:text-base text-gray-400 mb-6 sm:mb-8 px-4">
                    Regardez une courte publicité pour débloquer ce stream
                  </p>

                  <p className="text-xs sm:text-sm text-amber-400 mb-4 sm:mb-6 font-medium">
                    Merci pour votre soutien ❤️
                  </p>

                  <button
                    onClick={unlockStream}
                    onMouseDown={handleUnlockMouseDown}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white text-sm sm:text-base font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-red-500/50 flex items-center justify-center gap-2 mx-auto"
                  >
                    <Unlock className="w-4 h-4 sm:w-5 sm:h-5" />
                    Débloquer le stream
                  </button>

                  {adAttempted && (
                    <p className="text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4 underline cursor-pointer hover:text-gray-400 px-4">
                      Cliquez ici si le bouton ne fonctionne pas
                    </p>
                  )}

                  <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-700/50">
                    <p className="text-xs sm:text-sm text-gray-400 mb-4">Ou profitez sans publicité !</p>
                    <button
                      onClick={() => setShowVipModal(true)}
                      className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm sm:text-base font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-amber-500/50 flex items-center justify-center gap-2 mx-auto"
                    >
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                      Devenez VIP - 5€ à vie
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <VipUpgradeModal isOpen={showVipModal} onClose={() => setShowVipModal(false)} />
    </>
  )
}
