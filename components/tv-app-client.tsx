"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, Star, Filter, Globe, LaptopMinimal as TvMinimal } from "lucide-react"
import { PlayerModal } from "@/components/player-modal"
import { useFavorites } from "@/lib/hooks/use-favorites"
import type { GroupedChannel, SortType } from "@/lib/types"
import Image from "next/image"
import Link from "next/link"
import { UserMenu } from "@/components/user-menu" // Declare the UserMenu component

export function TVAppClient() {
  const [channels, setChannels] = useState<GroupedChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortType, setSortType] = useState<SortType>("name")
  const [selectedChannel, setSelectedChannel] = useState<GroupedChannel | null>(null)
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all")

  const { favorites, toggleFavorite, count: favoritesCount } = useFavorites()

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        console.log("[v0] Fetching channels from catalog API...")
        const response = await fetch("/api/catalog")

        if (!response.ok) {
          console.error("[v0] Catalog API returned:", response.status)
          setLoading(false)
          return
        }

        const data = await response.json()
        console.log("[v0] Catalog data received:", data)

        if (data.error) {
          console.error("[v0] Catalog API error:", data.error, data.message)
          setLoading(false)
          return
        }

        const channelsList: GroupedChannel[] = Array.isArray(data)
          ? data
          : data.metas || data.channels || data.data || []

        if (channelsList.length > 0) {
          console.log("[v0] Loaded channels:", channelsList.length)
          setChannels(channelsList)
        } else {
          console.error("[v0] No channels found in response")
        }
      } catch (error) {
        console.error("[v0] Error fetching channels:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchChannels()
  }, [])

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

  const languages = useMemo(() => {
    const langs = new Set(channels.map((c) => c.language).filter(Boolean))
    return ["all", ...Array.from(langs).sort()]
  }, [channels])

  const filteredChannels = useMemo(() => {
    let filtered = channelsWithFavorites

    if (showOnlyFavorites) {
      filtered = filtered.filter((c) => c.isFavorite)
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((c) => c.category === selectedCategory)
    }

    if (selectedLanguage !== "all") {
      filtered = filtered.filter((c) => c.language === selectedLanguage)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (c) => c.baseName.toLowerCase().includes(query) || (c.category && c.category.toLowerCase().includes(query)),
      )
    }

    if (sortType === "name") {
      filtered.sort((a, b) => {
        const nameA = a.baseName || a.name || ""
        const nameB = b.baseName || b.name || ""
        return nameA.localeCompare(nameB)
      })
    }

    return filtered
  }, [channelsWithFavorites, searchQuery, sortType, showOnlyFavorites, selectedCategory, selectedLanguage])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="text-center relative z-10">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-full animate-spin glow-primary" />
          </div>
          <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent animate-pulse mb-2">
            Chargement des chaînes...
          </p>
          <p className="text-sm text-muted-foreground">Connexion au serveur</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 glass-card border-b border-border/50 backdrop-blur-xl shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10 pointer-events-none" />

        <div className="max-w-screen-2xl mx-auto p-3 md:p-5 relative">
          <div className="flex items-center justify-between gap-2 mb-3 md:mb-0">
            <Link href="/" className="relative w-32 h-10 md:w-48 md:h-12 lg:w-64 lg:h-16 hover:opacity-80 transition-opacity">
              <Image src="/livewatch-logo.png" alt="LiveWatch" fill className="object-contain" priority />
            </Link>

            <div className="flex items-center gap-2">
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
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-primary" />
            <input
              type="text"
              placeholder="Rechercher une chaîne..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl glass-card border border-border/50 text-sm md:text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:shadow-lg focus:shadow-primary/20 transition-all outline-none"
            />
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto p-3 md:p-6 lg:p-10">
        <div className="mb-4 md:mb-6">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2 md:gap-4">
            <div className="flex items-center gap-2">
              <TvMinimal className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Toutes les chaînes
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-6 text-muted-foreground text-xs md:text-sm">
            <span className="flex items-center gap-1.5 md:gap-2">
              <TvMinimal className="w-3 h-3 md:w-4 md:h-4 text-primary" />
              {filteredChannels.length} chaînes
            </span>
            <span className="flex items-center gap-1.5 md:gap-2">
              <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 animate-pulse" />
              En direct
            </span>
          </div>
        </div>

        <div className="mb-6 md:mb-8 glass-card border border-border/50 rounded-xl md:rounded-2xl p-3 md:p-5 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <Filter className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            <h3 className="text-base md:text-lg font-bold text-foreground">Filtres</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Langue</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass-card border border-border/50 bg-card text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang} className="bg-card text-foreground">
                    {lang === "all" ? "Toutes les langues" : lang}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredChannels.length === 0 ? (
          <div className="text-center py-12 md:py-16 lg:py-32">
            <Image
              src="/livewatch-logo.png"
              alt="LiveWatch"
              width={96}
              height={24}
              className="object-contain mx-auto mb-4 md:mb-6 animate-float"
            />
            <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-2 md:mb-3">Aucune chaîne trouvée</h3>
            <p className="text-muted-foreground text-sm md:text-base lg:text-lg">Essayez une autre recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 lg:gap-6 animate-fade-in">
            {filteredChannels.map((channel) => (
              <div
                key={channel.baseId}
                onClick={() => setSelectedChannel(channel)}
                className="group glass-card border border-border/50 rounded-xl md:rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/20 transition-all duration-300"
              >
                <div className="relative h-32 md:h-40 overflow-hidden">
                  {channel.baseBanner ? (
                    <Image
                      src={channel.baseBanner || "/placeholder.svg"}
                      alt=""
                      fill
                      className="object-cover opacity-40 group-hover:scale-110 transition-transform duration-500"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                  <div className="absolute inset-0 flex items-center justify-center p-3 md:p-4">
                    {channel.logo && !channel.logo.includes("tvvoo") && !channel.logo.includes("qwertyuiop8899") ? (
                      <Image
                        src={channel.logo || "/placeholder.svg"}
                        alt={channel.baseName}
                        width={100}
                        height={50}
                        className="object-contain max-h-12 md:max-h-16 drop-shadow-2xl group-hover:scale-110 transition-transform duration-300"
                        unoptimized
                      />
                    ) : (
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center backdrop-blur-sm border border-cyan-500/20">
                        <div className="text-2xl md:text-4xl font-black text-cyan-400">TV</div>
                      </div>
                    )}
                  </div>

                  <div className="absolute top-2 left-2 md:top-3 md:left-3 flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold bg-red-500 text-white shadow-lg">
                    <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(channel.baseId)
                    }}
                    className={`absolute top-2 right-2 md:top-3 md:right-3 w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center transition-all shadow-lg ${
                      channel.isFavorite
                        ? "bg-yellow-400 text-black scale-110"
                        : "bg-black/60 backdrop-blur-sm text-white hover:bg-black/80"
                    }`}
                  >
                    <Star className="w-4 h-4 md:w-5 md:h-5" fill={channel.isFavorite ? "currentColor" : "none"} strokeWidth={2} />
                  </button>

                  <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3 flex items-center gap-1 md:gap-2">
                    {channel.sources.length > 1 && (
                      <span className="px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold bg-cyan-500/90 text-white shadow-lg">
                        {channel.sources.length} sources
                      </span>
                    )}
                    {channel.sources[0]?.quality && (
                      <span className="px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold bg-purple-500/90 text-white shadow-lg">
                        {channel.sources[0].quality}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 md:p-4 bg-gradient-to-b from-card/50 to-card">
                  <h3 className="font-bold text-sm md:text-lg text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                    {channel.baseName || channel.name || "Chaîne TV"}
                  </h3>
                  <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-0.5 md:py-1 rounded text-[9px] md:text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
                      {channel.category || "Divers"}
                    </span>
                    {channel.language && (
                      <span className="inline-flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2.5 py-0.5 md:py-1 rounded text-[9px] md:text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        <Globe className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        {channel.language}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <PlayerModal channel={selectedChannel} isOpen={selectedChannel !== null} onClose={() => setSelectedChannel(null)} />
    </div>
  )
}
