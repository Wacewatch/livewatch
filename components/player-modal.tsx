"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Maximize, Minimize, ExternalLink, RefreshCw, Cast, Loader2, Wifi, WifiOff } from "lucide-react"
import type { GroupedChannel } from "@/lib/types"

interface PlayerModalProps {
  channel: GroupedChannel | null
  isOpen: boolean
  onClose: () => void
}

export function PlayerModal({ channel, isOpen, onClose }: PlayerModalProps) {
  const [selectedSource, setSelectedSource] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playerStatus, setPlayerStatus] = useState<"loading" | "buffering" | "playing" | "error">("loading")
  const [statusMessage, setStatusMessage] = useState("Initialisation...")
  const retryCountRef = useRef(0)
  const [playerKey, setPlayerKey] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const getPlayerUrl = useCallback((sourceUrl: string, key: number) => {
    const url = `/api/player?url=${encodeURIComponent(sourceUrl)}&k=${key}`
    console.log("[v0] Generated player URL:", url)
    console.log("[v0] Source URL:", sourceUrl)
    return url
  }, [])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log("[v0] Received postMessage:", event.data)
      if (event.data?.type === "playerStatus") {
        const { status, message } = event.data
        console.log("[v0] Player status update:", status, message)
        setPlayerStatus(status)
        if (message) setStatusMessage(message)
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  useEffect(() => {
    console.log("[v0] PlayerModal isOpen changed:", isOpen)
    if (isOpen) {
      console.log("[v0] Opening player for channel:", channel?.displayName)
      console.log("[v0] Channel sources:", channel?.sources)
      document.body.style.overflow = "hidden"
      setSelectedSource(0)
      retryCountRef.current = 0
      const newKey = Date.now()
      console.log("[v0] Setting player key:", newKey)
      setPlayerKey(newKey)
      setPlayerStatus("loading")
      setStatusMessage("Initialisation...")
    } else {
      document.body.style.overflow = ""
      setPlayerKey(0)
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen, channel])

  const toggleFullscreen = () => {
    const container = containerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true))
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false))
    }
  }

  const handleReload = () => {
    console.log("[v0] Reloading player...")
    retryCountRef.current += 1
    const newKey = Date.now()
    console.log("[v0] New player key:", newKey)
    setPlayerKey(newKey)
    setPlayerStatus("loading")
    setStatusMessage("Rechargement...")
  }

  const handleSourceChange = (index: number) => {
    console.log("[v0] Changing source to index:", index)
    console.log("[v0] New source URL:", channel?.sources[index]?.url)
    setSelectedSource(index)
    retryCountRef.current = 0
    const newKey = Date.now()
    console.log("[v0] New player key:", newKey)
    setPlayerKey(newKey)
    setPlayerStatus("loading")
    setStatusMessage("Changement de source...")
  }

  const openDirectStream = () => {
    const sourceUrl = channel?.sources[selectedSource]?.url
    if (sourceUrl) {
      window.open(sourceUrl, "_blank")
    }
  }

  const openInVLC = () => {
    const sourceUrl = channel?.sources[selectedSource]?.url
    if (!sourceUrl || !channel) return

    window.location.href = `vlc://${sourceUrl}`

    setTimeout(() => {
      const blob = new Blob([`#EXTM3U\n#EXTINF:-1,${channel.displayName}\n${sourceUrl}`], {
        type: "application/x-mpegURL",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${channel.displayName}.m3u8`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 500)
  }

  if (!isOpen || !channel) return null

  const currentSourceUrl = channel.sources[selectedSource]?.url
  console.log("[v0] Current source URL:", currentSourceUrl)
  console.log("[v0] Player key:", playerKey)

  const getStatusIcon = () => {
    switch (playerStatus) {
      case "loading":
        return <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
      case "buffering":
        return <Wifi className="w-4 h-4 text-yellow-400 animate-pulse" />
      case "playing":
        return <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      case "error":
        return <WifiOff className="w-4 h-4 text-red-400" />
      default:
        return null
    }
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header with controls */}
      <div className="flex flex-col bg-gradient-to-b from-black to-transparent p-4 z-20">
        {/* Top row - title and actions */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">{channel.displayName}</h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500 text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              EN DIRECT
            </span>
            {channel.sources.length > 1 && (
              <span className="text-white/50 text-sm">
                Source {selectedSource + 1}/{channel.sources.length}
              </span>
            )}
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
              onClick={openDirectStream}
              className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
              title="Flux direct M3U8"
            >
              <ExternalLink className="w-5 h-5" />
            </button>

            <button
              onClick={openInVLC}
              className="p-2.5 rounded-full bg-orange-500/80 text-white hover:bg-orange-500 transition-all"
              title="Ouvrir dans VLC"
            >
              <Cast className="w-5 h-5" />
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

        {channel.sources.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/60 font-medium mr-1">Sources:</span>
            {channel.sources.map((source, index) => (
              <button
                key={source.id}
                onClick={() => handleSourceChange(index)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  index === selectedSource
                    ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/30"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                Source {index + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Video player area - iframe key only changes on explicit actions */}
      <div className="flex-1 relative">
        {currentSourceUrl && playerKey > 0 ? (
          <iframe
            ref={iframeRef}
            key={playerKey}
            src={getPlayerUrl(currentSourceUrl, playerKey)}
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay; fullscreen; encrypted-media"
            allowFullScreen
            onLoad={() => console.log("[v0] Iframe loaded successfully")}
            onError={(e) => console.error("[v0] Iframe load error:", e)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <p>Aucune source disponible</p>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="bg-black/90 border-t border-white/10 px-4 py-3 flex items-center gap-3 z-20">
        {getStatusIcon()}
        <span
          className={`text-sm font-medium ${
            playerStatus === "playing"
              ? "text-green-400"
              : playerStatus === "error"
                ? "text-red-400"
                : playerStatus === "buffering"
                  ? "text-yellow-400"
                  : "text-cyan-400"
          }`}
        >
          {statusMessage}
        </span>

        {playerStatus === "error" && (
          <button
            onClick={handleReload}
            className="ml-auto px-4 py-1.5 rounded-full text-xs font-semibold bg-cyan-500 text-black hover:bg-cyan-400 transition-all"
          >
            Reessayer
          </button>
        )}

        {playerStatus === "buffering" && (
          <span className="ml-auto text-xs text-white/40">Patientez, chargement en cours...</span>
        )}
      </div>
    </div>
  )
}
