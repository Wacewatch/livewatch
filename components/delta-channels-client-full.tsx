"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Search, Star, ArrowLeft, LaptopMinimal as TvMinimal, Wifi, Globe, Ban, Info, X, Pencil } from "lucide-react"
import { useFavorites } from "@/lib/hooks/use-favorites"
import { useUserRole } from "@/lib/hooks/use-user-role"
import Image from "next/image"
import Link from "next/link"
import { UserMenu } from "@/components/user-menu"
import { VersionToggle } from "@/components/version-toggle"
import { Footer } from "@/components/footer"

interface DeltaChannelsClientProps {
  country: string
}

const DEFAULT_CHANNEL_LOGO = "https://i.imgur.com/ovX7j6R.png"

interface DeltaChannel {
  id: string
  name: string
  logo?: string
  category?: string
  quality?: string
  language?: string
}

export function DeltaChannelsClientFull({ country }: DeltaChannelsClientProps) {
  const [channels, setChannels] = useState<DeltaChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [editingChannel, setEditingChannel] = useState<DeltaChannel | null>(null)
  const [editName, setEditName] = useState("")
  const [editLogo, setEditLogo] = useState("")

  const { favorites, toggleFavorite, count: favoritesCount } = useFavorites()
  const { isAdmin } = useUserRole()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/delta/channels?country=${encodeURIComponent(country)}`)
        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Delta channels loaded:", data?.length)
          setChannels(data || [])
        }
      } catch (error) {
        console.error("[v0] Error fetching Delta channels:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [country])

  const channelsWithFavorites = useMemo(() => {
    return channels.map((ch) => ({
      ...ch,
      isFavorite: favorites.includes(ch.id),
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
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(query))
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name))
  }, [channelsWithFavorites, searchQuery, showOnlyFavorites, selectedCategory])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <header className="glass-card rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <Link href="/" className="flex items-center gap-3 group">
                <Image src="/livewatch-logo.png" alt="LiveWatch" width={40} height={40} className="group-hover:scale-110 transition-transform" />
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
                  LIVEWATCH
                </h1>
              </Link>
              <div className="flex items-center gap-3">
                <VersionToggle />
                <UserMenu />
              </div>
            </div>
          </header>
          
          <div className="text-center py-20">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" />
            </div>
            <p className="text-xl font-semibold text-foreground">Chargement des chaînes...</p>
          </div>
        </div>
      </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <header className="sticky top-0 z-30 glass-card border-b border-border/50 backdrop-blur-xl shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-purple-500/10 pointer-events-none" />

        <div className="w-full max-w-screen-2xl mx-auto px-3 py-3 md:px-5 md:py-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Link
                href="/"
                className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl glass-card border border-purple-500/30 flex items-center justify-center hover:border-purple-500/50 hover:scale-105 transition-all flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-foreground" />
              </Link>
              <Link href="/" className="relative w-24 h-8 md:w-48 md:h-12 lg:w-64 lg:h-16 hover:opacity-80 transition-opacity flex-shrink-0">
                <Image src="/livewatch-logo.png" alt="LiveWatch" fill className="object-contain" priority />
              </Link>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <VersionToggle />
              <UserMenu />
              <button
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`relative w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl glass-card border transition-all duration-300 flex items-center justify-center ${
                  showOnlyFavorites
                    ? "border-yellow-400/50 text-yellow-400 scale-110 bg-yellow-400/10"
                    : "border-border/50 text-foreground hover:border-yellow-400/50 hover:text-yellow-400 hover:scale-105"
                }`}
                title={showOnlyFavorites ? "Afficher toutes les chaînes" : "Afficher uniquement les favoris"}
              >
                <Star className="w-4 h-4 md:w-5 md:h-5" fill={showOnlyFavorites ? "currentColor" : "none"} />
                {favoritesCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-gradient-to-br from-yellow-400 to-orange-500 text-black text-[10px] md:text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                    {favoritesCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="relative w-full">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-purple-400" />
            <input
              type="text"
              placeholder="Rechercher une chaîne..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl glass-card border border-purple-500/30 text-sm md:text-base text-foreground placeholder:text-muted-foreground focus:border-purple-500 focus:shadow-lg focus:shadow-purple-500/20 transition-all outline-none"
            />
          </div>
        </div>
      </header>

      <main className="w-full max-w-screen-2xl mx-auto px-3 py-3 md:px-6 md:py-6 lg:px-10 lg:py-10 flex-1">
        <div className="mb-4 md:mb-6 glass-card border border-purple-500/30 rounded-xl md:rounded-2xl p-3 md:p-6">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                <TvMinimal className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-lg md:text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 truncate">
                    {country}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px] font-bold">
                    DELTA
                  </span>
                </div>
                <p className="text-muted-foreground text-xs md:text-sm">{filteredChannels.length} chaînes disponibles</p>
              </div>
            </div>

            <div className="w-full overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 pb-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex-shrink-0 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${getCategoryButtonStyle(cat, selectedCategory === cat)}`}
                  >
                    {cat === "all" ? "Toutes" : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {filteredChannels.length === 0 ? (
          <div className="text-center py-12 md:py-16 lg:py-32 px-4">
            <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-2 md:mb-3">Aucune chaîne trouvée</h3>
            <p className="text-muted-foreground text-sm md:text-base lg:text-lg">Essayez une autre recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4 lg:gap-6">
            {filteredChannels.map((channel, index) => (
              <Link
                key={`${channel.id}-${index}`}
                href={`/watch/delta?id=${encodeURIComponent(channel.id)}&name=${encodeURIComponent(channel.name)}&country=${encodeURIComponent(country)}`}
                className="group glass-card border border-purple-500/30 rounded-xl md:rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer hover:border-purple-500/50 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/20"
              >
                <div className="relative h-28 md:h-40 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-purple-500/20" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                  <div className="absolute inset-0 flex items-center justify-center p-2 md:p-4">
                    <Image
                      src={channel.logo || DEFAULT_CHANNEL_LOGO}
                      alt={channel.name}
                      width={100}
                      height={50}
                      className="object-contain max-h-10 md:max-h-16 w-auto drop-shadow-2xl"
                      unoptimized
                    />
                  </div>

                  <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 flex items-center gap-0.5 md:gap-1 px-1.5 md:px-2 py-0.5 rounded-full text-[9px] md:text-xs font-bold bg-red-500 text-white shadow-lg">
                    <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </div>

                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleFavorite(channel.id)
                    }}
                    className={`absolute top-1.5 right-1.5 md:top-2 md:right-2 w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center transition-all shadow-lg ${
                      channel.isFavorite ? "bg-yellow-400 text-black scale-110" : "bg-black/60 text-white"
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" fill={channel.isFavorite ? "currentColor" : "none"} />
                  </button>
                </div>

                <div className="p-2 md:p-4 bg-gradient-to-b from-card/50 to-card">
                  <h3 className="font-bold text-xs md:text-base lg:text-lg text-foreground mb-1.5 md:mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors leading-tight min-h-[2rem] md:min-h-[3rem]">
                    {channel.name}
                  </h3>

                  <div className="flex items-center gap-1 flex-wrap">
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] md:text-[10px] font-bold border ${getCategoryBadge(channel.category || "")}`}>
                      {channel.category || "Divers"}
                    </span>

                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] md:text-[10px] font-bold border ${getQualityBadge(channel.quality || "HD")}`}>
                      <Wifi className="w-2 h-2" />
                      {channel.quality || "HD"}
                    </span>

                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] md:text-[10px] font-bold border bg-slate-500/20 text-slate-400 border-slate-500/30">
                      <Globe className="w-2 h-2" />
                      {channel.language || "FR"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

function getCategoryButtonStyle(category: string, isActive: boolean): string {
  if (isActive) {
    switch (category.toLowerCase()) {
      case "all":
        return "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30"
      case "sport":
        return "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30"
      case "cinéma":
        return "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30"
      case "actualités":
        return "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30"
      case "enfants":
        return "bg-gradient-to-r from-yellow-400 to-orange-400 text-black shadow-lg shadow-yellow-400/30"
      case "musique":
        return "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30"
      case "documentaire":
        return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30"
      case "généraliste":
        return "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30"
      default:
        return "bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-lg shadow-slate-500/30"
    }
  }
  return "bg-background/50 text-muted-foreground border border-border/50 hover:border-purple-500/50 hover:text-foreground"
}

function getCategoryBadge(category: string): string {
  switch (category.toLowerCase()) {
    case "sport":
      return "bg-green-500/20 text-green-400 border-green-500/30"
    case "cinéma":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30"
    case "actualités":
      return "bg-red-500/20 text-red-400 border-red-500/30"
    case "enfants":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    case "musique":
      return "bg-pink-500/20 text-pink-400 border-pink-500/30"
    case "documentaire":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    case "généraliste":
      return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30"
  }
}

function getQualityBadge(quality: string): string {
  switch (quality.toUpperCase()) {
    case "4K":
    case "UHD":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30"
    case "FHD":
    case "1080P":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    case "HD":
    case "720P":
      return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30"
  }
}
