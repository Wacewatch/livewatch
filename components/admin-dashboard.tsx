"use client"

import { useEffect, useState, useRef } from "react"
import {
  Users,
  LaptopMinimal as TvMinimal,
  Shield,
  Crown,
  UserCircle,
  Activity,
  TrendingUp,
  Key,
  Copy,
  Home,
  Globe,
  RefreshCw,
  Trash2,
  Network,
  ChevronDown,
  ChevronUp,
  Loader2,
  Radio,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

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
    usagePercent: number
    used: string
    total: string
  }
  network?: {
    activeConnections: number
    requestsPerMinute: number
    bandwidthEstimate: string
    source1?: number // Added for the update
    source2?: number // Added for the update
    source3?: number // Added for the update
    total?: number // Added for the update
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
  channel_count?: number // Added for the update
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
  country?: string // Added for the update
}

// Added for the update
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
}

interface CollapsibleState {
  countries: boolean
  proxyRotator: boolean
  users: boolean
  vipKeys: boolean
  // Add sources to CollapsibleState
  sources: boolean
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [proxyConfig, setProxyConfig] = useState<ProxyConfig | null>(null)
  const [proxySources, setProxySources] = useState<ProxySource[]>([]) // Added for the update
  const [showAddProxySourceDialog, setShowAddProxySourceDialog] = useState(false) // Added for the update
  const [newProxySource, setNewProxySource] = useState({ name: "", git_url: "", sync_interval_minutes: 30 }) // Added for the update
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
  const [serverStats, setServerStats] = useState<ServerStats | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
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

  const [collapsed, setCollapsed] = useState<CollapsibleState>({
    countries: false,
    proxyRotator: false,
    users: false,
    vipKeys: false,
    // Initialize sources collapsed state
    sources: false,
  })
  const [proxyListLimit, setProxyListLimit] = useState(10)
  const [proxySort, setProxySort] = useState<"speed" | "success" | "country">("speed")

  const [pageLoading, setPageLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0) // Added for the update
  const [loadingModules, setLoadingModules] = useState({
    // Added for the update
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

  useEffect(() => {
    setPageLoading(false)

    if (!statsLoadedRef.current) {
      statsLoadedRef.current = true
      fetchInitialData()
    }

    const interval = setInterval(() => {
      fetchServerStats()
    }, 10000)

    return () => clearInterval(interval)
  }, [])

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
      const [keysRes, sourceConfigRes] = await Promise.all([
        fetch("/api/admin/vip-keys"),
        fetch("/api/admin/source-config"),
      ])
      if (keysRes.ok) {
        const keysData = await keysRes.json()
        setVipKeys(keysData.keys || [])
      }
      if (sourceConfigRes.ok) {
        const configData = await sourceConfigRes.json()
        setSourceConfig(configData)
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

      setStatsLoaded(true)
    } catch (error) {
      console.error("[v0] Failed to fetch initial data:", error)
      setLoadingProgress(100) // Ensure progress reaches 100% even on error
    }
  }

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

  const fetchServerStats = async () => {
    try {
      const res = await fetch("/api/admin/server-stats")
      if (res.ok) {
        const data = await res.json()
        setServerStats(data)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch server stats:", error)
    }
  }

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch("/api/admin/sync-catalog")
      if (res.ok) {
        const data = await res.json()
        setSyncStatus(data)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch sync status:", error)
    }
  }

  // REMOVED syncCatalogNow function since we're removing the Synchronisation du Catalogue module

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
      // Revert on error
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

  const updateProxyConfig = async () => {
    try {
      await fetch("/api/admin/proxy-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_config",
          ...editProxyConfig,
        }),
      })
      setShowProxyConfigDialog(false)
      fetchDashboardData()
    } catch (error) {
      console.error("[v0] Failed to update proxy config:", error)
    }
  }

  // Added for the update
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

  // Added for the update
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

  // Added for the update
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

  const openEditDialog = (channel: Channel) => {
    setEditingChannel(channel)
    setEditForm({
      name: channel.name || "",
      category: channel.category || "",
      language: channel.language || "",
      logo: channel.logo || "",
      background: channel.background || "",
    })
  }

  const saveChannelEdit = async () => {
    if (!editingChannel) return

    try {
      await fetch("/api/admin/channels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingChannel.id,
          ...editForm,
        }),
      })
      setEditingChannel(null)
      fetchDashboardData()
    } catch (error) {
      console.error("[v0] Failed to update channel:", error)
    }
  }

  const toggleChannelSelection = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId],
    )
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
        fetchDashboardData()
      }
    } catch (error) {
      console.error("[v0] Failed to generate VIP key:", error)
    }
  }

  const copyKeyToClipboard = () => {
    navigator.clipboard.writeText(newGeneratedKey)
    alert("Clé copiée dans le presse-papiers !")
  }

  const saveNewChannel = async () => {
    if (!createForm.name) {
      alert("Le nom de la chaîne est requis")
      return
    }

    try {
      const response = await fetch("/api/admin/channels/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          mergeIds: createMode === "merge" ? selectedChannels : [],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`Échec de la création de la chaîne: ${data.error || JSON.stringify(data)}`)
        return
      }

      setShowCreateDialog(false)
      setSelectedChannels([])
      setIsMergeMode(false)
      setCreateForm({
        name: "",
        category: "",
        language: "FR",
        logo: "",
        background: "",
        sources: [],
      })

      await fetchDashboardData()
      alert("Chaîne créée avec succès !")
    } catch (error) {
      console.error("[v0] Failed to create channel:", error)
      alert(`Échec de la création de la chaîne: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
    }
  }

  const openCreateDialog = (mode: "create" | "merge") => {
    setCreateMode(mode)
    if (mode === "merge" && selectedChannels.length > 0) {
      const primaryChannel = channels.find((ch) => ch.id === selectedChannels[0])
      if (primaryChannel) {
        setCreateForm({
          name: primaryChannel.name,
          category: primaryChannel.category || "",
          language: primaryChannel.language || "FR",
          logo: primaryChannel.logo || "",
          background: primaryChannel.background || "",
          sources: [],
        })
      }
    } else {
      setCreateForm({
        name: "",
        category: "",
        language: "FR",
        logo: "",
        background: "",
        sources: [],
      })
    }
    setShowCreateDialog(true)
  }

  const filteredUsers = users.filter((user) => user.email.toLowerCase().includes(userSearch.toLowerCase()))
  const filteredChannels = channels.filter((channel) =>
    channel.name.toLowerCase().includes(channelSearch.toLowerCase()),
  )

  // Added function for synchronisation du catalogue
  const syncCatalogNow = async () => {
    try {
      const res = await fetch("/api/admin/sync-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_now" }),
      })

      const data = await res.json()
      if (data.success) {
        alert("Synchronisation du catalogue lancée avec succès !")
        fetchSyncStatus() // Update sync status immediately
      } else {
        alert(`Échec du lancement de la synchronisation: ${data.error || "Erreur inconnue"}`)
      }
    } catch (error) {
      console.error("[v0] Failed to sync catalog:", error)
      alert("Échec de la synchronisation")
    }
  }

  const sortedProxies = [...proxies].sort((a, b) => {
    if (proxySort === "speed") return (a.speed_ms || 9999) - (b.speed_ms || 9999)
    if (proxySort === "success") return (b.success_rate || 0) - (a.success_rate || 0)
    if (proxySort === "country") return (a.country || "ZZ").localeCompare(b.country || "ZZ")
    return 0
  })

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-cyan-500" />
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {loadingProgress < 100 && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="h-1 bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="absolute top-2 right-4 text-xs text-muted-foreground bg-slate-900/80 px-2 py-1 rounded">
            Chargement... {Math.round(loadingProgress)}%
          </div>
        </div>
      )}

      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Administration</h1>
              <p className="text-sm md:text-base text-muted-foreground">Tableau de bord Admin</p>
            </div>
            <Button onClick={() => (window.location.href = "/")} variant="outline" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Retour au site
            </Button>
          </div>
        </div>

        {/* Server Monitoring - show loading indicator if data not ready */}
        <div className="mb-6 grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {/* CPU Card */}
          <Card className="border-l-4 border-l-blue-500 p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              CPU App
            </h3>
            {serverStats ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Usage:</span>
                  <span className="font-bold">{serverStats.cpu.usage}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${serverStats.cpu.usage}%` }} />
                </div>
                <div className="text-xs text-muted-foreground">{serverStats.cpu.model}</div>
              </div>
            ) : (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-2 bg-muted rounded"></div>
              </div>
            )}
          </Card>

          {/* RAM Card */}
          <Card className="border-l-4 border-l-fuchsia-500 p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-fuchsia-500" />
              RAM App
            </h3>
            {serverStats ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Usage:</span>
                  <span className="font-bold">{serverStats.memory.usagePercent}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-fuchsia-500 transition-all"
                    style={{ width: `${serverStats.memory.usagePercent}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {serverStats.memory.used} / {serverStats.memory.total}
                </div>
              </div>
            ) : (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-2 bg-muted rounded"></div>
              </div>
            )}
          </Card>

          {/* Network Card - Show stats by source */}
          <Card className="border-l-4 border-l-emerald-500 p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Réseau
            </h3>
            {serverStats?.network ? (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground mb-2">Par Source:</div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="bg-cyan-500/20 rounded p-1">
                    <div className="text-xs text-cyan-400">S1</div>
                    <div className="font-bold text-sm">{serverStats.network.source1 || 0}</div>
                  </div>
                  <div className="bg-orange-500/20 rounded p-1">
                    <div className="text-xs text-orange-400">S2</div>
                    <div className="font-bold text-sm">{serverStats.network.source2 || 0}</div>
                  </div>
                  <div className="bg-purple-500/20 rounded p-1">
                    <div className="text-xs text-purple-400">S3</div>
                    <div className="font-bold text-sm">{serverStats.network.source3 || 0}</div>
                  </div>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-border/50">
                  <span className="text-muted-foreground">Total:</span>
                  <span>{serverStats.network.total || serverStats.network.activeConnections}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Req/min:</span>
                  <span>{serverStats.network.requestsPerMinute}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Bande:</span>
                  <span>{serverStats.network.bandwidthEstimate}</span>
                </div>
              </div>
            ) : (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            )}
          </Card>

          {/* System Card */}
          <Card className="border-l-4 border-l-amber-500 p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              Système
            </h3>
            {serverStats ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uptime:</span>
                  <span className="font-bold">{serverStats.system.uptime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform:</span>
                  <span>{serverStats.system.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Node:</span>
                  <span>{serverStats.system.nodeVersion}</span>
                </div>
              </div>
            ) : (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            )}
          </Card>
        </div>

        {/* REMOVED "Synchronisation du Catalogue" section */}

        {/* Stats Cards - Show values immediately, no loading spinner loop */}
        <div className="mb-6 grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
          <Card className="border-l-4 border-l-cyan-500 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilisateurs</p>
                <p className="text-2xl md:text-3xl font-bold">{stats?.totalUsers ?? "-"}</p>
              </div>
              <Users className="h-8 w-8 text-cyan-500 opacity-50" />
            </div>
          </Card>

          <Card className="border-l-4 border-l-blue-500 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chaînes</p>
                <p className="text-2xl md:text-3xl font-bold">{stats?.totalChannels ?? "-"}</p>
                <p className="text-xs text-muted-foreground">Tous pays confondus</p>
              </div>
              <TvMinimal className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </Card>

          <Card className="border-l-4 border-l-orange-500 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">VIP</p>
                <p className="text-2xl md:text-3xl font-bold">{stats?.vipUsers ?? "-"}</p>
              </div>
              <Crown className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </Card>

          <Card className="border-l-4 border-l-red-500 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl md:text-3xl font-bold">{stats?.adminUsers ?? "-"}</p>
              </div>
              <Shield className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Online Stats and Live Viewers */}
        {/* Reorganized to use grid-cols-3 and added Top Channels */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {/* En ligne */}
          <Card className="border-l-4 border-l-cyan-500 p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
              <h3 className="font-bold">En ligne</h3>
            </div>
            <div className="text-4xl font-bold text-cyan-400">{stats?.onlineUsers ?? 0}</div>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Membres:</span>
                <span>{stats?.membersOnline ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Invités:</span>
                <span>{stats?.guestsOnline ?? 0}</span>
              </div>
            </div>
          </Card>

          {/* En visionnage */}
          <Card className="border-l-4 border-l-pink-500 p-4">
            <div className="flex items-center gap-2 mb-4">
              <TvMinimal className="h-5 w-5 text-pink-400" />
              <h3 className="font-bold">En visionnage</h3>
            </div>
            <div className="text-4xl font-bold text-pink-400">{stats?.liveViewers ?? 0}</div>
            <p className="text-sm text-muted-foreground">regardent maintenant</p>
          </Card>

          {/* Top Chaînes */}
          <Card className="p-4 max-h-64 overflow-y-auto">
            <h3 className="font-bold mb-3">Top Chaînes en Direct</h3>
            <div className="space-y-2">
              {stats?.topChannels?.slice(0, 5).map((channel, index) => (
                <div key={channel.channel_id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">#{index + 1}</span>
                    <span className="truncate max-w-32">{channel.channel_name}</span>
                  </span>
                  <span className="text-cyan-400 flex items-center gap-1">
                    {channel.view_count}
                    <TrendingUp className="h-3 w-3" />
                  </span>
                </div>
              ))}
              {(!stats?.topChannels || stats.topChannels.length === 0) && (
                <p className="text-sm text-muted-foreground">Aucune donnée</p>
              )}
            </div>
          </Card>
        </div>

        <Card className="mb-6 overflow-hidden">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
            onClick={() => toggleCollapse("sources" as any)}
          >
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-purple-500" />
              <h2 className="text-lg font-bold">Gestion des Sources</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {
                  [sourceConfig.source1_enabled, sourceConfig.source2_enabled, sourceConfig.source3_enabled].filter(
                    Boolean,
                  ).length
                }{" "}
                activées sur 3
              </span>
              {collapsed["sources" as keyof CollapsibleState] ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronUp className="h-5 w-5" />
              )}
            </div>
          </div>

          {!collapsed["sources" as keyof CollapsibleState] && (
            <div className="p-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <h4 className="font-medium">Source 1</h4>
                    <p className="text-xs text-muted-foreground">Proxy par défaut</p>
                  </div>
                  <Switch
                    checked={sourceConfig.source1_enabled}
                    onCheckedChange={(checked) => toggleSource(1, checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <h4 className="font-medium">Source 2</h4>
                    <p className="text-xs text-muted-foreground">Worker externe</p>
                  </div>
                  <Switch
                    checked={sourceConfig.source2_enabled}
                    onCheckedChange={(checked) => toggleSource(2, checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <h4 className="font-medium">Source 3</h4>
                    <p className="text-xs text-muted-foreground">Proxy rotatif</p>
                  </div>
                  <Switch
                    checked={sourceConfig.source3_enabled}
                    onCheckedChange={(checked) => toggleSource(3, checked)}
                  />
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="mb-6 p-4 md:p-6 border-l-4 border-l-blue-500">
          <div
            className="flex items-center justify-between mb-4 cursor-pointer"
            onClick={() => toggleCollapse("countries")}
          >
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              Gestion des Pays
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs md:text-sm">
                {countries.filter((c) => c.enabled).length} activés sur {countries.length}
              </Badge>
              {collapsed.countries ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            </div>
          </div>

          {!collapsed.countries && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {/* Changed to display all 17 countries */}
              {countries.map((country) => (
                <div
                  key={country.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{country.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {country.channel_count !== undefined ? `${country.channel_count} chaînes` : "Chargement..."}
                    </div>
                  </div>
                  <Switch
                    checked={country.enabled}
                    onCheckedChange={(enabled) => {
                      toggleCountry(country.id, enabled)
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="mb-6 p-4 md:p-6 border-l-4 border-l-purple-500">
          <div
            className="flex items-center justify-between mb-4 cursor-pointer"
            onClick={() => toggleCollapse("proxyRotator")}
          >
            <div>
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                <Network className="h-5 w-5 text-purple-500" />
                Système de Proxy Rotatif
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Gestion des sources Git pour le chargement automatique de proxies
              </p>
            </div>
            <div className="flex items-center gap-2">
              {collapsed.proxyRotator ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            </div>
          </div>

          {!collapsed.proxyRotator && (
            <>
              <div className="flex gap-2 mb-4 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => setShowAddProxySourceDialog(true)}>
                  Ajouter Source
                </Button>
                <Button size="sm" onClick={syncProxies} className="bg-purple-500 hover:bg-purple-600">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Synchroniser
                </Button>
              </div>

              <div className="space-y-3 mb-4">
                {proxySources.map((source) => (
                  <div key={source.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{source.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 break-all">{source.git_url}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Synchro: {source.sync_interval_minutes}min
                        {source.last_sync && ` • Dernière: ${new Date(source.last_sync).toLocaleString()}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={source.enabled}
                        onCheckedChange={(enabled) => toggleProxySource(source.id, enabled)}
                      />
                      <Button size="sm" variant="ghost" onClick={() => deleteProxySource(source.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="text-xs text-muted-foreground">Total Proxies</div>
                  <div className="text-xl font-bold text-purple-400">{proxyStats.totalProxies}</div>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="text-xs text-muted-foreground">Actifs</div>
                  <div className="text-xl font-bold text-green-400">{proxyStats.activeProxies}</div>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="text-xs text-muted-foreground">Sources</div>
                  <div className="text-xl font-bold text-blue-400">{proxySources.length}</div>
                </div>
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <div className="text-xs text-muted-foreground">Sources Actives</div>
                  <div className="text-xl font-bold text-cyan-400">{proxySources.filter((s) => s.enabled).length}</div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-2">
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
                <Button size="sm" variant="destructive" onClick={deleteInactiveProxies}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer inactifs
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Proxy</th>
                      <th className="text-left p-2">Pays</th>
                      <th className="text-left p-2">Vitesse</th>
                      <th className="text-left p-2">Succès</th>
                      <th className="text-left p-2">Actif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProxies.slice(0, proxyListLimit).map((proxy) => (
                      <tr key={proxy.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-mono text-xs">{proxy.proxy_url}</td>
                        <td className="p-2">{proxy.country || "?"}</td>
                        <td className="p-2">{proxy.speed_ms ? `${proxy.speed_ms}ms` : "-"}</td>
                        <td className="p-2">{proxy.success_rate ? `${proxy.success_rate}%` : "-"}</td>
                        <td className="p-2">
                          <Badge variant={proxy.is_active ? "default" : "secondary"}>
                            {proxy.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {sortedProxies.length > proxyListLimit && (
                <div className="mt-3 text-center">
                  <Button size="sm" variant="outline" onClick={() => setProxyListLimit((prev) => prev + 10)}>
                    Afficher plus ({sortedProxies.length - proxyListLimit} restants)
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>

        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2 mb-6">
          {/* User Management */}
          <Card className="p-6">
            <div
              className="mb-4 flex items-center justify-between cursor-pointer"
              onClick={() => toggleCollapse("users")}
            >
              <h2 className="text-xl font-bold">Gestion des Utilisateurs</h2>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{filteredUsers.length} utilisateurs</Badge>
                {collapsed.users ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
              </div>
            </div>

            {!collapsed.users && (
              <>
                <Input
                  placeholder="Rechercher un utilisateur..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="mb-4"
                />

                <div className="max-h-[400px] space-y-3 overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-purple-500">
                          <UserCircle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
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
              </>
            )}
          </Card>

          {/* VIP Keys Management */}
          <Card className="p-6">
            <div
              className="mb-4 flex items-center justify-between cursor-pointer"
              onClick={() => toggleCollapse("vipKeys")}
            >
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Key className="h-5 w-5 text-amber-500" />
                Gestion des Clés VIP
              </h2>
              <div className="flex items-center gap-2">
                {collapsed.vipKeys ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
              </div>
            </div>

            {!collapsed.vipKeys && (
              <>
                <Button onClick={generateVipKey} className="bg-amber-500 hover:bg-amber-600 mb-4">
                  <Key className="mr-2 h-4 w-4" />
                  Générer une Clé
                </Button>

                <div className="max-h-[400px] space-y-3 overflow-y-auto">
                  {vipKeys.map((key) => (
                    <div
                      key={key.id}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        key.used ? "bg-muted/50" : "bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Key className={`h-5 w-5 ${key.used ? "text-muted-foreground" : "text-amber-500"}`} />
                        <div>
                          <p className="font-mono text-sm font-medium">{key.key}</p>
                          <p className="text-xs text-muted-foreground">
                            {key.used
                              ? `Utilisée le ${new Date(key.used_at!).toLocaleDateString()}`
                              : `Créée le ${new Date(key.created_at).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <Badge variant={key.used ? "secondary" : "default"}>{key.used ? "Utilisée" : "Disponible"}</Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Dialog: Create/Merge Channel */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {createMode === "merge" ? "Fusionner des chaînes" : "Créer une nouvelle chaîne"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {createMode === "merge" && (
                <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500">
                  <p className="text-sm font-medium mb-2">Chaînes à fusionner ({selectedChannels.length}):</p>
                  <div className="text-xs text-muted-foreground">
                    {selectedChannels.map((id) => channels.find((ch) => ch.id === id)?.name).join(", ")}
                  </div>
                </div>
              )}

              <div className="grid gap-4">
                <div>
                  <Label>Nom de la chaîne *</Label>
                  <Input
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Ex: EUROSPORT 1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Catégorie</Label>
                    <Input
                      value={createForm.category}
                      onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                      placeholder="Ex: Sport"
                    />
                  </div>
                  <div>
                    <Label>Langue</Label>
                    <Input
                      value={createForm.language}
                      onChange={(e) => setCreateForm({ ...createForm, language: e.target.value })}
                      placeholder="Ex: FR"
                    />
                  </div>
                </div>

                <div>
                  <Label>URL du logo</Label>
                  <Input
                    value={createForm.logo}
                    onChange={(e) => setCreateForm({ ...createForm, logo: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <Label>URL du fond</Label>
                  <Input
                    value={createForm.background}
                    onChange={(e) => setCreateForm({ ...createForm, background: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
              <Button onClick={saveNewChannel} className="bg-green-500 hover:bg-green-600">
                {createMode === "merge" ? "Fusionner" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Edit Channel */}
        <Dialog open={!!editingChannel} onOpenChange={() => setEditingChannel(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifier la chaîne</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom de la chaîne</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Nom de la chaîne"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Catégorie</Label>
                  <Input
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    placeholder="Sport, News, Entertainment..."
                  />
                </div>
                <div>
                  <Label>Langue</Label>
                  <Input
                    value={editForm.language}
                    onChange={(e) => setEditForm({ ...editForm, language: e.target.value })}
                    placeholder="FR, EN, ES..."
                  />
                </div>
              </div>
              <div>
                <Label>URL du logo</Label>
                <Input
                  value={editForm.logo}
                  onChange={(e) => setEditForm({ ...editForm, logo: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div>
                <Label>URL du fond</Label>
                <Input
                  value={editForm.background}
                  onChange={(e) => setEditForm({ ...editForm, background: e.target.value })}
                  placeholder="https://example.com/background.jpg"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingChannel(null)}>
                Annuler
              </Button>
              <Button onClick={saveChannelEdit} className="bg-cyan-500 hover:bg-cyan-600">
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: VIP Key Generated */}
        <Dialog open={showVipKeyDialog} onOpenChange={setShowVipKeyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-amber-500" />
                Nouvelle Clé VIP Générée
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Cette clé peut être utilisée une seule fois pour activer le statut VIP (5€ à vie).
              </p>
              <div className="flex items-center gap-2">
                <Input value={newGeneratedKey} readOnly className="font-mono" />
                <Button onClick={copyKeyToClipboard} size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowVipKeyDialog(false)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Proxy Config */}
        <Dialog open={showProxyConfigDialog} onOpenChange={setShowProxyConfigDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configuration Proxy Rotatif</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>URL Git (liste de proxies publics)</Label>
                <Input
                  value={editProxyConfig.git_url}
                  onChange={(e) => setEditProxyConfig({ ...editProxyConfig, git_url: e.target.value })}
                  placeholder="https://raw.githubusercontent.com/.../proxies.txt"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Intervalle MAJ (minutes)</Label>
                  <Input
                    type="number"
                    value={editProxyConfig.update_interval_minutes}
                    onChange={(e) =>
                      setEditProxyConfig({
                        ...editProxyConfig,
                        update_interval_minutes: Number.parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Taux de succès min (%)</Label>
                  <Input
                    type="number"
                    value={editProxyConfig.min_success_rate}
                    onChange={(e) =>
                      setEditProxyConfig({ ...editProxyConfig, min_success_rate: Number.parseFloat(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Temps de réponse max (ms)</Label>
                <Input
                  type="number"
                  value={editProxyConfig.max_response_time_ms}
                  onChange={(e) =>
                    setEditProxyConfig({ ...editProxyConfig, max_response_time_ms: Number.parseInt(e.target.value) })
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editProxyConfig.auto_update_enabled}
                  onCheckedChange={(checked) =>
                    setEditProxyConfig({ ...editProxyConfig, auto_update_enabled: checked })
                  }
                />
                <Label>Mise à jour automatique</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowProxyConfigDialog(false)}>
                Annuler
              </Button>
              <Button onClick={updateProxyConfig} className="bg-cyan-500 hover:bg-cyan-600">
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Proxy Source Dialog */}
        <Dialog open={showAddProxySourceDialog} onOpenChange={setShowAddProxySourceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une source de proxies</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="source-name">Nom</Label>
                <Input
                  id="source-name"
                  value={newProxySource.name}
                  onChange={(e) => setNewProxySource({ ...newProxySource, name: e.target.value })}
                  placeholder="Free Proxy List"
                />
              </div>
              <div>
                <Label htmlFor="source-url">URL Git</Label>
                <Input
                  id="source-url"
                  value={newProxySource.git_url}
                  onChange={(e) => setNewProxySource({ ...newProxySource, git_url: e.target.value })}
                  placeholder="https://raw.githubusercontent.com/.../proxy-list.txt"
                />
              </div>
              <div>
                <Label htmlFor="source-interval">Intervalle de synchro (minutes)</Label>
                <Input
                  id="source-interval"
                  type="number"
                  value={newProxySource.sync_interval_minutes}
                  onChange={(e) =>
                    setNewProxySource({ ...newProxySource, sync_interval_minutes: Number.parseInt(e.target.value) })
                  }
                  min="10"
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
      </div>
    </div>
  )
}
