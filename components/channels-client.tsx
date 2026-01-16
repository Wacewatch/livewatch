"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, Star, Filter, ArrowLeft, LaptopMinimal as TvMinimal, Wifi, Globe } from "lucide-react"
import { PlayerModal } from "@/components/player-modal"
import { useFavorites } from "@/lib/hooks/use-favorites"
import type { GroupedChannel } from "@/lib/types"
import Image from "next/image"
import Link from "next/link"
import { UserMenu } from "@/components/user-menu"

interface ChannelsClientProps {
  country: string
}

function getQualityBadge(quality: string) {
  switch (quality?.toUpperCase()) {
    case "4K":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30"
    case "FHD":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    case "HD":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    case "SD":
      return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    default:
      return "bg-blue-500/20 text-blue-400 border-blue-500/30"
  }
}

function getCategoryBadge(category: string) {
  switch (category?.toLowerCase()) {
    case "sport":
      return "bg-green-500/20 text-green-400 border-green-500/30"
    case "actualités":
    case "news":
      return "bg-red-500/20 text-red-400 border-red-500/30"
    case "enfants":
    case "kids":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    case "cinéma":
    case "cinema":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30"
    case "musique":
    case "music":
      return "bg-pink-500/20 text-pink-400 border-pink-500/30"
    case "documentaire":
      return "bg-teal-500/20 text-teal-400 border-teal-500/30"
    case "généraliste":
      return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
    default:
      return "bg-primary/20 text-primary border-primary/30"
  }
}

export function ChannelsClient({ country }: ChannelsClientProps) {
  const [channels, setChannels] = useState<GroupedChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedChannel, setSelectedChannel] = useState<GroupedChannel | null>(null)
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const { favorites, toggleFavorite, count: favoritesCount } = useFavorites()

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        console.log("[v0] Fetching channels for country:", country)
        const response = await fetch(`/api/tvvoo/channels?countries=${encodeURIComponent(country)}`)

        if (!response.ok) {
          console.error("[v0] TvVoo API returned:", response.status)
          setLoading(false)
          return
        }

        const data = await response.json()
        console.log("[v0] Loaded channels:", data.length)
        setChannels(data)
      } catch (error) {
        console.error("[v0] Error fetching channels:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchChannels()
  }, [country])

  const channelsWithFavorites = useMemo(() => {
    return channels.map((ch) => ({
      ...ch,
      isFavorite: favorites.includes(ch.baseId),
    }))
  }, [channels, favorites])

  const categories = useMemo(() => {
    const cats = new Set(channels.map((c) => c.category).filter(Boolean))
    return ["all", ...Array.from(cats).sort()]
  }, [channels])

  const filteredChannels = useMemo(() => {
    let filtered = channelsWithFavorites

    if (showOnlyFavorites) {
      filtered = filtered.filter((c) => c.isFavorite)
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((c) => c.category === selectedCategory)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((c) => c.baseName.toLowerCase().includes(query))
    }

    return filtered.sort((a, b) => a.baseName.localeCompare(b.baseName))
  }, [channelsWithFavorites, searchQuery, showOnlyFavorites, selectedCategory])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
          <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            Chargement des chaînes...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 glass-card border-b border-border/50 backdrop-blur-xl shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10 pointer-events-none" />

        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-3 md:gap-5 flex-wrap p-3 md:p-5 relative">
          <div className="flex items-center gap-2 md:gap-4">
            <Link
              href="/"
              className="w-12 h-12 rounded-2xl glass-card border border-border/50 flex items-center justify-center hover:border-primary/50 hover:scale-105 transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </Link>
            <Link href="/" className="relative w-48 h-12 md:w-64 md:h-16 hover:opacity-80 transition-opacity">
              <Image src="/livewatch-logo.png" alt="LiveWatch" fill className="object-contain" priority />
            </Link>
          </div>

          <div className="relative flex-1 max-w-2xl order-last md:order-none w-full md:w-auto">
            <Search className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-primary" />
            <input
              type="text"
              placeholder="Rechercher une chaîne..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 md:pl-14 pr-3 md:pr-5 py-3 md:py-4 rounded-2xl glass-card border border-border/50 text-sm md:text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:shadow-lg focus:shadow-primary/20 transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <UserMenu />
            <button
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`relative w-12 h-12 md:w-14 md:h-14 rounded-2xl glass-card border transition-all duration-300 flex items-center justify-center ${
                showOnlyFavorites
                  ? "border-yellow-400/50 text-yellow-400 scale-110"
                  : "border-border/50 text-foreground hover:border-primary/50 hover:scale-105"
              }`}
            >
              <Star className="w-5 h-5 md:w-6 md:h-6" fill={showOnlyFavorites ? "currentColor" : "none"} />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 text-black text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                  {favoritesCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto p-3 md:p-6 lg:p-10">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <TvMinimal className="w-6 h-6 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                {country}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-6 text-muted-foreground text-sm">
            <span className="flex items-center gap-2">
              <TvMinimal className="w-4 h-4" />
              {filteredChannels.length} chaînes
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              En direct
            </span>
          </div>
        </div>

        <div className="mb-8 glass-card border border-border/50 rounded-2xl p-4 md:p-5 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Filtres</h3>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Catégorie</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl glass-card border border-border/50 bg-card text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-card text-foreground">
                  {cat === "all" ? "Toutes les catégories" : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredChannels.length === 0 ? (
          <div className="text-center py-16 md:py-32">
            <h3 className="text-3xl font-bold text-foreground mb-3">Aucune chaîne trouvée</h3>
            <p className="text-muted-foreground text-lg">Essayez une autre recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
            {filteredChannels.map((channel) => (
              <div
                key={channel.baseId}
                onClick={() => setSelectedChannel(channel)}
                className="group glass-card border border-border/50 rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/20 transition-all duration-300"
              >
                <div className="relative h-40 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    {channel.logo ? (
                      <Image
                        src={channel.logo || "/placeholder.svg"}
                        alt={channel.baseName}
                        width={120}
                        height={60}
                        className="object-contain max-h-16 drop-shadow-2xl"
                        unoptimized
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center backdrop-blur-sm border border-cyan-500/20">
                        <div className="text-4xl font-black text-cyan-400">TV</div>
                      </div>
                    )}
                  </div>

                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500 text-white shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(channel.baseId)
                    }}
                    className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg ${
                      channel.isFavorite ? "bg-yellow-400 text-black scale-110" : "bg-black/60 text-white"
                    }`}
                  >
                    <Star className="w-5 h-5" fill={channel.isFavorite ? "currentColor" : "none"} />
                  </button>
                </div>

                <div className="p-4 bg-gradient-to-b from-card/50 to-card">
                  <h3 className="font-bold text-lg md:text-xl text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                    {channel.baseName}
                  </h3>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Category badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${getCategoryBadge(channel.category || "")}`}
                    >
                      {channel.category || "Divers"}
                    </span>

                    {/* Quality badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${getQualityBadge(channel.quality || "HD")}`}
                    >
                      <Wifi className="w-2.5 h-2.5" />
                      {channel.quality || "HD"}
                    </span>

                    {/* Language badge */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-slate-500/20 text-slate-400 border-slate-500/30">
                      <Globe className="w-2.5 h-2.5" />
                      {channel.language || "FR"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <PlayerModal
        channel={selectedChannel}
        isOpen={!!selectedChannel}
        onClose={() => setSelectedChannel(null)}
        country={country}
      />
    </div>
  )
}
