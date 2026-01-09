"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Search, Star, LaptopMinimal as TvMinimal, SortAsc, Flame, Sparkles, Globe } from "lucide-react"
import { ChannelCard } from "@/components/channel-card"
import { PlayerModal } from "@/components/player-modal"
import { Sidebar } from "@/components/sidebar"
import { useFavorites } from "@/lib/hooks/use-favorites"
import type { GroupedChannel, SortType } from "@/lib/types"
import { groupChannels } from "@/lib/utils/normalize-channel"

export function TVAppClient() {
  const [channels, setChannels] = useState<GroupedChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCountry, setSelectedCountry] = useState("France")
  const [sortType, setSortType] = useState<SortType>("name")
  const [selectedChannel, setSelectedChannel] = useState<GroupedChannel | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)

  const { favorites, toggleFavorite, isFavorite, count: favoritesCount } = useFavorites()

  const searchParams = useSearchParams()
  const directId = searchParams.get("id")

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await fetch("/api/channels")
        const data = await response.json()

        if (Array.isArray(data)) {
          const grouped = groupChannels(data)
          setChannels(grouped)

          if (directId) {
            const channelWithId = grouped.find((g) => g.sources.some((s) => s.id === directId))
            if (channelWithId) {
              // Find the specific source index
              const sourceIndex = channelWithId.sources.findIndex((s) => s.id === directId)
              setSelectedChannel({
                ...channelWithId,
                // Reorder sources to put the requested one first
                sources:
                  sourceIndex > 0
                    ? [channelWithId.sources[sourceIndex], ...channelWithId.sources.filter((_, i) => i !== sourceIndex)]
                    : channelWithId.sources,
              })
            }
          }
        } else {
          console.error("[v0] Invalid data format:", data)
        }
      } catch (error) {
        console.error("[v0] Error fetching channels:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchChannels()
  }, [directId])

  const countries = useMemo(() => {
    const unique = [...new Set(channels.map((c) => c.country))]
    return unique.sort()
  }, [channels])

  const channelCounts = useMemo(() => {
    return channels.reduce(
      (acc, channel) => {
        acc[channel.country] = (acc[channel.country] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
  }, [channels])

  const filteredChannels = useMemo(() => {
    let filtered = channels

    if (showOnlyFavorites) {
      filtered = filtered.filter((c) => isFavorite(c.normalizedName))
    } else {
      filtered = filtered.filter((c) => c.country === selectedCountry)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (c) => c.displayName.toLowerCase().includes(query) || c.normalizedName.toLowerCase().includes(query),
      )
    }

    if (sortType === "name") {
      filtered.sort((a, b) => a.displayName.localeCompare(b.displayName))
    } else {
      filtered.sort((a, b) => b.sources.length - a.sources.length)
    }

    return filtered
  }, [channels, selectedCountry, searchQuery, sortType, showOnlyFavorites, isFavorite])

  const handleClosePlayer = () => {
    setSelectedChannel(null)
    // Remove the id param from URL if present
    if (directId) {
      window.history.replaceState({}, "", window.location.pathname)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="text-center relative z-10">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-full animate-spin glow-primary" />
            <div
              className="absolute inset-0 border-4 border-transparent border-b-accent rounded-full animate-spin"
              style={{ animationDirection: "reverse", animationDuration: "1s" }}
            />
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
                WaveWatch
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
              onClick={() => setShowSidebar(!showSidebar)}
              className={`relative w-14 h-14 rounded-2xl glass-card border transition-all duration-300 flex items-center justify-center ${
                showSidebar
                  ? "border-primary/50 text-primary glow-primary scale-110"
                  : "border-border/50 text-foreground hover:border-primary/50 hover:scale-105"
              }`}
              title="Sélectionner un pays"
            >
              <Globe className="w-6 h-6" />
            </button>

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

      <div className="flex max-w-screen-2xl mx-auto">
        <Sidebar
          countries={countries}
          channelCounts={channelCounts}
          selectedCountry={selectedCountry}
          onSelectCountry={(country) => {
            setSelectedCountry(country)
            setShowOnlyFavorites(false)
            setShowSidebar(false)
          }}
          isOpen={showSidebar}
          onClose={() => setShowSidebar(false)}
        />

        <main className="flex-1 p-6 lg:p-10">
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
                      <Sparkles className="w-8 h-8 text-primary" />
                      Chaînes {selectedCountry}
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
              <p className="text-muted-foreground text-lg">Essayez une autre recherche ou un autre pays</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
              {filteredChannels.map((channel) => (
                <ChannelCard
                  key={channel.normalizedName}
                  channel={channel}
                  isFavorite={isFavorite(channel.normalizedName)}
                  onToggleFavorite={() => toggleFavorite(channel.normalizedName)}
                  onClick={() => setSelectedChannel(channel)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <PlayerModal channel={selectedChannel} isOpen={!!selectedChannel} onClose={handleClosePlayer} />
    </div>
  )
}
