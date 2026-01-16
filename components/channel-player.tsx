"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Settings,
  Loader2,
  AlertCircle,
  Tv,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Channel {
  id: string
  name: string
  logo_url: string | null
  stream_url: string
  category: string
  is_favorite: boolean
}

interface ChannelPlayerProps {
  channel: Channel | null
  onPrevChannel?: () => void
  onNextChannel?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

export function ChannelPlayer({
  channel,
  onPrevChannel,
  onNextChannel,
  hasPrev = false,
  hasNext = false,
}: ChannelPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hlsRef = useRef<any>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(80)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const handleFullscreenChange = useCallback(() => {
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    )
    setIsFullscreen(isCurrentlyFullscreen)
  }, [])

  useEffect(() => {
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
    document.addEventListener("mozfullscreenchange", handleFullscreenChange)
    document.addEventListener("MSFullscreenChange", handleFullscreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange)
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange)
    }
  }, [handleFullscreenChange])

  // Initialize HLS player
  useEffect(() => {
    if (!channel || !videoRef.current) return

    const video = videoRef.current
    setIsLoading(true)
    setError(null)

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    const initPlayer = async () => {
      try {
        // Check if stream URL is HLS
        const isHLS = channel.stream_url.includes(".m3u8")

        if (isHLS && typeof window !== "undefined") {
          const Hls = (await import("hls.js")).default

          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              backBufferLength: 90,
              maxBufferLength: 30,
              maxMaxBufferLength: 60,
            })

            hlsRef.current = hls

            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
              hls.loadSource(channel.stream_url)
            })

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setIsLoading(false)
              video.play().catch(() => {
                // Autoplay blocked, user needs to interact
                setIsPlaying(false)
              })
            })

            hls.on(Hls.Events.ERROR, (event, data) => {
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    if (retryCount < 3) {
                      setRetryCount((prev) => prev + 1)
                      hls.startLoad()
                    } else {
                      setError("Network error. Please check your connection.")
                      setIsLoading(false)
                    }
                    break
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    hls.recoverMediaError()
                    break
                  default:
                    setError("Failed to load stream. Please try again.")
                    setIsLoading(false)
                    break
                }
              }
            })

            hls.attachMedia(video)
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            // Safari native HLS support
            video.src = channel.stream_url
            video.addEventListener("loadedmetadata", () => {
              setIsLoading(false)
              video.play().catch(() => setIsPlaying(false))
            })
          }
        } else {
          // Regular video file
          video.src = channel.stream_url
          video.addEventListener("loadedmetadata", () => {
            setIsLoading(false)
            video.play().catch(() => setIsPlaying(false))
          })
        }

        video.addEventListener("error", () => {
          setError("Failed to load video stream")
          setIsLoading(false)
        })
      } catch (err) {
        setError("Failed to initialize player")
        setIsLoading(false)
      }
    }

    initPlayer()

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [channel, retryCount])

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleWaiting = () => setIsLoading(true)
    const handlePlaying = () => setIsLoading(false)

    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("waiting", handleWaiting)
    video.addEventListener("playing", handlePlaying)

    return () => {
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("waiting", handleWaiting)
      video.removeEventListener("playing", handlePlaying)
    }
  }, [])

  // Controls visibility
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
  }, [isPlaying])

  const handleMouseMove = useCallback(() => {
    showControlsTemporarily()
  }, [showControlsTemporarily])

  const handleMouseLeave = useCallback(() => {
    if (isPlaying) {
      setShowControls(false)
    }
  }, [isPlaying])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!channel) return

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault()
          togglePlay()
          break
        case "m":
          e.preventDefault()
          toggleMute()
          break
        case "f":
          e.preventDefault()
          toggleFullscreen()
          break
        case "Escape":
          if (isFullscreen) {
            exitFullscreen()
          }
          break
        case "ArrowUp":
          e.preventDefault()
          setVolume((prev) => Math.min(100, prev + 10))
          break
        case "ArrowDown":
          e.preventDefault()
          setVolume((prev) => Math.max(0, prev - 10))
          break
        case "ArrowLeft":
          e.preventDefault()
          if (hasPrev && onPrevChannel) onPrevChannel()
          break
        case "ArrowRight":
          e.preventDefault()
          if (hasNext && onNextChannel) onNextChannel()
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [channel, isPlaying, isFullscreen, hasPrev, hasNext, onPrevChannel, onNextChannel])

  // Volume control
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100
      videoRef.current.muted = isMuted
    }
  }, [volume, isMuted])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const toggleFullscreen = async () => {
    if (!playerContainerRef.current) return

    try {
      if (isFullscreen) {
        await exitFullscreen()
      } else {
        await enterFullscreen()
      }
    } catch (err) {
      console.error("Fullscreen error:", err)
    }
  }

  const enterFullscreen = async () => {
    const element = playerContainerRef.current
    if (!element) return

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen()
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen()
      } else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen()
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen()
      }
    } catch (err) {
      console.error("Enter fullscreen error:", err)
    }
  }

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen()
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen()
      }
    } catch (err) {
      console.error("Exit fullscreen error:", err)
    }
  }

  const handleRetry = () => {
    setRetryCount(0)
    setError(null)
    setIsLoading(true)
    if (videoRef.current && channel) {
      videoRef.current.src = ""
      // Trigger re-initialization
      const event = new Event("loadstart")
      videoRef.current.dispatchEvent(event)
    }
  }

  if (!channel) {
    return (
      <div className="relative aspect-video bg-gradient-to-br from-card to-background rounded-2xl overflow-hidden flex items-center justify-center border border-border/50">
        <div className="text-center space-y-4 p-8">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Tv className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Channel Selected</h3>
            <p className="text-muted-foreground">Select a channel from the list to start watching</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={playerContainerRef}
      className={cn(
        "relative bg-black rounded-2xl overflow-hidden group",
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : "aspect-video",
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video Element */}
      <video ref={videoRef} className="w-full h-full object-contain bg-black" playsInline onClick={togglePlay} />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-foreground font-medium">Loading {channel.name}...</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center space-y-4 p-6 max-w-md">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Playback Error</h3>
              <p className="text-muted-foreground text-sm">{error}</p>
            </div>
            <Button onClick={handleRetry} variant="outline" className="gap-2 bg-transparent">
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Channel Info Overlay */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="flex items-center gap-3">
          {channel.logo_url && (
            <img
              src={channel.logo_url || "/placeholder.svg"}
              alt={channel.name}
              className="w-10 h-10 rounded-lg object-contain bg-white/10 p-1"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = "none"
              }}
            />
          )}
          <div>
            <h2 className="text-white font-semibold text-lg">{channel.name}</h2>
            <p className="text-white/60 text-sm">{channel.category}</p>
          </div>
        </div>
      </div>

      {/* Controls Overlay */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Left Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 disabled:opacity-50"
              onClick={onPrevChannel}
              disabled={!hasPrev}
            >
              <SkipBack className="w-5 h-5" />
            </Button>

            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 w-12 h-12" onClick={togglePlay}>
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 disabled:opacity-50"
              onClick={onNextChannel}
              disabled={!hasNext}
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          {/* Center - Live Badge */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/50">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-sm font-medium">LIVE</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Volume Control */}
            <div className="flex items-center gap-2 group/volume">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={toggleMute}>
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
              <div className="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-300">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={100}
                  step={1}
                  onValueChange={([v]) => {
                    setVolume(v)
                    if (v > 0) setIsMuted(false)
                  }}
                  className="w-24"
                />
              </div>
            </div>

            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <Settings className="w-5 h-5" />
            </Button>

            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Click to Play Overlay (when paused) */}
      {!isPlaying && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={togglePlay}>
          <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center transition-transform hover:scale-110">
            <Play className="w-8 h-8 text-primary-foreground ml-1" />
          </div>
        </div>
      )}
    </div>
  )
}
