"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, Star, LaptopMinimal as TvMinimal, SortAsc, Flame } from "lucide-react"
import { PlayerModal } from "@/components/player-modal"
import { useFavorites } from "@/lib/hooks/use-favorites"
import type { Channel, ChannelWithFavorite, SortType } from "@/lib/types"

export function TVAppClient() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortType, setSortType] = useState<SortType>("name")
  const [selectedChannel, setSelectedChannel] = useState<ChannelWithFavorite | null>(null)
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)

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

        const channelsList: Channel[] = Array.isArray(data) ? data : data.metas || data.channels || data.data || []

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
      isFavorite: favorites.includes(ch.id),
    }))
  }, [channels, favorites])

  const filteredChannels = useMemo(() => {
    let filtered = channelsWithFavorites

    if (showOnlyFavorites) {
      filtered = filtered.filter((c) => c.isFavorite)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (c) => c.name.toLowerCase().includes(query) || (c.category && c.category.toLowerCase().includes(query)),
      )
    }

    if (sortType === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name))
    }

    return filtered
  }, [channelsWithFavorites, searchQuery, sortType, showOnlyFavorites])

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

        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-5 flex-wrap p-5 relative">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary blur-xl rounded-full opacity-50" />
              <TvMinimal className="w-10 h-10 text-primary relative animate-float" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary">
                LiveWatch
              </h1>
              <p className="text-xs text-muted-foreground font-medium">Premium TV Streaming</p>
            </div>
          </div>

          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
            <input
              type="text"
              placeholder="Rechercher une chaîne..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-5 py-4 rounded-2xl glass-card border border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:shadow-lg focus:shadow-primary/20 transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`relative w-14 h-14 rounded-2xl glass-card border transition-all duration-300 flex items-center justify-center ${
                showOnlyFavorites
                  ? "border-yellow-400/50 text-yellow-400 glow-accent scale-110"
                  : "border-border/50 text-foreground hover:border-primary/50 hover:scale-105"
              }`}
            >
              <Star className="w-6 h-6" fill={showOnlyFavorites ? "currentColor" : "none"} strokeWidth={2} />
              {favoritesCount > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 text-black text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  {favoritesCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto p-6 lg:p-10">
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-2 flex items-center gap-3">
                {showOnlyFavorites ? (
                  <>
                    <Star className="w-8 h-8 text-yellow-400" fill="currentColor" />
                    Mes Favoris
                  </>
                ) : (
                  <>
                    <TvMinimal className="w-8 h-8 text-primary" />
                    Toutes les chaînes
                  </>
                )}
              </h2>
              <div className="flex items-center gap-6 text-muted-foreground text-sm">
                <span className="flex items-center gap-2">
                  <TvMinimal className="w-4 h-4" />
                  <span className="font-semibold text-foreground">{filteredChannels.length}</span> chaînes
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  En direct
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSortType("name")}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                  sortType === "name"
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg glow-primary scale-105"
                    : "glass-card border border-border/50 text-foreground hover:border-primary/50 hover:scale-105"
                }`}
              >
                <SortAsc className="w-5 h-5" />
                Nom
              </button>

              <button
                onClick={() => setSortType("trending")}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                  sortType === "trending"
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg glow-primary scale-105"
                    : "glass-card border border-border/50 text-foreground hover:border-primary/50 hover:scale-105"
                }`}
              >
                <Flame className="w-5 h-5" />
                Trending
              </button>
            </div>
          </div>
        </div>

        {filteredChannels.length === 0 ? (
          <div className="text-center py-32 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-3xl" />
            <TvMinimal className="w-32 h-32 text-muted-foreground/30 mx-auto mb-6 animate-float" />
            <h3 className="text-3xl font-bold text-foreground mb-3">Aucune chaîne trouvée</h3>
            <p className="text-muted-foreground text-lg">Essayez une autre recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
            {filteredChannels.map((channel) => (
              <div
                key={channel.id}
                onClick={() => setSelectedChannel(channel)}
                className="group glass-card border border-border/50 rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/20 transition-all duration-300"
              >
                <div className="relative h-40 bg-gradient-to-br from-secondary to-secondary-light flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                  <TvMinimal className="w-16 h-16 text-primary relative z-10" />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500 text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(channel.id)
                    }}
                    className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      channel.isFavorite ? "bg-yellow-400 text-black" : "bg-black/40 text-white hover:bg-black/60"
                    }`}
                  >
                    <Star className="w-5 h-5" fill={channel.isFavorite ? "currentColor" : "none"} strokeWidth={2} />
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg text-foreground mb-2 truncate">{channel.name}</h3>
                  <span className="inline-block px-3 py-1 rounded-lg text-xs font-semibold bg-primary/20 text-primary">
                    {channel.category || "Divers"}
                  </span>
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
