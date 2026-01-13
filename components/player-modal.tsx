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
} from "lucide-react"
import type { ChannelWithFavorite } from "@/lib/types"
import Hls from "hls.js"
import { useUserRole } from "@/lib/hooks/use-user-role"
import { VipUpgradeModal } from "@/components/vip-upgrade-modal"

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

const EXTERNAL_PROXY_BASE = "https://proxiesembed.movix.club/proxy?url="

type ProxyType = "default" | "external"

export function PlayerModal({ channel, isOpen, onClose, forceNoAds = false, country = "France" }: PlayerModalProps) {
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
  const [showShareLinks, setShowShareLinks] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [currentProxy, setCurrentProxy] = useState<ProxyType>("default")
  const [originalStreamUrl, setOriginalStreamUrl] = useState<string | null>(null)
  const [adAttempted, setAdAttempted] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStatus, setLoadingStatus] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<any>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const hiddenLinkRef = useRef<HTMLAnchorElement>(null)
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isOpen && channel) {
      console.log("[v0] Opening player for channel:", channel.baseName, "country:", country)
      document.body.style.overflow = "hidden"

      if (isVip || isAdmin || forceNoAds) {
        console.log("[v0] VIP/Admin/ForceNoAds detected, bypassing ad lock")
        setAdUnlocked(true)
        setTimeout(() => loadStreamSource(), 100)
      } else {
        setAdUnlocked(false)
      }

      setStreamUrl(null)
      setOriginalStreamUrl(null)
      setError(null)
      setVideoLoaded(false)
      setSelectedSourceIndex(0)
      setCurrentProxy("default")
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
      loadStreamSource()
    }, 800)
  }

  const handleUnlockMouseDown = (e: React.MouseEvent) => {
    if (hiddenLinkRef.current) {
      hiddenLinkRef.current.href = AD_URLS[0]
    }
  }

  const loadStreamSource = async (sourceIndex: number = selectedSourceIndex, proxyType: ProxyType = currentProxy) => {
    if (!channel) return

    setLoading(true)
    setError(null)
    setVideoLoaded(false)
    startLoadingAnimation()

    try {
      console.log("[v0] Fetching TvVoo stream for channel:", channel.baseId, "country:", country, "proxy:", proxyType)

      const response = await fetch(
        `/api/tvvoo/stream?channel=${encodeURIComponent(channel.baseId)}&countries=${encodeURIComponent(country)}`,
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] TvVoo stream data received")

      if (data.originalUrl) {
        // ✅ CORRECTION: Toujours sauvegarder l'URL originale
        setOriginalStreamUrl(data.originalUrl)

        let finalUrl: string
        if (proxyType === "external") {
          finalUrl = EXTERNAL_PROXY_BASE + encodeURIComponent(data.originalUrl)
          console.log("[v0] Using DIRECT external proxy (movix.club):", finalUrl)
        } else {
          finalUrl = `/api/proxy?url=${encodeURIComponent(data.originalUrl)}`
          console.log("[v0] Using default proxy")
        }

        setStreamUrl(finalUrl)
        playSource(finalUrl, proxyType)
      } else if (data.streamUrl) {
        setOriginalStreamUrl(data.streamUrl)
        setStreamUrl(data.streamUrl)
        playSource(data.streamUrl, proxyType)
      } else {
        throw new Error("Aucune source disponible")
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

    console.log("[v0] Switching proxy to:", proxyType)
    setCurrentProxy(proxyType)

    // ✅ CORRECTION: Vérifier si originalStreamUrl existe, sinon recharger complètement
    if (originalStreamUrl) {
      setLoading(true)
      setError(null)
      setVideoLoaded(false)
      stopTrackingSession()
      startLoadingAnimation()

      let finalUrl: string
      if (proxyType === "external") {
        finalUrl = EXTERNAL_PROXY_BASE + encodeURIComponent(originalStreamUrl)
        console.log("[v0] Switching to DIRECT external proxy:", finalUrl)
      } else {
        finalUrl = `/api/proxy?url=${encodeURIComponent(originalStreamUrl)}`
        console.log("[v0] Switching to default proxy:", finalUrl)
      }

      setStreamUrl(finalUrl)
      playSource(finalUrl, proxyType)
    } else {
      // ✅ CORRECTION: Si pas d'URL originale, recharger depuis l'API
      console.log("[v0] No original URL, reloading from API with proxy:", proxyType)
      stopTrackingSession()
      loadStreamSource(selectedSourceIndex, proxyType)
    }
  }

  const playSource = async (url: string, proxyType: ProxyType = currentProxy) => {
    const video = videoRef.current
    if (!video) return

    console.log("[v0] Setting video source:", url, "proxyType:", proxyType)

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    const isM3U8 = url.includes(".m3u8") || url.includes("m3u8") || url.includes("proxy")

    if (isM3U8 && Hls.isSupported()) {
      console.log("[v0] Using HLS.js for M3U8 stream")

      const hlsConfig: any = {
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        fragLoadingTimeOut: 60000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        manifestLoadingTimeOut: 30000,
        manifestLoadingMaxRetry: 4,
        levelLoadingTimeOut: 30000,
        levelLoadingMaxRetry: 4,
      }

      // ✅ CORRECTION: Amélioration du loader custom pour le proxy externe
      if (proxyType === "external") {
        hlsConfig.xhrSetup = (xhr: XMLHttpRequest, xhrUrl: string) => {
          console.log("[v0] HLS external requesting:", xhrUrl)
        }

        hlsConfig.loader = class CustomLoader extends Hls.DefaultConfig.loader {
          load(context: any, config: any, callbacks: any) {
            // ✅ Proxy tous les segments .ts ET les playlists .m3u8 sauf si déjà proxyfié
            if (context.url && !context.url.includes("movix.club")) {
              const needsProxy = 
                context.url.includes(".ts") || 
                context.type === "fragment" ||
                (context.url.includes(".m3u8") && context.type === "level")
              
              if (needsProxy) {
                const originalUrl = context.url
                context.url = EXTERNAL_PROXY_BASE + encodeURIComponent(originalUrl)
                console.log("[v0] Proxying via movix:", originalUrl, "->", context.url)
              }
            }
            super.load(context, config, callbacks)
          }
        }
      } else {
        hlsConfig.xhrSetup = (xhr: XMLHttpRequest, xhrUrl: string) => {
          console.log("[v0] HLS default requesting:", xhrUrl)
        }
      }

      const hls = new Hls(hlsConfig)
      hlsRef.current = hls

      hls.loadSource(url)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log("[v0] HLS manifest parsed, levels:", data.levels?.length)
        setLoadingProgress(100)
        setLoadingStatus("Prêt!")
        clearLoadingInterval()
        setVideoLoaded(true)
        setLoading(false)
        startTrackingSession()
        video.play().catch((e) => console.log("[v0] Autoplay blocked:", e))
      })

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
      video.addEventListener("loadedmetadata", () => {
        console.log("[v0] Video metadata loaded")
        setLoadingProgress(100)
        clearLoadingInterval()
        setVideoLoaded(true)
        setLoading(false)
        startTrackingSession()
        video.play().catch((e) => console.log("[v0] Autoplay blocked:", e))
      })
    } else {
      clearLoadingInterval()
      setError("HLS non supporté par ce navigateur")
      setLoading(false)
    }
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
  const playerLink = `${baseUrl}/player?url=${encodeURIComponent(channel.baseId)}`

  return (
    <>
      <a
        ref={hiddenLinkRef}
        href={AD_URLS[0]}
        target="_blank"
        rel="noreferrer noopener"
        style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
        aria-hidden="true"
      />

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
            <button
              onClick={() => setShowShareLinks(!showShareLinks)}
              className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
              title="Partager"
            >
              <Link2 className="w-5 h-5" />
            </button>

            {adUnlocked && (
              <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                <Radio className="w-4 h-4 text-white/60 mr-1" />
                <button
                  onClick={() => switchProxySource("default")}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                    currentProxy === "default"
                      ? "bg-cyan-500 text-black shadow-lg"
                      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                  title="Source 1 (Proxy par défaut)"
                >
                  Source 1
                </button>
                <button
                  onClick={() => switchProxySource("external")}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                    currentProxy === "external"
                      ? "bg-emerald-500 text-black shadow-lg"
                      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                  title="Source 2 (Proxy externe Movix)"
                >
                  Source 2
                </button>
              </div>
            )}

            {channel.sources.length > 1 && adUnlocked && (
              <div className="flex items-center gap-2 flex-wrap px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                <span className="text-xs text-white/60 font-medium mr-1">Qualité:</span>
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

        {/* Share links panel */}
        {showShareLinks && (
          <div className="absolute top-20 right-4 z-30 w-96 bg-black/95 backdrop-blur-lg rounded-xl border border-white/20 p-4 shadow-2xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-cyan-400" />
              Lien d'intégration
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-white/70 text-sm mb-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    Lecteur public
                  </span>
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={playerLink}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(playerLink, "player")}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg transition-all flex items-center gap-2"
                  >
                    {copiedLink === "player" ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-bold">Copié</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="text-sm font-bold">Copier</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-white/50 text-xs mt-4 leading-relaxed">
              Partagez ce lien pour permettre l'accès direct au lecteur intégré.
            </p>
          </div>
        )}

        <div className="flex-1 relative">
          <video
            ref={videoRef}
            controls
            className="absolute inset-0 w-full h-full"
            style={{ display: videoLoaded ? "block" : "none" }}
          />

          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
              <div className="relative mb-8">
                <div className="w-20 h-20 rounded-full border-4 border-white/10 flex items-center justify-center">
                  <div className="relative">
                    <div className="flex items-center justify-center gap-1">
                      <div
                        className="w-1 h-6 bg-white/80 rounded-full animate-pulse"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-1 h-8 bg-white/80 rounded-full animate-pulse"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-1 h-10 bg-white rounded-full animate-pulse"
                        style={{ animationDelay: "300ms" }}
                      />
                      <div
                        className="w-1 h-8 bg-white/80 rounded-full animate-pulse"
                        style={{ animationDelay: "450ms" }}
                      />
                      <div
                        className="w-1 h-6 bg-white/80 rounded-full animate-pulse"
                        style={{ animationDelay: "600ms" }}
                      />
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-cyan-500 animate-spin" />
              </div>

              <p className="text-white text-lg font-medium mb-2">Chargement du flux...</p>
              <p className="text-white/50 text-sm mb-6">{loadingStatus}</p>

              <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>

              <p className="text-white/40 text-xs mt-4">
                {currentProxy === "external" ? "Source 2 (Proxy externe)" : "Source 1 (Proxy par défaut)"}
              </p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
              <div className="text-center max-w-md px-6">
                <div className="relative mb-6">
                  <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-4 border-red-500 flex items-center justify-center">
                      <X className="w-6 h-6 text-red-500" />
                    </div>
                  </div>
                  <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full bg-red-500/20 animate-ping" />
                </div>

                <p className="text-white text-xl font-bold mb-2">Erreur de chargement</p>
                <p className="text-white/50 text-sm mb-8">{error}</p>

                <div className="flex gap-3 justify-center flex-wrap">
                  <button
                    onClick={handleReload}
                    className="px-6 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-all flex items-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Réessayer
                  </button>
                  <button
                    onClick={() => switchProxySource(currentProxy === "default" ? "external" : "default")}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold hover:from-emerald-500 hover:to-emerald-400 transition-all flex items-center gap-2"
                  >
                    <Radio className="w-5 h-5" />
                    {currentProxy === "default" ? "Essayer Source 2" : "Essayer Source 1"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!adUnlocked && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black via-gray-900 to-black">
              <div className="text-center max-w-md px-6">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Lock className="w-12 h-12 text-red-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Stream verrouillé</h3>
                <p className="text-white/70 mb-6">Regardez une courte publicité pour débloquer ce stream</p>
                <p className="text-amber-400 text-sm mb-6 flex items-center justify-center gap-2">
                  Merci pour votre soutien <span className="text-red-500">❤</span>
                </p>

                <button
                  onMouseDown={handleUnlockMouseDown}
                  onClick={unlockStream}
                  onTouchStart={handleUnlockMouseDown as any}
                  className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-lg shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 transition-all duration-300 active:scale-95"
                >
                  <Unlock className="w-6 h-6 transition-transform group-hover:rotate-12" />
                  <span>Débloquer le stream</span>
                  <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <div className="mt-4">
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
                    className="text-white/50 text-sm underline hover:text-white/70 transition-colors"
                  >
                    Cliquez ici si le bouton ne fonctionne pas
                  </a>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-white/50 text-sm mb-4">Ou profitez sans publicité !</p>
                  <button
                    onClick={() => setShowVipModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-bold hover:scale-105 transition-all duration-300 shadow-lg shadow-amber-500/20"
                  >
                    <Sparkles className="w-5 h-5" />
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
