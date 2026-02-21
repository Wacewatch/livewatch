"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Play, Tv } from "lucide-react"
import { UserMenu } from "@/components/user-menu"
import { Footer } from "@/components/footer"

interface Channel {
  id: string
  name: string
  logo: string
  country: string
}

interface DeltaChannelsClientProps {
  country: string
}

export function DeltaChannelsClient({ country }: DeltaChannelsClientProps) {
  const router = useRouter()
  const [channels, setChannels] = useState<Channel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/delta/channels?country=${encodeURIComponent(country)}`)
        
        if (!res.ok) {
          throw new Error("Erreur lors du chargement des chaînes")
        }

        const data = await res.json()
        setChannels(data)
      } catch (err) {
        console.error("[v0] Error fetching Delta channels:", err)
        setError("Erreur lors du chargement des chaînes")
      } finally {
        setIsLoading(false)
      }
    }

    fetchChannels()
  }, [country])

  const handleChannelClick = (channel: Channel) => {
    router.push(`/watch/delta?id=${encodeURIComponent(channel.id)}&name=${encodeURIComponent(channel.name)}`)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 glass-card border-b border-border/50 backdrop-blur-xl shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-purple-500/10 pointer-events-none" />

        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-3 md:gap-5 p-3 md:p-5 relative">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/" className="relative w-48 h-12 md:w-64 md:h-16 hover:opacity-80 transition-opacity">
              <Image src="/livewatch-logo.png" alt="LiveWatch" fill className="object-contain" priority />
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto p-6 md:p-10 lg:p-16 flex-1">
        <div className="mb-8">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg glass-card border border-border/50 hover:border-primary/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux pays</span>
          </button>
        </div>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 mb-4">
            <span className="text-purple-400 font-semibold text-sm">VERSION DELTA</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-primary mb-4">
            Chaînes - {country}
          </h1>
          <p className="text-xl text-muted-foreground">
            {isLoading ? "Chargement..." : `${channels.length} chaînes disponibles`}
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4" />
              <p className="text-muted-foreground">Chargement des chaînes Delta...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <Tv className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{error}</p>
          </div>
        )}

        {!isLoading && !error && channels.length === 0 && (
          <div className="text-center py-20">
            <Tv className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Aucune chaîne disponible pour ce pays</p>
          </div>
        )}

        {!isLoading && !error && channels.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => handleChannelClick(channel)}
                className="group glass-card border border-border/50 hover:border-purple-500/50 rounded-2xl p-4 md:p-6 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 flex flex-col items-center gap-3"
              >
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-gradient-to-br from-purple-500/20 to-primary/20 flex items-center justify-center">
                  {channel.logo ? (
                    <Image
                      src={channel.logo}
                      alt={channel.name}
                      fill
                      className="object-contain p-2"
                      loading="lazy"
                    />
                  ) : (
                    <Tv className="w-10 h-10 text-purple-400" />
                  )}
                </div>

                <div className="flex-1 flex flex-col items-center justify-center gap-2 w-full">
                  <h3 className="text-sm md:text-base font-semibold text-foreground group-hover:text-purple-400 transition-colors text-center line-clamp-2">
                    {channel.name}
                  </h3>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1 text-purple-400 text-xs">
                    <Play className="w-3 h-3" />
                    <span>Regarder</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
