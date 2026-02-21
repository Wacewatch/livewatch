"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { UserMenu } from "@/components/user-menu"
import { VersionToggle } from "@/components/version-toggle"

export default function DeltaWatchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const channelId = searchParams.get("id")
  const channelName = searchParams.get("name")
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<any>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!channelId) return

    const loadStream = async () => {
      try {
        setIsLoading(true)
        setHasError(false)

        const res = await fetch(`/api/delta/stream?id=${encodeURIComponent(channelId)}`)
        
        if (!res.ok) {
          throw new Error("Stream not found")
        }

        const data = await res.json()
        
        // Use proxy URL for the stream
        const proxyUrl = `/api/naga/proxy?channel=${encodeURIComponent(channelId)}&path=index.m3u8`
        setStreamUrl(proxyUrl)
      } catch (error) {
        console.error("[v0] Error loading Delta stream:", error)
        setHasError(true)
      } finally {
        setIsLoading(false)
      }
    }

    loadStream()
  }, [channelId])

  useEffect(() => {
    if (!streamUrl || !videoRef.current) return

    const loadHls = async () => {
      if ((window as any).Hls && (window as any).Hls.isSupported()) {
        const hls = new (window as any).Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 10,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 60 * 1000 * 1000,
          startLevel: -1,
          autoStartLoad: true,
        })

        hlsRef.current = hls

        hls.loadSource(streamUrl)
        hls.attachMedia(videoRef.current)

        hls.on((window as any).Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play()
          setIsLoading(false)
        })

        hls.on((window as any).Hls.Events.ERROR, (_event: any, data: any) => {
          if (data.fatal) {
            setHasError(true)
            setIsLoading(false)
          }
        })
      } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
        videoRef.current.src = streamUrl
        videoRef.current.play()
        setIsLoading(false)
      }
    }

    loadHls()

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [streamUrl])

  const handleRetry = () => {
    setHasError(false)
    setIsLoading(true)
    window.location.reload()
  }

  if (!channelId || !channelName) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Chaîne non spécifiée</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 glass-card border-b border-border/50 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between p-3 md:p-5">
          <div className="flex items-center gap-4">
            <Link href="/" className="relative w-48 h-12 md:w-64 md:h-16">
              <Image src="/livewatch-logo.png" alt="LiveWatch" fill className="object-contain" />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <VersionToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg glass-card border border-border/50 hover:border-purple-500/50 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour</span>
        </button>

        <div className="glass-card border border-purple-500/30 rounded-2xl p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 mb-2">
                <span className="text-purple-400 font-semibold text-xs">DELTA</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{channelName}</h1>
            </div>
          </div>

          <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4" />
                  <p className="text-white">Chargement du stream Delta...</p>
                </div>
              </div>
            )}

            {hasError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                <div className="text-center">
                  <p className="text-white mb-4">Erreur de chargement</p>
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Réessayer
                  </button>
                </div>
              </div>
            )}

            <video
              ref={videoRef}
              controls
              autoPlay
              className="w-full h-full"
              playsInline
            />
          </div>
        </div>
      </main>
    </div>
  )
}
