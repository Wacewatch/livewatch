"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Users, LaptopMinimal as TvMinimal, Shield, Crown, UserCircle, Activity, TrendingUp, Key, Copy, Home, Globe, RefreshCw, Trash2, Network, ChevronDown, ChevronUp, Radio, Plus, MessageSquare, LinkIcon, Zap, Edit, Server, CreditCard } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { KofiTransactions } from "@/components/kofi-transactions"

// ... existing code (interfaces) ...

interface Stats {
  totalUsers: number
  totalChannels: number
  enabledChannels: number
  totalFavorites: number
  vipUsers: number
  adminUsers: number
  membersOnline: number
  guestsOnline: number
  onlineUsers: number
  liveViewers: number
  topChannels: Array<{ channel_id: string; channel_name: string; view_count: number }>
  currentlyWatching: Array<{ channel_id: string; channel_name: string; viewer_count: number }>
  viewsPerDay: Record<string, number>
}

interface User {
  id: string
  email: string
  role: "admin" | "vip" | "member"
  created_at: string
}

interface Channel {
  id: string
  name: string
  enabled: boolean
  sort_order: number
  category?: string
  language?: string
  logo?: string
  background?: string
  type: "external" | "custom"
}

interface VipKey {
  id: string
  key: string
  used: boolean
  used_by?: string
  used_at?: string
  created_at: string
}

interface SyncStatus {
  cached_channels: number
  last_sync: {
    started_at: string
    status: string
  }
}

interface ServerStats {
  cpu: {
    usage: number
    cores: number
    model: string
  }
  memory: {
    usagePercent: number | string // Changed to allow string for initial loading state
    used: string
    total: string
  }
  network?: {
    activeConnections: number
    requestsPerMinute: number
    bandwidthEstimate: string
    source1?: number
    source2?: number
    source3?: number
    total?: number
  }
  system: {
    uptime: string
    platform: string
    nodeVersion?: string
  }
}

interface Country {
  id: string
  name: string
  enabled: boolean
  channel_count?: number
}

interface ProxyConfig {
  git_url: string
  update_interval_minutes: number
  auto_update_enabled: boolean
  min_success_rate: number
  max_response_time_ms: number
  last_update: string
}

interface Proxy {
  id: number
  proxy_url: string
  host: string
  port: number
  success_rate: number
  speed_ms: number
  times_used: number
  is_active: boolean
  last_used: string
  last_checked: string
  country?: string
}

interface ProxySource {
  id: number
  name: string
  git_url: string
  enabled: boolean
  last_sync: string | null
  sync_interval_minutes: number
}

interface SourceConfig {
  source1_enabled: boolean
  source2_enabled: boolean
  source3_enabled: boolean
  external_proxy_url?: string // Added to SourceConfig
  default_tvvoo_source?: number // Default TvVoo alternative source (0 for first, 1 for second, etc.)
}

interface GlobalBanner {
  message: string
  enabled: boolean
  bg_color: string
  text_color: string
}

interface CountryBanner {
  country_name: string
  message: string
  enabled: boolean
  bg_color: string
  text_color: string
}

interface CollapsibleState {
  countries: boolean
  proxyRotator: boolean
  users: boolean
  vipKeys: boolean
  sources: boolean
  globalBanner: boolean
  countryBanners: boolean
  // @ts-ignore - Add customSources to collapsed state
  customSources: boolean // Added
  kofiTransactions: boolean
}

interface ExternalProxyConfig {
  url: string
  enabled: boolean
}

interface CustomProxySource {
  id: string
  name: string
  proxy_url: string
  description: string
  enabled: boolean
  sort_order: number
  created_at: string
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [proxyConfig, setProxyConfig] = useState<ProxyConfig | null>(null)
  const [proxySources, setProxySources] = useState<ProxySource[]>([])
  const [showAddProxySourceDialog, setShowAddProxySourceDialog] = useState(false)
  const [newProxySource, setNewProxySource] = useState({ name: "", git_url: "", sync_interval_minutes: 30 })
  const [proxyStats, setProxyStats] = useState({ totalProxies: 0, activeProxies: 0 })
  const [loading, setLoading] = useState(true)
  const [userSearch, setUserSearch] = useState("")
  const [channelSearch, setChannelSearch] = useState("")
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [isMergeMode, setIsMergeMode] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "",
    category: "",
    language: "",
    logo: "",
    background: "",
  })
  const [vipKeys, setVipKeys] = useState<VipKey[]>([])
  const [showVipKeyDialog, setShowVipKeyDialog] = useState(false)
  const [newGeneratedKey, setNewGeneratedKey] = useState("")
  const [serverStats, setServerStats] = useState<ServerStats | null>({
    cpu: { usage: 0, cores: 0, model: "" },
    memory: { usagePercent: "0%", used: "0B", total: "0B" }, // Initial state for memory
    system: { uptime: "", platform: "" },
  }) // Initial state for serverStats
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>({
    cached_channels: 0,
    last_sync: { started_at: "", status: "idle" },
  })
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createMode, setCreateMode] = useState<"create" | "merge">("create")
  const [createForm, setCreateForm] = useState({
    name: "",
    category: "",
    language: "FR",
    logo: "",
    background: "",
    sources: [] as any[],
  })
  const [showProxyConfigDialog, setShowProxyConfigDialog] = useState(false)
  const [editProxyConfig, setEditProxyConfig] = useState({
    git_url: "",
    update_interval_minutes: 30,
    auto_update_enabled: true,
    min_success_rate: 70,
    max_response_time_ms: 5000,
  })

  const [showAddProxyDialog, setShowAddProxyDialog] = useState(false)
  const [newProxy, setNewProxy] = useState({ host: "", port: "" })

  const [externalProxyUrl, setExternalProxyUrl] = useState("")
  const [showExternalProxyDialog, setShowExternalProxyDialog] = useState(false)

  const [globalBanner, setGlobalBanner] = useState<GlobalBanner>({
    message: "",
    enabled: false,
    bg_color: "#3b82f6",
    text_color: "#ffffff",
  })
  const [countryBanners, setCountryBanners] = useState<CountryBanner[]>([])
  const [editingCountryBanner, setEditingCountryBanner] = useState<string | null>(null)
  const [newCountryBannerMessage, setNewCountryBannerMessage] = useState("")

  const [collapsed, setCollapsed] = useState<CollapsibleState>({
    countries: false,
    proxyRotator: false,
    users: false,
    vipKeys: false,
    sources: false,
    globalBanner: false,
    countryBanners: true,
    // @ts-ignore - Add customSources to collapsed state
    customSources: false, // Added
    kofiTransactions: false,
  })
  const [proxyListLimit, setProxyListLimit] = useState(10)
  const [proxySort, setProxySort] = useState<"speed" | "success" | "country">("speed")

  const [pageLoading, setPageLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingModules, setLoadingModules] = useState({
    stats: false,
    users: false,
    countries: false,
    proxies: false,
    sources: false,
  })

  const [statsLoaded, setStatsLoaded] = useState(false)
  const statsLoadedRef = useRef(false)

  const [sourceConfig, setSourceConfig] = useState<SourceConfig>({
    source1_enabled: true,
    source2_enabled: true,
    source3_enabled: true,
  })

  const [customSources, setCustomSources] = useState<CustomProxySource[]>([])
  const [showAddCustomSourceDialog, setShowAddCustomSourceDialog] = useState(false)
  const [newCustomSource, setNewCustomSource] = useState({ name: "", proxy_url: "", description: "" })
  const [editingCustomSource, setEditingCustomSource] = useState<CustomProxySource | null>(null)

  const fetchRealtimeStats = useCallback(async () => {
    try {
      const [statsRes, serverStatsRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/server-stats"),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (serverStatsRes.ok) {
        const serverData = await serverStatsRes.json()
        setServerStats(serverData)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch realtime stats:", error)
    }
  }, [])

  useEffect(() => {
    setPageLoading(false)

    if (!statsLoadedRef.current) {
      statsLoadedRef.current = true
      fetchInitialData()
    }

    const realtimeInterval = setInterval(() => {
      fetchRealtimeStats()
    }, 5000)

    return () => clearInterval(realtimeInterval)
  }, [fetchRealtimeStats])

  const fetchInitialData = async () => {
    try {
      setLoadingModules((prev) => ({ ...prev, stats: true }))
      setLoadingProgress(10)

      const statsRes = await fetch("/api/admin/stats")
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
      setLoadingModules((prev) => ({ ...prev, stats: false }))
      setLoadingProgress(30)

      setLoadingModules((prev) => ({ ...prev, users: true }))
      const usersRes = await fetch("/api/admin/users")
      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users || [])
      }
      setLoadingModules((prev) => ({ ...prev, users: false }))
      setLoadingProgress(50)

      setLoadingModules((prev) => ({ ...prev, sources: true }))
      const [keysRes, sourceConfigRes, bannersRes, customSourcesRes] = await Promise.all([
        fetch("/api/admin/vip-keys"),
        fetch("/api/admin/source-config"),
        fetch("/api/admin/banners"),
        fetch("/api/admin/custom-sources"),
      ])
      if (keysRes.ok) {
        const keysData = await keysRes.json()
        setVipKeys(keysData.keys || [])
      }
      if (sourceConfigRes.ok) {
        const configData = await sourceConfigRes.json()
        setSourceConfig(configData)
        if (configData.external_proxy_url) {
          setExternalProxyUrl(configData.external_proxy_url)
        }
      }
      if (bannersRes.ok) {
        const bannersData = await bannersRes.json()
        if (bannersData.globalBanner) {
          setGlobalBanner(bannersData.globalBanner)
        }
        if (bannersData.countryBanners) {
          setCountryBanners(bannersData.countryBanners)
        }
      }
      if (customSourcesRes.ok) {
        const customSourcesData = await customSourcesRes.json()
        setCustomSources(customSourcesData.sources || [])
      }
      setLoadingModules((prev) => ({ ...prev, sources: false }))
      setLoadingProgress(70)

      setLoadingModules((prev) => ({ ...prev, countries: true }))
      const countriesRes = await fetch("/api/admin/countries")
      if (countriesRes.ok) {
        const countriesData = await countriesRes.json()
        setCountries(countriesData.countries || [])
      }
      setLoadingModules((prev) => ({ ...prev, countries: false }))
      setLoadingProgress(85)

      setLoadingModules((prev) => ({ ...prev, proxies: true }))
      const proxyRes = await fetch("/api/admin/proxy-pool")
      if (proxyRes.ok) {
        const proxyData = await proxyRes.json()
        setProxies(proxyData.proxies || [])
        setProxySources(proxyData.proxySources || [])
        setProxyStats({
          totalProxies: proxyData.totalProxies || 0,
          activeProxies: proxyData.activeProxies || 0,
        })
      }
      setLoadingModules((prev) => ({ ...prev, proxies: false }))
      setLoadingProgress(100)

      // Fetch server stats
      await fetchRealtimeStats()

      setStatsLoaded(true)
    } catch (error) {
      console.error("[v0] Failed to fetch initial data:", error)
      setLoadingProgress(100)
    }
  }

  // ... existing code for all other functions ...

  const fetchDashboardData = async () => {
    try {
      const [countriesRes, proxyRes] = await Promise.all([
        fetch("/api/admin/countries"),
        fetch("/api/admin/proxy-pool"),
      ])

      if (countriesRes.ok) {
        const countriesData = await countriesRes.json()
        setCountries(countriesData.countries || [])
      }

      if (proxyRes.ok) {
        const proxyData = await proxyRes.json()
        setProxies(proxyData.proxies || [])
        setProxySources(proxyData.proxySources || [])
        setProxyStats({
          totalProxies: proxyData.totalProxies || 0,
          activeProxies: proxyData.activeProxies || 0,
        })
      }
    } catch (error) {
      console.error("[v0] Failed to fetch dashboard data:", error)
    }
  }

  const toggleChannel = async (channelId: string, enabled: boolean) => {
    try {
      const response = await fetch("/api/admin/channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: channelId, enabled }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`Échec de la mise à jour de la chaîne: ${data.error || "Erreur inconnue"}`)
        return
      }

      await fetchDashboardData()
    } catch (error) {
      console.error("[v0] Failed to toggle channel:", error)
      alert(`Erreur lors de la mise à jour de la chaîne: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
    }
  }

  const updateUserRole = async (userId: string, role: string) => {
    try {
      await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      })
      fetchDashboardData()
    } catch (error) {
      console.error("[v0] Failed to update user role:", error)
    }
  }

  const toggleCountry = async (countryId: string, enabled: boolean) => {
    try {
      await fetch("/api/admin/countries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: countryId, enabled }),
      })
      const countriesRes = await fetch("/api/admin/countries")
      if (countriesRes.ok) {
        const countriesData = await countriesRes.json()
        setCountries(countriesData.countries || [])
      }
    } catch (error) {
      console.error("[v0] Failed to toggle country:", error)
    }
  }

  const toggleSource = async (sourceNumber: 1 | 2 | 3, enabled: boolean) => {
    const key = `source${sourceNumber}_enabled` as keyof SourceConfig
    const newConfig = { ...sourceConfig, [key]: enabled }
    setSourceConfig(newConfig)

    try {
      await fetch("/api/admin/source-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      })
    } catch (error) {
      console.error("[v0] Failed to toggle source:", error)
      setSourceConfig(sourceConfig)
    }
  }

  const toggleCollapse = (module: keyof CollapsibleState) => {
    setCollapsed((prev) => ({ ...prev, [module]: !prev[module] }))
  }

  const syncProxies = async () => {
    try {
      const res = await fetch("/api/admin/proxy-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_proxies" }),
      })

      const data = await res.json()
      if (data.success) {
        alert(`Synchronisation réussie ! ${data.added} proxies ajoutés`)
        fetchDashboardData()
      }
    } catch (error) {
      console.error("[v0] Failed to sync proxies:", error)
      alert("Échec de la synchronisation")
    }
  }

  const deleteInactiveProxies = async () => {
    if (!confirm("Supprimer tous les proxies inactifs ?")) return

    try {
      await fetch("/api/admin/proxy-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_inactive" }),
      })
      fetchDashboardData()
    } catch (error) {
      console.error("[v0] Failed to delete inactive proxies:", error)
    }
  }

  const addProxySource = async () => {
    if (!newProxySource.name || !newProxySource.git_url) {
      alert("Le nom et l'URL Git sont requis")
      return
    }

    try {
      await fetch("/api/admin/proxy-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_proxy_source",
          ...newProxySource,
        }),
      })
      setShowAddProxySourceDialog(false)
      setNewProxySource({ name: "", git_url: "", sync_interval_minutes: 30 })
      fetchDashboardData()
    } catch (error) {
      console.error("[v0] Failed to add proxy source:", error)
    }
  }

  const toggleProxySource = async (id: number, enabled: boolean) => {
    try {
      await fetch("/api/admin/proxy-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_proxy_source",
          id,
          enabled,
        }),
      })
      fetchDashboardData()
    } catch (error) {
      console.error("[v0] Failed to toggle proxy source:", error)
    }
  }

  const deleteProxySource = async (id: number) => {
    if (!confirm("Supprimer cette source de proxies ?")) return

    try {
      await fetch("/api/admin/proxy-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_proxy_source",
          id,
        }),
      })
      fetchDashboardData()
    } catch (error) {
      console.error("[v0] Failed to delete proxy source:", error)
    }
  }

  const deleteSingleProxy = async (id: number) => {
    if (!confirm("Supprimer ce proxy ?")) return
    try {
      await fetch("/api/admin/proxy-pool", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      fetchDashboardData()
    } catch (error) {
      console.error("[v0] Failed to delete proxy:", error)
    }
  }

  const addSingleProxy = async () => {
    if (!newProxy.host || !newProxy.port) {
      alert("L'hôte et le port sont requis")
      return
    }

    try {
      const res = await fetch("/api/admin/proxy-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_single_proxy",
          host: newProxy.host,
          port: Number.parseInt(newProxy.port),
        }),
      })

      const data = await res.json()
      if (data.success) {
        alert("Proxy ajouté avec succès !")
        setShowAddProxyDialog(false)
        setNewProxy({ host: "", port: "" })
        fetchDashboardData()
      } else {
        alert(`Erreur: ${data.error || "Échec de l'ajout"}`)
      }
    } catch (error) {
      console.error("[v0] Failed to add proxy:", error)
      alert("Échec de l'ajout du proxy")
    }
  }

  const saveExternalProxyUrl = async () => {
    try {
      await fetch("/api/admin/source-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sourceConfig,
          external_proxy_url: externalProxyUrl,
        }),
      })
      setShowExternalProxyDialog(false)
      alert("URL du proxy externe enregistrée !")
    } catch (error) {
      console.error("[v0] Failed to save external proxy URL:", error)
      alert("Échec de l'enregistrement")
    }
  }

  const generateVipKey = async () => {
    try {
      const res = await fetch("/api/admin/vip-keys", {
        method: "POST",
      })
      const data = await res.json()
      if (data.key) {
        setNewGeneratedKey(data.key)
        setShowVipKeyDialog(true)
        const keysRes = await fetch("/api/admin/vip-keys")
        if (keysRes.ok) {
          const keysData = await keysRes.json()
          setVipKeys(keysData.keys || [])
        }
      }
    } catch (error) {
      console.error("[v0] Failed to generate VIP key:", error)
    }
  }

  const deleteVipKey = async (keyId: string) => {
    if (!confirm("Supprimer cette clé VIP ?")) return

    try {
      await fetch("/api/admin/vip-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId }),
      })
      const keysRes = await fetch("/api/admin/vip-keys")
      if (keysRes.ok) {
        const keysData = await keysRes.json()
        setVipKeys(keysData.keys || [])
      }
    } catch (error) {
      console.error("[v0] Failed to delete VIP key:", error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert("Copié !")
  }

  const saveGlobalBanner = async () => {
    try {
      await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "global", ...globalBanner }),
      })
      alert("Message global enregistré !")
    } catch (error) {
      console.error("[v0] Failed to save global banner:", error)
    }
  }

  const saveCountryBanner = async (countryName: string, message: string) => {
    try {
      await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "country",
          country_name: countryName,
          message,
          enabled: true,
          bg_color: "#f59e0b",
          text_color: "#000000",
        }),
      })
      setEditingCountryBanner(null)
      setNewCountryBannerMessage("")

      const bannersRes = await fetch("/api/admin/banners")
      if (bannersRes.ok) {
        const bannersData = await bannersRes.json()
        if (bannersData.countryBanners) {
          setCountryBanners(bannersData.countryBanners)
        }
      }
    } catch (error) {
      console.error("[v0] Failed to save country banner:", error)
    }
  }

  const addCustomSource = async () => {
    if (!newCustomSource.name || !newCustomSource.proxy_url) {
      alert("Le nom et l'URL du proxy sont requis")
      return
    }

    try {
      const res = await fetch("/api/admin/custom-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomSource),
      })

      const data = await res.json()
      if (data.success) {
        alert("Source ajoutée avec succès !")
        setShowAddCustomSourceDialog(false)
        setNewCustomSource({ name: "", proxy_url: "", description: "" })
        // Refresh custom sources
        const customSourcesRes = await fetch("/api/admin/custom-sources")
        if (customSourcesRes.ok) {
          const customSourcesData = await customSourcesRes.json()
          setCustomSources(customSourcesData.sources || [])
        }
      } else {
        alert(`Erreur: ${data.error || "Échec de l'ajout"}`)
      }
    } catch (error) {
      console.error("[v0] Failed to add custom source:", error)
      alert("Échec de l'ajout de la source")
    }
  }

  const toggleCustomSource = async (id: string, enabled: boolean) => {
    try {
      await fetch("/api/admin/custom-sources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled }),
      })
      // Refresh custom sources
      const customSourcesRes = await fetch("/api/admin/custom-sources")
      if (customSourcesRes.ok) {
        const customSourcesData = await customSourcesRes.json()
        setCustomSources(customSourcesData.sources || [])
      }
    } catch (error) {
      console.error("[v0] Failed to toggle custom source:", error)
    }
  }

  const deleteCustomSource = async (id: string) => {
    if (!confirm("Supprimer cette source personnalisée ?")) return

    try {
      await fetch("/api/admin/custom-sources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      // Refresh custom sources
      const customSourcesRes = await fetch("/api/admin/custom-sources")
      if (customSourcesRes.ok) {
        const customSourcesData = await customSourcesRes.json()
        setCustomSources(customSourcesData.sources || [])
      }
    } catch (error) {
      console.error("[v0] Failed to delete custom source:", error)
    }
  }

  const updateCustomSource = async () => {
    if (!editingCustomSource) return

    try {
      await fetch("/api/admin/custom-sources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCustomSource),
      })
      setEditingCustomSource(null)
      // Refresh custom sources
      const customSourcesRes = await fetch("/api/admin/custom-sources")
      if (customSourcesRes.ok) {
        const customSourcesData = await customSourcesRes.json()
        setCustomSources(customSourcesData.sources || [])
      }
    } catch (error) {
      console.error("[v0] Failed to update custom source:", error)
    }
  }

  const sortedProxies = [...proxies].sort((a, b) => {
    if (proxySort === "speed") return a.speed_ms - b.speed_ms
    if (proxySort === "success") return b.success_rate - a.success_rate
    if (proxySort === "country") return (a.country || "").localeCompare(b.country || "")
    return 0
  })

  const enabledSourcesCount = [
    sourceConfig.source1_enabled,
    sourceConfig.source2_enabled,
    sourceConfig.source3_enabled,
  ].filter(Boolean).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      {loadingProgress < 100 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-border/30"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - loadingProgress / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  {loadingProgress}%
                </span>
              </div>
            </div>
            <p className="text-xl font-semibold text-foreground">Chargement du tableau de bord...</p>
            <p className="text-sm text-muted-foreground mt-2">Récupération des données</p>
          </div>
        </div>
      )}

      <div className="p-4 md:p-6 lg:p-8 max-w-[1800px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Administration
            </h1>
            <p className="text-muted-foreground mt-1">Tableau de bord Admin</p>
          </div>
          <a
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card border border-border/50 hover:border-primary/50 transition-all"
          >
            <Home className="w-5 h-5" />
            <span className="hidden md:inline">Retour au site</span>
          </a>
        </div>

        {/* Stats Cards Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 glass-card border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-400 flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  CPU App
                </p>
                {serverStats ? (
                  <>
                    <p className="text-2xl font-bold text-foreground mt-2">{serverStats.cpu.usage.toFixed(2)}%</p>
                    <div className="w-full bg-border/50 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-gradient-to-r from-cyan-400 to-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(serverStats.cpu.usage, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Next.js App Process</p>
                  </>
                ) : (
                  <div className="h-16 flex items-center">
                    <div className="animate-pulse bg-border/50 rounded h-8 w-20" />
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* RAM App Card - Updated */}
          <Card className="p-4 glass-card border border-border/50">
            <div>
              <p className="text-sm text-pink-400 flex items-center gap-1">
                <Zap className="w-4 h-4" />
                RAM App
              </p>
              {serverStats ? (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Usage:</span>
                    <span className="text-lg font-bold text-foreground">
                      {typeof serverStats.memory?.usagePercent === "number"
                        ? serverStats.memory.usagePercent.toFixed(2)
                        : serverStats.memory?.usagePercent || 0}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-border/30 rounded-full h-2 mb-2">
                    <div
                      className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(typeof serverStats.memory?.usagePercent === "number" ? serverStats.memory.usagePercent : Number.parseFloat(serverStats.memory?.usagePercent as string) || 0, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {serverStats.memory?.used || "0"} / {serverStats.memory?.total || "0"}
                  </p>
                </div>
              ) : (
                <div className="h-16 flex items-center">
                  <div className="animate-pulse bg-border/50 rounded h-12 w-full" />
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4 glass-card border border-border/50">
            <div>
              <p className="text-sm text-blue-400 flex items-center gap-1">
                <Network className="w-4 h-4" />
                Réseau
              </p>
              {serverStats?.network ? (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-2">Par Source:</p>
                  <div className="grid grid-cols-3 gap-1 mb-3">
                    <div className="text-center p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                      <p className="text-[10px] text-cyan-400">S1</p>
                      <p className="text-sm font-bold text-foreground">{serverStats.network.source1 || 0}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-orange-500/10 border border-orange-500/30">
                      <p className="text-[10px] text-orange-400">S2</p>
                      <p className="text-sm font-bold text-foreground">{serverStats.network.source2 || 0}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-purple-500/10 border border-purple-500/30">
                      <p className="text-[10px] text-purple-400">S3</p>
                      <p className="text-sm font-bold text-foreground">{serverStats.network.source3 || 0}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="text-foreground font-medium">{serverStats.network.total || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Req/min:</span>
                      <span className="text-foreground font-medium">{serverStats.network.requestsPerMinute}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bande:</span>
                      <span className="text-foreground font-medium">{serverStats.network.bandwidthEstimate}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center">
                  <div className="animate-pulse bg-border/50 rounded h-16 w-full" />
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4 glass-card border border-border/50">
            <div>
              <p className="text-sm text-blue-400 flex items-center gap-1">
                <TvMinimal className="w-4 h-4" />
                Système
              </p>
              {serverStats ? (
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Uptime:</span>
                    <span className="text-sm font-bold text-foreground">{serverStats.system.uptime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Platform:</span>
                    <span className="text-sm text-foreground">{serverStats.system.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Node:</span>
                    <span className="text-sm text-foreground">{serverStats.system.nodeVersion}</span>
                  </div>
                </div>
              ) : (
                <div className="h-16 flex items-center">
                  <div className="animate-pulse bg-border/50 rounded h-12 w-full" />
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Stats Cards Row 2 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 glass-card border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilisateurs</p>
                <p className="text-3xl font-bold text-foreground">{stats?.totalUsers || users.length}</p>
              </div>
              <Users className="w-8 h-8 text-cyan-400" />
            </div>
          </Card>

          <Card className="p-4 glass-card border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chaînes</p>
                <p className="text-3xl font-bold text-foreground">{stats?.totalChannels || 0}</p>
                <p className="text-xs text-muted-foreground">Tous pays confondus</p>
              </div>
              <TvMinimal className="w-8 h-8 text-blue-400" />
            </div>
          </Card>

          <Card className="p-4 glass-card border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">VIP</p>
                <p className="text-3xl font-bold text-foreground">{stats?.vipUsers || 0}</p>
              </div>
              <Crown className="w-8 h-8 text-orange-400" />
            </div>
          </Card>

          <Card className="p-4 glass-card border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-3xl font-bold text-foreground">{stats?.adminUsers || 0}</p>
              </div>
              <Shield className="w-8 h-8 text-red-400" />
            </div>
          </Card>
        </div>

        {/* Live Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-6 glass-card border border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <h3 className="font-semibold text-foreground">En ligne</h3>
              <div className="ml-auto flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
            </div>
            <p className="text-5xl font-bold text-green-400">{stats?.onlineUsers || 0}</p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Membres:</span>
                <span className="text-foreground">{stats?.membersOnline || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invités:</span>
                <span className="text-foreground">{stats?.guestsOnline || 0}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 glass-card border border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <TvMinimal className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-foreground">En visionnage</h3>
              <div className="ml-auto flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
            </div>
            <p className="text-5xl font-bold text-purple-400">{stats?.liveViewers || 0}</p>
            <p className="text-sm text-muted-foreground mt-4">regardent maintenant</p>
          </Card>

          <Card className="p-6 glass-card border border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-orange-400" />
              <h3 className="font-semibold text-foreground">Top Chaînes en Direct</h3>
              <div className="ml-auto flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
            </div>
            {stats?.topChannels && stats.topChannels.length > 0 ? (
              <div className="space-y-2">
                {stats.topChannels.slice(0, 5).map((channel, index) => (
                  <div key={channel.channel_id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">#{index + 1}</span>
                      <span className="text-foreground truncate max-w-[150px]">{channel.channel_name}</span>
                    </div>
                    <span className="text-orange-400 font-medium">
                      {channel.view_count} <TrendingUp className="w-3 h-3 inline" />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Aucune donnée</p>
            )}
          </Card>
        </div>

        {/* Gestion des Sources */}
        <Card className="mb-6 glass-card border border-border/50 overflow-hidden">
          <div
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/5 transition-colors"
            onClick={() => toggleCollapse("sources")}
          >
            <div className="flex items-center gap-3">
              <Radio className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Gestion des Sources</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{enabledSourcesCount} activées sur 3</span>
              {collapsed.sources ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </div>
          </div>

          {!collapsed.sources && (
            <div className="p-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 rounded-xl glass-card border border-border/50">
                  <div>
                    <p className="font-semibold text-foreground">Source 1</p>
                    <p className="text-xs text-muted-foreground">Proxy par défaut</p>
                  </div>
                  <Switch
                    checked={sourceConfig.source1_enabled}
                    onCheckedChange={(checked) => toggleSource(1, checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl glass-card border border-border/50">
                  <div>
                    <p className="font-semibold text-foreground">Source 2</p>
                    <p className="text-xs text-muted-foreground">Worker externe</p>
                  </div>
                  <Switch
                    checked={sourceConfig.source2_enabled}
                    onCheckedChange={(checked) => toggleSource(2, checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl glass-card border border-border/50">
                  <div>
                    <p className="font-semibold text-foreground">Source 3</p>
                    <p className="text-xs text-muted-foreground">Proxy rotatif</p>
                  </div>
                  <Switch
                    checked={sourceConfig.source3_enabled}
                    onCheckedChange={(checked) => toggleSource(3, checked)}
                  />
                </div>
              </div>

              <div className="px-4 pb-4">
                <div className="p-4 rounded-xl glass-card border border-border/50">
                  <Label htmlFor="default-source" className="text-sm font-semibold text-foreground mb-2 block">
                    Source alternative par défaut
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Choisissez quelle source alternative utiliser par défaut pour toutes les chaînes
                  </p>
                  <Select
                    value={(sourceConfig.default_tvvoo_source ?? 0).toString()}
                    onValueChange={(value) => {
                      const newConfig = { ...sourceConfig, default_tvvoo_source: parseInt(value) }
                      setSourceConfig(newConfig)
                      fetch("/api/admin/source-config", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(newConfig),
                      })
                    }}
                  >
                    <SelectTrigger id="default-source" className="bg-background/50">
                      <SelectValue placeholder="Sélectionner une source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Source Alpha (Première)</SelectItem>
                      <SelectItem value="1">Source Beta (Seconde)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Message Global */}
        <Card className="mb-6 glass-card border border-border/50 overflow-hidden">
          <div
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/5 transition-colors"
            onClick={() => toggleCollapse("globalBanner")}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-bold text-foreground">Message Global</h2>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={globalBanner.enabled ? "default" : "secondary"}>
                {globalBanner.enabled ? "Actif" : "Inactif"}
              </Badge>
              {collapsed.globalBanner ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </div>
          </div>

          {!collapsed.globalBanner && (
            <div className="p-4 pt-0 space-y-4">
              <p className="text-sm text-muted-foreground">Ce message sera affiché en bandeau sur la page principale</p>

              <div className="flex items-center gap-3">
                <Switch
                  checked={globalBanner.enabled}
                  onCheckedChange={(checked) => setGlobalBanner({ ...globalBanner, enabled: checked })}
                />
                <span className="text-sm text-foreground">Activer le bandeau</span>
              </div>

              <Input
                placeholder="Votre message..."
                value={globalBanner.message}
                onChange={(e) => setGlobalBanner({ ...globalBanner, message: e.target.value })}
                className="glass-card border-border/50"
              />

              <div className="flex gap-4">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Couleur de fond</Label>
                  <Input
                    type="color"
                    value={globalBanner.bg_color}
                    onChange={(e) => setGlobalBanner({ ...globalBanner, bg_color: e.target.value })}
                    className="h-10 p-1"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Couleur du texte</Label>
                  <Input
                    type="color"
                    value={globalBanner.text_color}
                    onChange={(e) => setGlobalBanner({ ...globalBanner, text_color: e.target.value })}
                    className="h-10 p-1"
                  />
                </div>
              </div>

              <Button onClick={saveGlobalBanner} className="bg-gradient-to-r from-primary to-accent text-white">
                Enregistrer
              </Button>
            </div>
          )}
        </Card>

        {/* Gestion des Pays */}
        <Card className="mb-6 glass-card border border-border/50 overflow-hidden">
          <div
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/5 transition-colors"
            onClick={() => toggleCollapse("countries")}
          >
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-green-400" />
              <h2 className="text-xl font-bold text-foreground">Gestion des Pays</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {countries.filter((c) => c.enabled).length} activés sur {countries.length}
              </span>
              {collapsed.countries ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </div>
          </div>

          {!collapsed.countries && (
            <div className="p-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {countries.map((country) => {
                  const banner = countryBanners.find((b) => b.country_name === country.name)
                  return (
                    <div key={country.id} className="p-4 rounded-xl glass-card border border-border/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{country.name}</p>
                          <p className="text-xs text-muted-foreground">{country.channel_count || 0} chaînes</p>
                        </div>
                        <Switch
                          checked={country.enabled}
                          onCheckedChange={(checked) => toggleCountry(country.id, checked)}
                        />
                      </div>

                      {editingCountryBanner === country.name ? (
                        <div className="space-y-2">
                          <Input
                            placeholder="Message du bandeau..."
                            value={newCountryBannerMessage}
                            onChange={(e) => setNewCountryBannerMessage(e.target.value)}
                            className="text-xs"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => saveCountryBanner(country.name, newCountryBannerMessage)}
                              className="flex-1"
                            >
                              Sauver
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingCountryBanner(null)}>
                              Annuler
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {banner?.message ? (
                            <p className="text-xs text-muted-foreground flex-1 truncate">{banner.message}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground flex-1">Aucun message</p>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingCountryBanner(country.name)
                              setNewCountryBannerMessage(banner?.message || "")
                            }}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Système de Proxy Rotatif */}
        <Card className="mb-6 glass-card border border-border/50 overflow-hidden">
          <div
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/5 transition-colors"
            onClick={() => toggleCollapse("proxyRotator")}
          >
            <div className="flex items-center gap-3">
              <Network className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-foreground">Système de Proxy Rotatif</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {proxyStats.activeProxies} actifs / {proxyStats.totalProxies} total
              </span>
              {collapsed.proxyRotator ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </div>
          </div>

          {!collapsed.proxyRotator && (
            <div className="p-4 pt-0 space-y-4">
              <p className="text-sm text-muted-foreground">
                Gestion des sources Git pour le chargement automatique de proxies
              </p>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setShowAddProxySourceDialog(true)} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Ajouter Source
                </Button>
                <Button onClick={() => setShowAddProxyDialog(true)} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" /> Ajouter Proxy
                </Button>
                <Button onClick={() => setShowExternalProxyDialog(true)} size="sm" variant="outline">
                  <LinkIcon className="w-4 h-4 mr-1" /> Proxy Externe (PHP)
                </Button>
                <Button onClick={syncProxies} size="sm" variant="outline">
                  <RefreshCw className="w-4 h-4 mr-1" /> Synchroniser
                </Button>
                <Button onClick={deleteInactiveProxies} size="sm" variant="destructive">
                  <Trash2 className="w-4 h-4 mr-1" /> Supprimer inactifs
                </Button>
              </div>

              {/* External Proxy URL display */}
              {externalProxyUrl && (
                <div className="p-3 rounded-lg glass-card border border-purple-500/10">
                  <p className="text-xs text-purple-400 font-medium mb-1">Proxy Externe (PHP)</p>
                  <p className="text-sm text-foreground truncate">{externalProxyUrl}</p>
                </div>
              )}

              {/* Proxy Sources */}
              <div className="space-y-2">
                {proxySources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between p-3 rounded-lg glass-card border border-border/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{source.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{source.git_url}</p>
                      <p className="text-xs text-muted-foreground">
                        Synchro: {source.sync_interval_minutes}min • Dernière:{" "}
                        {source.last_sync ? new Date(source.last_sync).toLocaleString() : "Jamais"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={source.enabled}
                        onCheckedChange={(checked) => toggleProxySource(source.id, checked)}
                      />
                      <Button size="sm" variant="ghost" onClick={() => deleteProxySource(source.id)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg glass-card border border-border/50 text-center">
                  <p className="text-xs text-muted-foreground">Total Proxies</p>
                  <p className="text-2xl font-bold text-foreground">{proxyStats.totalProxies}</p>
                </div>
                <div className="p-3 rounded-lg glass-card border border-green-500/30 bg-green-500/10 text-center">
                  <p className="text-xs text-green-400">Actifs</p>
                  <p className="text-2xl font-bold text-green-400">{proxyStats.activeProxies}</p>
                </div>
                <div className="p-3 rounded-lg glass-card border border-border/50 text-center">
                  <p className="text-xs text-muted-foreground">Sources</p>
                  <p className="text-2xl font-bold text-foreground">{proxySources.length}</p>
                </div>
                <div className="p-3 rounded-lg glass-card border border-purple-500/30 bg-purple-500/10 text-center">
                  <p className="text-xs text-purple-400">Sources Actives</p>
                  <p className="text-2xl font-bold text-purple-400">{proxySources.filter((s) => s.enabled).length}</p>
                </div>
              </div>

              {/* Sort buttons */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={proxySort === "speed" ? "default" : "outline"}
                  onClick={() => setProxySort("speed")}
                >
                  Vitesse
                </Button>
                <Button
                  size="sm"
                  variant={proxySort === "success" ? "default" : "outline"}
                  onClick={() => setProxySort("success")}
                >
                  Succès
                </Button>
                <Button
                  size="sm"
                  variant={proxySort === "country" ? "default" : "outline"}
                  onClick={() => setProxySort("country")}
                >
                  Pays
                </Button>
              </div>

              {/* Proxy List */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-2 text-muted-foreground">Proxy</th>
                      <th className="text-left p-2 text-muted-foreground">Pays</th>
                      <th className="text-left p-2 text-muted-foreground">Vitesse</th>
                      <th className="text-left p-2 text-muted-foreground">Succès</th>
                      <th className="text-left p-2 text-muted-foreground">Actif</th>
                      <th className="text-left p-2 text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProxies.slice(0, proxyListLimit).map((proxy) => (
                      <tr key={proxy.id} className="border-b border-border/30 hover:bg-accent/5">
                        <td className="p-2 text-foreground font-mono text-xs">{proxy.proxy_url}</td>
                        <td className="p-2 text-muted-foreground">{proxy.country || "?"}</td>
                        <td className="p-2 text-cyan-400">{proxy.speed_ms}ms</td>
                        <td className="p-2 text-green-400">{proxy.success_rate}%</td>
                        <td className="p-2">
                          <Badge variant={proxy.is_active ? "default" : "secondary"}>
                            {proxy.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Button size="sm" variant="ghost" onClick={() => deleteSingleProxy(proxy.id)}>
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {sortedProxies.length > proxyListLimit && (
                <Button variant="outline" onClick={() => setProxyListLimit((prev) => prev + 10)} className="w-full">
                  Afficher plus ({sortedProxies.length - proxyListLimit} restants)
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* VIP Keys */}
        <Card className="mb-6 glass-card border border-border/50 overflow-hidden">
          <div
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/5 transition-colors"
            onClick={() => toggleCollapse("vipKeys")}
          >
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-orange-400" />
              <h2 className="text-xl font-bold text-foreground">Clés VIP</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{vipKeys.filter((k) => !k.used).length} disponibles</span>
              {collapsed.vipKeys ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </div>
          </div>

          {!collapsed.vipKeys && (
            <div className="p-4 pt-0 space-y-4">
              <Button onClick={generateVipKey}>
                <Plus className="w-4 h-4 mr-2" /> Générer une clé VIP
              </Button>

              <div className="space-y-2">
                {vipKeys.map((key) => (
                  <div
                    key={key.id}
                    className={`flex items-center justify-between p-3 rounded-lg glass-card border ${
                      key.used ? "border-border/30 opacity-60" : "border-orange-500/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <code className="text-sm font-mono text-foreground">{key.key}</code>
                      {key.used && <Badge variant="secondary">Utilisée</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(key.key)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteVipKey(key.id)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Users */}
        <Card className="mb-6 glass-card border border-border/50 overflow-hidden">
          <div
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/5 transition-colors"
            onClick={() => toggleCollapse("users")}
          >
            <div className="flex items-center gap-3">
              <UserCircle className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-foreground">Utilisateurs</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{users.length} utilisateurs</span>
              {collapsed.users ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </div>
          </div>

          {!collapsed.users && (
            <div className="p-4 pt-0 space-y-4">
              <Input
                placeholder="Rechercher un utilisateur..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="glass-card border-border/50"
              />

              <div className="space-y-2">
                {users
                  .filter((user) => user.email.toLowerCase().includes(userSearch.toLowerCase()))
                  .slice(0, 20)
                  .map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg glass-card border border-border/50"
                    >
                      <div>
                        <p className="font-medium text-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Inscrit le {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Select value={user.role} onValueChange={(value) => updateUserRole(user.id, value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Membre</SelectItem>
                          <SelectItem value="vip">VIP</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <div
            className="p-4 border-b border-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-700/30 transition-colors"
            onClick={() => toggleCollapse("customSources" as keyof CollapsibleState)}
          >
            <div className="flex items-center gap-3">
              <Server className="h-5 w-5 text-purple-400" />
              <div>
                <h2 className="text-lg font-semibold">Sources Proxy Personnalisées</h2>
                <p className="text-sm text-slate-400">Gérez vos propres proxy (PHP, TS, etc.) pour le streaming</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">
                {customSources.filter((s) => s.enabled).length} activée(s) sur {customSources.length}
              </span>
              {(collapsed as any).customSources ? (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronUp className="h-5 w-5 text-slate-400" />
              )}
            </div>
          </div>

          {!(collapsed as any).customSources && (
            <div className="p-4 space-y-4">
              {/* Add Source Button */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowAddCustomSourceDialog(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une Source
                </Button>
              </div>

              {/* Info Box */}
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <h4 className="text-purple-400 font-medium mb-2">Format de l'URL Proxy</h4>
                <p className="text-sm text-slate-300 mb-2">
                  L'URL doit se terminer par le paramètre pour recevoir l'URL du stream. Exemples :
                </p>
                <code className="text-xs bg-slate-900 p-2 rounded block text-green-400">
                  https://votre-vps.com/proxy.php?url=
                </code>
                <code className="text-xs bg-slate-900 p-2 rounded block text-green-400 mt-1">
                  https://votre-server.com/stream-proxy.ts?stream=
                </code>
                <p className="text-xs text-slate-400 mt-2">
                  Le stream M3U8 sera automatiquement ajouté à la fin de l'URL.
                </p>
              </div>

              {/* Sources List */}
              {customSources.length === 0 ? (
                <div className="text-center py-8 text-slate-400">Aucune source personnalisée configurée</div>
              ) : (
                <div className="space-y-3">
                  {customSources.map((source, index) => (
                    <div
                      key={source.id}
                      className={`p-4 rounded-lg border ${
                        source.enabled ? "bg-slate-700/50 border-purple-500/30" : "bg-slate-800/30 border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={source.enabled ? "default" : "secondary"}
                              className={source.enabled ? "bg-purple-500" : ""}
                            >
                              Source {index + 4}
                            </Badge>
                            <h4 className="font-medium">{source.name}</h4>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 font-mono truncate max-w-md">{source.proxy_url}</p>
                          {source.description && <p className="text-sm text-slate-400 mt-1">{source.description}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <Button size="sm" variant="ghost" onClick={() => setEditingCustomSource(source)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Switch
                            checked={source.enabled}
                            onCheckedChange={(checked) => toggleCustomSource(source.id, checked)}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => deleteCustomSource(source.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Dialogs */}
      <Dialog open={showVipKeyDialog} onOpenChange={setShowVipKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle clé VIP générée</DialogTitle>
          </DialogHeader>
          <div className="p-4 rounded-lg glass-card border border-orange-500/30 bg-orange-500/10">
            <code className="text-lg font-mono text-foreground">{newGeneratedKey}</code>
          </div>
          <Button onClick={() => copyToClipboard(newGeneratedKey)}>
            <Copy className="w-4 h-4 mr-2" /> Copier
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddProxySourceDialog} onOpenChange={setShowAddProxySourceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une source de proxies</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom</Label>
              <Input
                value={newProxySource.name}
                onChange={(e) => setNewProxySource({ ...newProxySource, name: e.target.value })}
                placeholder="Ma source"
              />
            </div>
            <div>
              <Label>URL Git (fichier texte)</Label>
              <Input
                value={newProxySource.git_url}
                onChange={(e) => setNewProxySource({ ...newProxySource, git_url: e.target.value })}
                placeholder="https://raw.githubusercontent.com/..."
              />
            </div>
            <div>
              <Label>Intervalle de synchronisation (minutes)</Label>
              <Input
                type="number"
                value={newProxySource.sync_interval_minutes}
                onChange={(e) =>
                  setNewProxySource({ ...newProxySource, sync_interval_minutes: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProxySourceDialog(false)}>
              Annuler
            </Button>
            <Button onClick={addProxySource}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddProxyDialog} onOpenChange={setShowAddProxyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un proxy manuellement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Hôte</Label>
              <Input
                value={newProxy.host}
                onChange={(e) => setNewProxy({ ...newProxy, host: e.target.value })}
                placeholder="192.168.1.1"
              />
            </div>
            <div>
              <Label>Port</Label>
              <Input
                value={newProxy.port}
                onChange={(e) => setNewProxy({ ...newProxy, port: e.target.value })}
                placeholder="8080"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProxyDialog(false)}>
              Annuler
            </Button>
            <Button onClick={addSingleProxy}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExternalProxyDialog} onOpenChange={setShowExternalProxyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurer le proxy externe (PHP)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Entrez l'URL de votre script proxy PHP. Ce proxy sera utilisé pour la Source 3.
              <br />
              Exemple: https://votreserveur.com/proxy.php
            </p>
            <div>
              <Label>URL du proxy</Label>
              <Input
                value={externalProxyUrl}
                onChange={(e) => setExternalProxyUrl(e.target.value)}
                placeholder="https://example.com/proxy.php"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExternalProxyDialog(false)}>
              Annuler
            </Button>
            <Button onClick={saveExternalProxyUrl}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddCustomSourceDialog} onOpenChange={setShowAddCustomSourceDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle>Ajouter une Source Proxy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom</Label>
              <Input
                value={newCustomSource.name}
                onChange={(e) => setNewCustomSource({ ...newCustomSource, name: e.target.value })}
                placeholder="Ex: Mon Proxy VPS"
                className="bg-slate-700 border-slate-600"
              />
            </div>
            <div>
              <Label>URL du Proxy</Label>
              <Input
                value={newCustomSource.proxy_url}
                onChange={(e) => setNewCustomSource({ ...newCustomSource, proxy_url: e.target.value })}
                placeholder="https://votre-vps.com/proxy.php?url="
                className="bg-slate-700 border-slate-600 font-mono text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">L'URL du stream sera ajoutée automatiquement à la fin</p>
            </div>
            <div>
              <Label>Description (optionnel)</Label>
              <Input
                value={newCustomSource.description}
                onChange={(e) => setNewCustomSource({ ...newCustomSource, description: e.target.value })}
                placeholder="Description de la source..."
                className="bg-slate-700 border-slate-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCustomSourceDialog(false)}>
              Annuler
            </Button>
            <Button onClick={addCustomSource} className="bg-purple-600 hover:bg-purple-700">
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCustomSource} onOpenChange={() => setEditingCustomSource(null)}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle>Modifier la Source</DialogTitle>
          </DialogHeader>
          {editingCustomSource && (
            <div className="space-y-4">
              <div>
                <Label>Nom</Label>
                <Input
                  value={editingCustomSource.name}
                  onChange={(e) => setEditingCustomSource({ ...editingCustomSource, name: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div>
                <Label>URL du Proxy</Label>
                <Input
                  value={editingCustomSource.proxy_url}
                  onChange={(e) => setEditingCustomSource({ ...editingCustomSource, proxy_url: e.target.value })}
                  className="bg-slate-700 border-slate-600 font-mono text-sm"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={editingCustomSource.description}
                  onChange={(e) => setEditingCustomSource({ ...editingCustomSource, description: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCustomSource(null)}>
              Annuler
            </Button>
            <Button onClick={updateCustomSource} className="bg-purple-600 hover:bg-purple-700">
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ko-fi Transactions */}
      <Card className="mb-6 glass-card border border-border/50 overflow-hidden">
        <div
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/5 transition-colors border-b border-border/50"
          onClick={() => toggleCollapse("kofiTransactions")}
        >
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-foreground">Transactions Ko-fi</h2>
          </div>
          {collapsed.kofiTransactions ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </div>

        {!collapsed.kofiTransactions && (
          <div className="p-4">
            <KofiTransactions />
          </div>
        )}
      </Card>

      {/* ... existing code (rest of dialogs) ... */}
    </div>
  )
}
