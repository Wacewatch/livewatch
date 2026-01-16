"use client"

import { useState, useEffect, useMemo } from "react"
import { Star, ArrowLeft, Wifi, Globe, Search } from "lucide-react"
import { PlayerModal } from "@/components/player-modal"
import { useFavorites } from "@/lib/hooks/use-favorites"
import type { GroupedChannel } from "@/lib/types"
import Image from "next/image"
import Link from "next/link"
import { UserMenu } from "@/components/user-menu"

const DEFAULT_CHANNEL_LOGO = "https://i.imgur.com/ovX7j6R.png"

const ALL_COUNTRIES = [
  { name: "France", code: "fr" },
  { name: "Italy", code: "it" },
  { name: "Spain", code: "es" },
  { name: "Portugal", code: "pt" },
  { name: "Germany", code: "de" },
  { name: "United Kingdom", code: "gb" },
  { name: "Belgium", code: "be" },
  { name: "Netherlands", code: "nl" },
  { name: "Switzerland", code: "ch" },
  { name: "Albania", code: "al" },
  { name: "Turkey", code: "tr" },
  { name: "Arabia", code: "sa" },
  { name: "Balkans", code: "rs" },
  { name: "Russia", code: "ru" },
  { name: "Romania", code: "ro" },
  { name: "Poland", code: "pl" },
  { name: "Bulgaria", code: "bg" },
]

function getQualityBadge(quality: string) {
  switch (quality?.toUpperCase()) {
    case "4K":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30"
    case "FHD":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    case "HD":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30"
  }
}

function getCategoryBadge(category: string) {
  switch (category?.toLowerCase()) {
    case "sport":
      return "bg-green-500/20 text-green-400 border-green-500/30"
    case "actualités":
      return "bg-red-500/20 text-red-400 border-red-500/30"
    case "enfants":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    case "cinéma":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30"
    case "musique":
      return "bg-pink-500/20 text-pink-400 border-pink-500/30"
    case "documentaire":
      return "bg-teal-500/20 text-teal-400 border-teal-500/30"
    default:
      return "bg-primary/20 text-primary border-primary/30"
  }
}

export default function FavoritesClient() {
  const [allChannels, setAllChannels] = useState<GroupedChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedChannel, setSelectedChannel] = useState<GroupedChannel | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  const { favorites, toggleFavorite, loading: favoritesLoading } = useFavorites()

  useEffect(() => {
    if (favoritesLoading) return

    const fetchAllChannels = async () => {
      if (favorites.length === 0) {
        setLoading(false)
        return
      }

      try {
        const countries = ALL_COUNTRIES.map((c) => c.name).join(",")
        const response = await fetch(`/api/tvvoo/channels?countries=${encodeURIComponent(countries)}`)
        if (response.ok) {
          const data = await response.json()
          setAllChannels(data)
        }
      } catch (error) {
        console.error("[v0] Error fetching channels:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllChannels()
  }, [favorites, favoritesLoading])

  const favoriteChannels = useMemo(() => {
    return allChannels.filter((ch) => favorites.includes(ch.baseId))
  }, [allChannels, favorites])

  const channelsByCountry = useMemo(() => {
    const grouped: Record<string, GroupedChannel[]> = {}

    favoriteChannels.forEach((channel) => {
      const country = channel.country || "Autre"
      if (!grouped[country]) {
        grouped[country] = []
      }
      grouped[country].push(channel)
    })

    Object.keys(grouped).forEach((country) => {
      grouped[country].sort((a, b) => a.baseName.localeCompare(b.baseName))
    })

    return grouped
  }, [favoriteChannels])

  const countries = useMemo(() => {
    return Object.keys(channelsByCountry).sort()
  }, [channelsByCountry])

  const filteredChannels = useMemo(() => {
    let channels = selectedCountry ? channelsByCountry[selectedCountry] || [] : favoriteChannels

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      channels = channels.filter((c) => c.baseName.toLowerCase().includes(query))
    }

    return channels
  }, [favoriteChannels, channelsByCountry, selectedCountry, searchQuery])

  if (loading || favoritesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
          </div>
          <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            Chargement des favoris...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 glass-card border-b border-border/50 backdrop-blur-xl shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-orange-500/10 pointer-events-none" />

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
            <Search className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
            <input
              type="text"
              placeholder="Rechercher dans les favoris..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 md:pl-14 pr-3 md:pr-5 py-3 md:py-4 rounded-2xl glass-card border border-yellow-400/30 text-sm md:text-base text-foreground placeholder:text-muted-foreground focus:border-yellow-400 focus:shadow-lg focus:shadow-yellow-400/20 transition-all outline-none"
            />
          </div>

          <UserMenu />
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto p-3 md:p-6 lg:p-10">
        <div className="mb-6 glass-card border border-yellow-400/30 rounded-2xl p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-400" fill="currentColor" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                  Mes Favoris
                </h1>
                <p className="text-muted-foreground text-sm">{favoriteChannels.length} chaînes enregistrées</p>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              <button
                onClick={() => setSelectedCountry(null)}
                className={`flex-shrink-0 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 ${
                  !selectedCountry
                    ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/30"
                    : "glass-card border border-border/50 text-foreground hover:border-yellow-400/50"
                }`}
              >
                Tous ({favoriteChannels.length})
              </button>
              {countries.map((country) => (
                <button
                  key={country}
                  onClick={() => setSelectedCountry(country)}
                  className={`flex-shrink-0 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 ${
                    selectedCountry === country
                      ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/30"
                      : "glass-card border border-border/50 text-foreground hover:border-yellow-400/50"
                  }`}
                >
                  {country} ({channelsByCountry[country]?.length || 0})
                </button>
              ))}
            </div>
          </div>
        </div>

        {favoriteChannels.length === 0 ? (
          <div className="text-center py-16 md:py-32">
            <Star className="w-20 h-20 mx-auto mb-6 text-yellow-400/30" />
            <h3 className="text-3xl font-bold text-foreground mb-3">Aucun favori</h3>
            <p className="text-muted-foreground text-lg mb-6">
              Ajoutez des chaînes à vos favoris pour les retrouver ici
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold hover:scale-105 transition-transform"
            >
              Parcourir les chaînes
            </Link>
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="text-center py-16 md:py-32">
            <h3 className="text-3xl font-bold text-foreground mb-3">Aucun résultat</h3>
            <p className="text-muted-foreground text-lg">Essayez une autre recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
            {filteredChannels.map((channel) => (
              <div
                key={channel.baseId}
                onClick={() => setSelectedChannel(channel)}
                className="group glass-card border border-border/50 rounded-2xl overflow-hidden cursor-pointer hover:border-yellow-400/50 hover:scale-[1.02] hover:shadow-xl hover:shadow-yellow-400/20 transition-all duration-300"
              >
                <div className="relative h-40 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-secondary/20 to-orange-500/20" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <Image
                      src={channel.logo || DEFAULT_CHANNEL_LOGO}
                      alt={channel.baseName}
                      width={120}
                      height={60}
                      className="object-contain max-h-16 drop-shadow-2xl"
                      unoptimized
                    />
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
                    className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg bg-yellow-400 text-black scale-110"
                  >
                    <Star className="w-5 h-5" fill="currentColor" />
                  </button>

                  <div className="absolute bottom-3 left-3 px-2 py-1 rounded-md text-xs font-bold bg-black/60 text-white">
                    {channel.country}
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-b from-card/50 to-card">
                  <h3 className="font-bold text-lg md:text-xl text-foreground mb-3 line-clamp-2 group-hover:text-yellow-400 transition-colors leading-tight">
                    {channel.baseName}
                  </h3>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${getCategoryBadge(channel.category || "")}`}
                    >
                      {channel.category || "Divers"}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${getQualityBadge(channel.quality || "HD")}`}
                    >
                      <Wifi className="w-2.5 h-2.5" />
                      {channel.quality || "HD"}
                    </span>

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
        country={selectedChannel?.country || ""}
      />
    </div>
  )
}
