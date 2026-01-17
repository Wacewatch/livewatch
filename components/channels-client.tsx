"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import {
  Search,
  Star,
  ArrowLeft,
  LaptopMinimal as TvMinimal,
  Wifi,
  Globe,
  Ban,
  AlertTriangle,
  X,
  Pencil,
} from "lucide-react"
import { PlayerModal } from "@/components/player-modal"
import { useFavorites } from "@/lib/hooks/use-favorites"
import { useUserRole } from "@/lib/hooks/use-user-role"
import type { GroupedChannel } from "@/lib/types"
import Image from "next/image"
import Link from "next/link"
import { UserMenu } from "@/components/user-menu"

interface ChannelsClientProps {
  country: string
}

const DEFAULT_CHANNEL_LOGO = "https://i.imgur.com/ovX7j6R.png"

interface CountryBanner {
  message: string
  enabled: boolean
  bg_color: string
  text_color: string
}

interface ChannelOverride {
  channel_id: string
  custom_name: string | null
  custom_logo: string | null
}

export function ChannelsClient({ country }: ChannelsClientProps) {
  const [channels, setChannels] = useState<GroupedChannel[]>([])
  const [disabledChannels, setDisabledChannels] = useState<Set<string>>(new Set())
  const [channelOverrides, setChannelOverrides] = useState<Map<string, ChannelOverride>>(new Map())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedChannel, setSelectedChannel] = useState<GroupedChannel | null>(null)
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [countryBanner, setCountryBanner] = useState<CountryBanner | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [editingChannel, setEditingChannel] = useState<GroupedChannel | null>(null)
  const [editName, setEditName] = useState("")
  const [editLogo, setEditLogo] = useState("")

  const { favorites, toggleFavorite, count: favoritesCount } = useFavorites()
  const { isAdmin } = useUserRole()

  useEffect(() => {
    const dismissed = localStorage.getItem(`country_banner_dismissed_${country}`)
    if (dismissed) {
      setBannerDismissed(true)
    }

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/tvvoo/channels?countries=${encodeURIComponent(country)}`)
        if (response.ok) {
          const data = await response.json()
          setChannels(data)
        }

        const disabledRes = await fetch("/api/admin/disabled-channels")
        if (disabledRes.ok) {
          const disabledData = await disabledRes.json()
          const disabledSet = new Set<string>(disabledData.channels?.map((c: any) => c.channel_id) || [])
          setDisabledChannels(disabledSet)
        }

        const overridesRes = await fetch("/api/admin/channel-overrides")
        if (overridesRes.ok) {
          const overridesData = await overridesRes.json()
          const overridesMap = new Map<string, ChannelOverride>()
          overridesData.overrides?.forEach((o: ChannelOverride) => {
            overridesMap.set(o.channel_id, o)
          })
          setChannelOverrides(overridesMap)
        }

        const bannerRes = await fetch(`/api/admin/banners?country=${encodeURIComponent(country)}`)
        if (bannerRes.ok) {
          const bannerData = await bannerRes.json()
          if (bannerData.banner) {
            setCountryBanner(bannerData.banner)
          }
        }
      } catch (error) {
        console.error("[v0] Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [country])

  const dismissBanner = () => {
    setBannerDismissed(true)
    localStorage.setItem(`country_banner_dismissed_${country}`, "true")
  }

  const openEditModal = (channel: GroupedChannel, e: React.MouseEvent) => {
    e.stopPropagation()
    const override = channelOverrides.get(channel.baseId)
    setEditingChannel(channel)
    setEditName(override?.custom_name || channel.baseName)
    setEditLogo(override?.custom_logo || channel.logo || "")
  }

  const saveChannelEdit = async () => {
    if (!editingChannel) return

    try {
      await fetch("/api/admin/channel-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_id: editingChannel.baseId,
          custom_name: editName || null,
          custom_logo: editLogo || null,
        }),
      })

      setChannelOverrides((prev) => {
        const newMap = new Map(prev)
        newMap.set(editingChannel.baseId, {
          channel_id: editingChannel.baseId,
          custom_name: editName || null,
          custom_logo: editLogo || null,
        })
        return newMap
      })

      setEditingChannel(null)
    } catch (error) {
      console.error("[v0] Error saving channel override:", error)
    }
  }

  const toggleChannelDisabled = async (channel: GroupedChannel, e: React.MouseEvent) => {
    e.stopPropagation()

    const isCurrentlyDisabled = disabledChannels.has(channel.baseId)

    try {
      if (isCurrentlyDisabled) {
        await fetch("/api/admin/disabled-channels", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel_id: channel.baseId }),
        })
        setDisabledChannels((prev) => {
          const newSet = new Set(prev)
          newSet.delete(channel.baseId)
          return newSet
        })
      } else {
        await fetch("/api/admin/disabled-channels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel_id: channel.baseId,
            channel_name: channel.baseName,
          }),
        })
        setDisabledChannels((prev) => new Set([...prev, channel.baseId]))
      }
    } catch (error) {
      console.error("[v0] Error toggling channel:", error)
    }
  }

  const channelsWithFavorites = useMemo(() => {
    return channels.map((ch) => {
      const override = channelOverrides.get(ch.baseId)
      return {
        ...ch,
        baseName: override?.custom_name || ch.baseName,
        logo: override?.custom_logo || ch.logo,
        isFavorite: favorites.includes(ch.baseId),
        isDisabled: disabledChannels.has(ch.baseId),
      }
    })
  }, [channels, favorites, disabledChannels, channelOverrides])

  const categories = useMemo(() => {
    const cats = new Set(channels.map((c) => c.category).filter(Boolean))
    return ["all", ...Array.from(cats).sort()]
  }, [channels])

  const filteredChannels = useMemo(() => {
    let filtered = channelsWithFavorites

    if (!isAdmin) {
      filtered = filtered.filter((c) => !c.isDisabled)
    }

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
  }, [channelsWithFavorites, searchQuery, showOnlyFavorites, selectedCategory, isAdmin])

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
                  ? "border-yellow-400/50 text-yellow-400 scale-110 bg-yellow-400/10"
                  : "border-border/50 text-foreground hover:border-yellow-400/50 hover:text-yellow-400 hover:scale-105"
              }`}
              title={showOnlyFavorites ? "Afficher toutes les chaînes" : "Afficher uniquement les favoris"}
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

      {countryBanner?.enabled && countryBanner?.message && !bannerDismissed && (
        <div
          className="w-full py-3 px-4 text-center font-semibold flex items-center justify-center gap-2 relative"
          style={{
            backgroundColor: countryBanner.bg_color || "#f59e0b",
            color: countryBanner.text_color || "#000000",
          }}
        >
          <AlertTriangle className="w-5 h-5" />
          <span>{countryBanner.message}</span>
          <button
            onClick={dismissBanner}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/20 transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <main className="max-w-screen-2xl mx-auto p-3 md:p-6 lg:p-10">
        <div className="mb-6 glass-card border border-border/50 rounded-2xl p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <TvMinimal className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  {country}
                </h1>
                <p className="text-muted-foreground text-sm">{filteredChannels.length} chaînes disponibles</p>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-shrink-0 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 ${getCategoryButtonStyle(cat, selectedCategory === cat)}`}
                >
                  {cat === "all" ? "Toutes" : cat}
                </button>
              ))}
            </div>
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
                onClick={() => !channel.isDisabled && setSelectedChannel(channel)}
                className={`group glass-card border rounded-2xl overflow-hidden transition-all duration-300 ${
                  channel.isDisabled
                    ? "border-red-500/50 opacity-60 cursor-not-allowed"
                    : "border-border/50 cursor-pointer hover:border-primary/50 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/20"
                }`}
              >
                <div className="relative h-40 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20" />
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

                  {channel.isDisabled && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500 text-white shadow-lg">
                      <Ban className="w-3 h-3" />
                      Désactivée
                    </div>
                  )}

                  {!channel.isDisabled && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500 text-white shadow-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </div>
                  )}

                  {isAdmin && (
                    <>
                      <button
                        onClick={(e) => openEditModal(channel, e)}
                        className="absolute top-3 right-20 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg bg-blue-500/80 text-white hover:bg-blue-600"
                        title="Modifier la chaîne"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => toggleChannelDisabled(channel, e)}
                        className={`absolute top-3 right-12 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg ${
                          channel.isDisabled
                            ? "bg-green-500 text-white hover:bg-green-600"
                            : "bg-red-500/80 text-white hover:bg-red-600"
                        }`}
                        title={channel.isDisabled ? "Réactiver la chaîne" : "Désactiver la chaîne"}
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </>
                  )}

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

      {editingChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-card border border-border/50 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Modifier la chaîne</h2>
              <button
                onClick={() => setEditingChannel(null)}
                className="w-10 h-10 rounded-full glass-card border border-border/50 flex items-center justify-center hover:border-red-500/50 hover:text-red-500 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Nom de la chaîne</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-card border border-border/50 text-foreground focus:border-primary focus:outline-none"
                  placeholder="Nom personnalisé"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">URL du logo</label>
                <input
                  type="text"
                  value={editLogo}
                  onChange={(e) => setEditLogo(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-card border border-border/50 text-foreground focus:border-primary focus:outline-none"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              {editLogo && (
                <div className="flex items-center justify-center p-4 glass-card border border-border/50 rounded-xl">
                  <Image
                    src={editLogo || "/placeholder.svg"}
                    alt="Aperçu du logo"
                    width={120}
                    height={60}
                    className="object-contain max-h-16"
                    unoptimized
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditingChannel(null)}
                  className="flex-1 px-4 py-3 rounded-xl glass-card border border-border/50 text-foreground hover:border-red-500/50 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={saveChannelEdit}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold hover:opacity-90 transition-all"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PlayerModal
        channel={selectedChannel}
        isOpen={!!selectedChannel}
        onClose={() => setSelectedChannel(null)}
        country={country}
      />
    </div>
  )
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

function getCategoryButtonStyle(category: string, isSelected: boolean) {
  if (isSelected) {
    switch (category?.toLowerCase()) {
      case "sport":
        return "bg-green-500 text-white shadow-lg shadow-green-500/30"
      case "actualités":
      case "news":
        return "bg-red-500 text-white shadow-lg shadow-red-500/30"
      case "enfants":
      case "kids":
        return "bg-yellow-500 text-black shadow-lg shadow-yellow-500/30"
      case "cinéma":
      case "cinema":
        return "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
      case "musique":
      case "music":
        return "bg-pink-500 text-white shadow-lg shadow-pink-500/30"
      case "documentaire":
        return "bg-teal-500 text-white shadow-lg shadow-teal-500/30"
      case "généraliste":
        return "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30"
      case "divers":
        return "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
      default:
        return "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
    }
  }
  return "glass-card border border-border/50 text-foreground hover:border-primary/50 hover:bg-primary/10"
}
