"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, Star, Filter, Globe, Sparkles } from "lucide-react"
import { PlayerModal } from "@/components/player-modal"
import { useFavorites } from "@/lib/hooks/use-favorites"
import { UserMenu } from "@/components/user-menu"
import type { GroupedChannel, SortType } from "@/lib/types"
import Image from "next/image"

export function TVAppClient() {
  const [channels, setChannels] = useState<GroupedChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortType, setSortType] = useState<SortType>("name")
  const [selectedChannel, setSelectedChannel] = useState<GroupedChannel | null>(null)
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all")
  const [selectedQuality, setSelectedQuality] = useState<string>("all")

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

  const qualities = useMemo(() => {
    const quals = new Set(channels.flatMap((c) => c.sources.map((s) => s.quality)).filter(Boolean))
    return ["all", ...Array.from(quals).sort()]
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

    if (selectedQuality !== "all") {
      filtered = filtered.filter((c) => c.sources.some((s) => s.quality === selectedQuality))
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
  }, [
    channelsWithFavorites,
    searchQuery,
    sortType,
    showOnlyFavorites,
    selectedCategory,
    selectedLanguage,
    selectedQuality,
  ])

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

        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-3 md:gap-5 flex-wrap p-3 md:p-5 relative">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative w-32 h-10 md:w-48 md:h-12">
              <Image src="/livewatch-logo.png" alt="LiveWatch" fill className="object-contain" priority />
            </div>
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
                  ? "border-yellow-400/50 text-yellow-400 glow-accent scale-110"
                  : "border-border/50 text-foreground hover:border-primary/50 hover:scale-105"
              }`}
            >
              <Star
                className="w-5 h-5 md:w-6 md:h-6"
                fill={showOnlyFavorites ? "currentColor" : "none"}
                strokeWidth={2}
              />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-5 h-5 md:w-6 md:h-6 bg-gradient-to-br from-yellow-400 to-orange-500 text-black text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse">
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
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent flex items-center gap-3">
              {showOnlyFavorites ? (
                <>
                  <Star className="w-8 h-8 text-yellow-400" fill="currentColor" />
                  Mes Favoris
                </>
              ) : (
                <>
                  <Image src="/livewatch-logo.png" alt="LiveWatch" width={48} height={12} className="object-contain" />
                  Toutes les chaînes
                </>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-6 text-muted-foreground text-sm">
            <span className="flex items-center gap-2">
              <Image src="/livewatch-logo.png" alt="LiveWatch" width={24} height={6} className="object-contain" />
              <span className="font-semibold text-foreground">{filteredChannels.length}</span> chaînes
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              En direct
            </span>
          </div>
        </div>

        <div className="mb-8 glass-card border border-border/50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Filtres</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Catégorie</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass-card border border-border/50 bg-card text-foreground focus:border-primary outline-none transition-all"
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
                className="w-full px-4 py-3 rounded-xl glass-card border border-border/50 bg-card text-foreground focus:border-primary outline-none transition-all"
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang} className="bg-card text-foreground">
                    {lang === "all" ? "Toutes les langues" : lang}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Qualité</label>
              <select
                value={selectedQuality}
                onChange={(e) => setSelectedQuality(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass-card border border-border/50 bg-card text-foreground focus:border-primary outline-none transition-all"
              >
                {qualities.map((qual) => (
                  <option key={qual} value={qual} className="bg-card text-foreground">
                    {qual === "all" ? "Toutes les qualités" : qual}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredChannels.length === 0 ? (
          <div className="text-center py-16 md:py-32 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-3xl" />
            <Image
              src="/livewatch-logo.png"
              alt="LiveWatch"
              width={96}
              height={24}
              className="object-contain mx-auto mb-6 animate-float"
            />
            <h3 className="text-3xl font-bold text-foreground mb-3">Aucune chaîne trouvée</h3>
            <p className="text-muted-foreground text-lg">Essayez une autre recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 animate-fade-in">
            {filteredChannels.map((channel) => (
              <div
                key={channel.baseId}
                onClick={() => setSelectedChannel(channel)}
                className="group glass-card border border-border/50 rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/20 transition-all duration-300"
              >
                <div className="relative h-40 overflow-hidden">
                  {channel.background ? (
                    <Image
                      src={channel.background || "/placeholder.svg"}
                      alt=""
                      fill
                      className="object-cover opacity-40 group-hover:scale-110 transition-transform duration-500"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    {channel.logo || channel.poster ? (
                      <Image
                        src={channel.logo || channel.poster || ""}
                        alt={channel.baseName}
                        width={120}
                        height={60}
                        className="object-contain max-h-16 drop-shadow-2xl group-hover:scale-110 transition-transform duration-300"
                        unoptimized
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center backdrop-blur-sm border border-primary/20">
                        <Image
                          src="/livewatch-logo.png"
                          alt="LiveWatch"
                          width={20}
                          height={10}
                          className="object-contain"
                        />
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
                      channel.isFavorite
                        ? "bg-yellow-400 text-black scale-110"
                        : "bg-black/60 backdrop-blur-sm text-white hover:bg-black/80"
                    }`}
                  >
                    <Star className="w-5 h-5" fill={channel.isFavorite ? "currentColor" : "none"} strokeWidth={2} />
                  </button>

                  {channel.sources.length > 1 && (
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/90 text-white shadow-lg">
                      {channel.sources.length} sources
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gradient-to-b from-card/50 to-card">
                  <h3 className="font-bold text-lg text-foreground mb-2 truncate group-hover:text-primary transition-colors">
                    {channel.baseName}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
                      {channel.category || "Divers"}
                    </span>
                    {channel.language && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        <Globe className="w-3 h-3" />
                        {channel.language}
                      </span>
                    )}
                    {channel.sources[0]?.quality && channel.sources[0].quality !== "SD" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30">
                        <Sparkles className="w-3 h-3" />
                        {channel.sources[0].quality}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <PlayerModal channel={selectedChannel} isOpen={!!selectedChannel} onClose={() => setSelectedChannel(null)} />
    </div>
  )
}
