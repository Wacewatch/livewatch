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
  Network,
  ChevronDown,
} from "lucide-react"
import type { ChannelWithFavorite } from "@/lib/types"
import Hls from "hls.js"
import { useUserRole } from "@/lib/hooks/use-user-role"
import { VipUpgradeModal } from "@/components/vip-upgrade-modal"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface PlayerModalProps {
  channel: ChannelWithFavorite | null
  isOpen: boolean
  onClose: () => void
  forceNoAds?: boolean
  country?: "France" | "Spain" | "Portugal" | "Germany" | "Italy" | "Belgium" | "Netherlands" | "Luxembourg"
}

const AD_URL = "https://foreignabnormality.com/fg5c1f95w?key=5966fa8bf3f39db1aae7bc8b8d6bb8d8"

const AD_URLS = [
  "https://foreignabnormality.com/fg5c1f95w?key=5966fa8bf3f39db1aae7bc8b8d6bb8d8",
  "https://foreignabnormality.com/fg5c1f95w?key=5966fa8bf3f39db1aae7bc8b8d6bb8d8",
]

type ProxyType = "default" | "external" | "rotator"

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
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3
  const [sourceConfig, setSourceConfig] = useState({
    source1_enabled: true,
    source2_enabled: true,
    source3_enabled: true,
  })
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

      fetch("/api/admin/source-config")
        .then((res) => res.json())
        .then((config) => {
          setSourceConfig(config)
        })
        .catch(() => {})

      const urlParams = new URLSearchParams(window.location.search)
      const sourceParam = urlParams.get("source")
      const initialProxy: ProxyType = sourceParam === "2" ? "external" : sourceParam === "3" ? "rotator" : "default"
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
      setRetryCount(0)
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
      const initialProxy: ProxyType = sourceParam === "2" ? "external" : sourceParam === "3" ? "rotator" : "default"
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

    console.log(`[v0] Lancement de la Source ${proxyType === "default" ? "1" : proxyType === "external" ? "2" : "3"}`)

    setLoading(true)
    setError(null)
    setVideoLoaded(false)
    setCurrentProxy(proxyType)
    startLoadingAnimation()

    try {
      if (proxyType === "rotator") {
        console.log("[v0] Fetching stream via rotating proxy for channel:", channel.baseId)

        const response = await fetch(
          `/api/tvvoo/stream?channel=${encodeURIComponent(channel.baseId)}&countries=${encodeURIComponent(country)}`,
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()

        if (data.originalUrl) {
          // Use proxy-rotator which now rewrites M3U8 URLs like /api/proxy does
          const rotatorUrl = `/api/proxy-rotator?url=${encodeURIComponent(data.originalUrl)}`
          setOriginalStreamUrl(data.originalUrl)
          setStreamUrl(rotatorUrl)
          playSource(rotatorUrl, proxyType)
        } else {
          throw new Error("Aucune source disponible")
        }
      } else if (proxyType === "external") {
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

      if (proxyType === "rotator" && retryCount < maxRetries) {
        console.log(`[v0] Source 3 failed, retrying with different proxy (attempt ${retryCount + 1}/${maxRetries})`)
        setRetryCount((prev) => prev + 1)
        toast({
          title: "Tentative avec un autre proxy...",
          description: `Essai ${retryCount + 1}/${maxRetries}`,
        })
        setTimeout(() => loadStreamSource(sourceIndex, proxyType), 1000)
        return
      }

      setError(err instanceof Error ? err.message : "Erreur de chargement")
      setLoading(false)
      clearLoadingInterval()
      setRetryCount(0)
    }
  }

  const switchProxySource = (proxyType: ProxyType) => {
    if (proxyType === currentProxy) return

    console.log(`[v0] Changement vers Source ${proxyType === "default" ? "1" : proxyType === "external" ? "2" : "3"}`)
    setCurrentProxy(proxyType)
    setRetryCount(0) // Reset retry count when switching source
    stopTrackingSession()
    loadStreamSource(selectedSourceIndex, proxyType)
  }

  const playSource = async (url: string, proxyType: ProxyType = currentProxy) => {
    const video = videoRef.current
    if (!video) return

    console.log(
      `[v0] Démarrage lecture avec Source ${proxyType === "default" ? "1" : proxyType === "external" ? "2" : "3"}:`,
      url,
    )

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

      // No custom loader needed for any source - the backend handles URL rewriting
      hlsConfig.xhrSetup = (xhr: XMLHttpRequest, xhrUrl: string) => {
        console.log("[v0] HLS requesting:", xhrUrl.substring(0, 100))
        xhr.timeout = 60000
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
              console.log("[v0] Network error, attempting recovery...")
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("[v0] Media error, attempting recovery...")
              hls.recoverMediaError()
              break
            default:
              setError("Impossible de charger le flux. Essayez l'autre source.")
              setLoading(false)
              break
          }
        }
      })
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      console.log("[v0] Using native HLS")
      video.src = url
      video.addEventListener(
        "canplay",
        () => {
          clearLoadingInterval()
          setVideoLoaded(true)
          setLoading(false)
          startTrackingSession()
        },
        { once: true },
      )
    } else {
      console.log("[v0] Direct video source")
      video.src = url
      video.addEventListener(
        "canplay",
        () => {
          clearLoadingInterval()
          setVideoLoaded(true)
          setLoading(false)
          startTrackingSession()
        },
        { once: true },
      )
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
  const playerLinkSource1 = `${baseUrl}/player?url=${encodeURIComponent(channel.baseId)}&source=1`
  const playerLinkSource2 = `${baseUrl}/player?url=${encodeURIComponent(channel.baseId)}&source=2`
  const playerLinkSource3 = `${baseUrl}/player?url=${encodeURIComponent(channel.baseId)}&source=3`

  const availableSources = [
    { type: "default" as ProxyType, enabled: sourceConfig.source1_enabled, name: "Source 1", desc: "Proxy par défaut" },
    { type: "external" as ProxyType, enabled: sourceConfig.source2_enabled, name: "Source 2", desc: "Proxy externe" },
    { type: "rotator" as ProxyType, enabled: sourceConfig.source3_enabled, name: "Source 3", desc: "Proxy rotatif" },
  ].filter((s) => s.enabled)

  return (
    <>
      <a
        ref={hiddenLinkRef}
        href={AD_URLS[0]}
        target="_blank"
        rel="noopener noreferrer"
        style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
        aria-hidden="true"
      />

      <div ref={containerRef} className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 md:p-4 bg-gradient-to-b from-black to-transparent z-20">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-white truncate max-w-[200px] sm:max-w-none">
              {channel.baseName}
            </h2>
            <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-red-500 text-white shrink-0">
              <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-white animate-pulse" />
              EN DIRECT
            </span>
            {isVip && (
              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-amber-500 text-black shrink-0">
                <Crown className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                VIP
              </span>
            )}
            {isAdmin && (
              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-green-500 text-black shrink-0">
                <Crown className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                ADMIN
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
            <button
              onClick={() => setShowShareLinks(!showShareLinks)}
              className="p-1.5 sm:p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all shrink-0"
              title="Partager"
            >
              <Link2 className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>

            {adUnlocked && (
              <DropdownMenu open={sourceMenuOpen} onOpenChange={setSourceMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all">
                    <Radio className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {currentProxy === "default" ? "Source 1" : currentProxy === "external" ? "Source 2" : "Source 3"}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-gray-900 border-gray-700">
                  {sourceConfig.source1_enabled && (
                    <DropdownMenuItem
                      onClick={() => switchProxySource("default")}
                      className={`flex items-center gap-2 cursor-pointer ${currentProxy === "default" ? "bg-cyan-500/20 text-cyan-400" : "text-white hover:bg-white/10"}`}
                    >
                      <Radio className="w-4 h-4" />
                      <span>Source 1</span>
                      <span className="ml-auto text-xs text-gray-400">Proxy par défaut</span>
                    </DropdownMenuItem>
                  )}
                  {sourceConfig.source2_enabled && (
                    <DropdownMenuItem
                      onClick={() => switchProxySource("external")}
                      className={`flex items-center gap-2 cursor-pointer ${currentProxy === "external" ? "bg-green-500/20 text-green-400" : "text-white hover:bg-white/10"}`}
                    >
                      <Network className="w-4 h-4" />
                      <span>Source 2</span>
                      <span className="ml-auto text-xs text-gray-400">Proxy externe</span>
                    </DropdownMenuItem>
                  )}
                  {sourceConfig.source3_enabled && (
                    <DropdownMenuItem
                      onClick={() => switchProxySource("rotator")}
                      className={`flex items-center gap-2 cursor-pointer ${currentProxy === "rotator" ? "bg-purple-500/20 text-purple-400" : "text-white hover:bg-white/10"}`}
                    >
                      <Network className="w-4 h-4" />
                      <span>Source 3</span>
                      <span className="ml-auto text-xs text-gray-400">Proxy rotatif</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {channel.sources.length > 1 && adUnlocked && (
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 shrink-0">
                <span className="text-[10px] sm:text-xs text-white/60 font-medium mr-0.5 sm:mr-1 hidden sm:inline">
                  Qualité:
                </span>
                {channel.sources.map((source, index) => {
                  const isActive = index === selectedSourceIndex
                  return (
                    <button
                      key={index}
                      onClick={() => switchSource(index)}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs font-bold transition-all ${
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

            {adUnlocked && videoLoaded && (
              <button
                onClick={handleCast}
                className="p-1.5 sm:p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all shrink-0"
                title="Diffuser (Cast)"
              >
                <Cast className="w-4 sm:w-5 h-4 sm:h-5" />
              </button>
            )}

            <button
              onClick={handleReload}
              className="p-1.5 sm:p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all shrink-0"
              title="Recharger"
            >
              <RefreshCw className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all shrink-0"
            >
              {isFullscreen ? (
                <Minimize className="w-4 sm:w-5 h-4 sm:h-5" />
              ) : (
                <Maximize className="w-4 sm:w-5 h-4 sm:h-5" />
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2.5 rounded-full bg-red-500/80 text-white hover:bg-red-500 transition-all shrink-0"
            >
              <X className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Share links panel */}
        {showShareLinks && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-cyan-500/20 p-4 sm:p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-bold text-white">Partager la chaîne</h3>
                <button
                  onClick={() => setShowShareLinks(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-400 mb-2">Lien lecteur - Source 1</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={playerLinkSource1}
                      readOnly
                      className="flex-1 rounded-lg bg-gray-800/50 border border-gray-700 px-2 sm:px-3 py-2 text-xs sm:text-sm text-white"
                    />
                    <button
                      onClick={() => copyToClipboard(playerLinkSource1, "player1")}
                      className="rounded-lg bg-cyan-600 hover:bg-cyan-700 px-3 py-2 text-white transition-colors shrink-0"
                    >
                      {copiedLink === "player1" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-gray-400 mb-2">Lien lecteur - Source 2</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={playerLinkSource2}
                      readOnly
                      className="flex-1 rounded-lg bg-gray-800/50 border border-gray-700 px-2 sm:px-3 py-2 text-xs sm:text-sm text-white"
                    />
                    <button
                      onClick={() => copyToClipboard(playerLinkSource2, "player2")}
                      className="rounded-lg bg-green-600 hover:bg-green-700 px-3 py-2 text-white transition-colors shrink-0"
                    >
                      {copiedLink === "player2" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-gray-400 mb-2">Lien lecteur - Source 3</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={playerLinkSource3}
                      readOnly
                      className="flex-1 rounded-lg bg-gray-800/50 border border-gray-700 px-2 sm:px-3 py-2 text-xs sm:text-sm text-white"
                    />
                    <button
                      onClick={() => copyToClipboard(playerLinkSource3, "player3")}
                      className="rounded-lg bg-purple-600 hover:bg-purple-700 px-3 py-2 text-white transition-colors shrink-0"
                    >
                      {copiedLink === "player3" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 relative">
          <video
            ref={videoRef}
            controls
            className="absolute inset-0 w-full h-full"
            style={{ display: videoLoaded ? "block" : "none" }}
          />

          {/* Loading screen */}
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 px-4">
              <div className="relative mb-6 sm:mb-8">
                <div className="flex flex-col items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <Image
                    src="/logo.png"
                    alt="LIVEWATCH"
                    width={180}
                    height={60}
                    className="drop-shadow-2xl sm:w-[240px] sm:h-[80px]"
                    priority
                  />
                </div>

                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full border-4 border-white/10 flex items-center justify-center">
                  <div className="relative">
                    <div className="flex items-center justify-center gap-1">
                      <div
                        className="w-0.5 sm:w-1 h-4 sm:h-6 bg-cyan-400/80 rounded-full animate-pulse"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-0.5 sm:w-1 h-5 sm:h-8 bg-cyan-400/80 rounded-full animate-pulse"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-0.5 sm:w-1 h-6 sm:h-10 bg-cyan-400 rounded-full animate-pulse"
                        style={{ animationDelay: "300ms" }}
                      />
                      <div
                        className="w-0.5 sm:w-1 h-5 sm:h-8 bg-cyan-400/80 rounded-full animate-pulse"
                        style={{ animationDelay: "450ms" }}
                      />
                      <div
                        className="w-0.5 sm:w-1 h-4 sm:h-6 bg-cyan-400/80 rounded-full animate-pulse"
                        style={{ animationDelay: "600ms" }}
                      />
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-transparent border-t-cyan-500 animate-spin" />
              </div>

              <p className="text-white text-base sm:text-lg font-medium mb-2 text-center">Chargement du flux...</p>
              <p className="text-white/50 text-xs sm:text-sm mb-4 sm:mb-6 text-center">{loadingStatus}</p>

              <div className="w-48 sm:w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>

              <p className="text-white/40 text-[10px] sm:text-xs mt-3 sm:mt-4 text-center">
                {currentProxy === "external"
                  ? "Source 2 (Proxy externe)"
                  : currentProxy === "rotator"
                    ? "Source 3 (Proxy rotatif)"
                    : "Source 1 (Proxy par défaut)"}
              </p>
            </div>
          )}

          {/* Error screen */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 px-4">
              <div className="text-center max-w-md">
                <div className="relative mb-4 sm:mb-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-4 border-red-500 flex items-center justify-center">
                      <X className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                    </div>
                  </div>
                  <div className="absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-red-500/20 animate-ping" />
                </div>

                <p className="text-white text-lg sm:text-xl font-bold mb-2">Erreur de chargement</p>
                <p className="text-white/50 text-xs sm:text-sm mb-6 sm:mb-8">{error}</p>

                <div className="flex gap-2 sm:gap-3 justify-center flex-wrap">
                  <button
                    onClick={handleReload}
                    className="px-4 sm:px-6 py-2 sm:py-3 rounded-xl bg-white/10 text-white text-sm sm:text-base font-bold hover:bg-white/20 transition-all flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 sm:w-5 h-4 sm:h-5" />
                    Réessayer
                  </button>
                  <button
                    onClick={() =>
                      switchProxySource(
                        currentProxy === "default" ? "external" : currentProxy === "external" ? "rotator" : "default",
                      )
                    }
                    className="px-4 sm:px-6 py-2 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm sm:text-base font-bold hover:from-emerald-500 hover:to-emerald-400 transition-all flex items-center gap-2"
                  >
                    <Radio className="w-4 sm:w-5 h-4 sm:h-5" />
                    {currentProxy === "default"
                      ? "Essayer Source 2"
                      : currentProxy === "external"
                        ? "Essayer Source 3"
                        : "Essayer Source 1"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Locked screen */}
          {!adUnlocked && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black via-gray-900 to-black px-4">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-red-400" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">Stream verrouillé</h3>
                <p className="text-white/70 text-sm sm:text-base mb-4 sm:mb-6">
                  Regardez une courte publicité pour débloquer ce stream
                </p>
                <p className="text-amber-400 text-xs sm:text-sm mb-4 sm:mb-6 flex items-center justify-center gap-2">
                  Merci pour votre soutien <span className="text-red-500">❤</span>
                </p>

                <button
                  onMouseDown={handleUnlockMouseDown}
                  onClick={unlockStream}
                  onTouchStart={handleUnlockMouseDown as any}
                  className="group relative inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-base sm:text-lg shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 transition-all duration-300 active:scale-95"
                >
                  <Unlock className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:rotate-12" />
                  <span>Débloquer le stream</span>
                  <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <div className="mt-3 sm:mt-4">
                  <a
                    href={AD_URLS[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      setTimeout(() => {
                        setAdUnlocked(true)
                        loadStreamSource()
                      }, 800)
                    }}
                    className="text-white/50 text-xs sm:text-sm underline hover:text-white/70 transition-colors"
                  >
                    Cliquez ici si le bouton ne fonctionne pas
                  </a>
                </div>

                <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10">
                  <p className="text-white/50 text-xs sm:text-sm mb-3 sm:mb-4">Ou profitez sans publicité !</p>
                  <button
                    onClick={() => setShowVipModal(true)}
                    className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-black text-sm sm:text-base font-bold hover:scale-105 transition-all duration-300 shadow-lg shadow-amber-500/20"
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

      <VipUpgradeModal isOpen={showVipModal} onClose={() => setShowVipModal(false)} />
    </>
  )
}
