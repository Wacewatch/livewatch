"use client"

import { useEffect, useState } from "react"
import {
  Users,
  LaptopMinimal as TvMinimal,
  Star,
  Shield,
  Crown,
  UserCircle,
  Activity,
  TrendingUp,
  Edit,
  Merge,
  Key,
  Copy,
  Home,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

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
  }
  system: {
    uptime: string
    platform: string
    nodeVersion?: string
  }
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
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

  useEffect(() => {
    fetchDashboardData()
    fetchServerStats()
    fetchSyncStatus()

    const interval = setInterval(() => {
      fetchDashboardData()
      fetchServerStats()
      fetchSyncStatus()
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsRes, usersRes, channelsRes, keysRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/users"),
        fetch("/api/admin/channels"),
        fetch("/api/admin/vip-keys"),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users || [])
      }

      if (channelsRes.ok) {
        const channelsData = await channelsRes.json()
        setChannels(channelsData.channels || [])
      }

      if (keysRes.ok) {
        const keysData = await keysRes.json()
        setVipKeys(keysData.keys || [])
      }
    } catch (error) {
      console.error("[v0] Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
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

  const syncCatalogNow = async () => {
    try {
      const res = await fetch("/api/admin/sync-catalog", { method: "POST" })
      if (res.ok) {
        alert("Synchronisation terminée avec succès !")
        fetchSyncStatus()
        fetchDashboardData()
      }
    } catch (error) {
      console.error("[v0] Failed to sync catalog:", error)
      alert("Échec de la synchronisation")
    }
  }

  const toggleChannel = async (channelId: string, enabled: boolean) => {
    try {
      console.log("[v0] Toggling channel:", channelId, "to", enabled)
      const response = await fetch("/api/admin/channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: channelId, enabled }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("[v0] Failed to toggle channel:", data)
        alert(`Échec de la mise à jour de la chaîne: ${data.error || "Erreur inconnue"}`)
        return
      }

      console.log("[v0] Channel toggled successfully")
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

  const deleteChannel = async (channelId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette chaîne ?")) return

    try {
      await fetch(`/api/admin/channels?id=${channelId}`, {
        method: "DELETE",
      })
      fetchDashboardData()
    } catch (error) {
      console.error("[v0] Failed to delete channel:", error)
    }
  }

  const toggleChannelSelection = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId],
    )
  }

  const mergeChannels = async () => {
    if (selectedChannels.length < 2) {
      alert("Sélectionnez au moins 2 chaînes à fusionner")
      return
    }

    const primaryChannel = channels.find((ch) => ch.id === selectedChannels[0])
    if (!primaryChannel) return

    try {
      await fetch("/api/admin/channels/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryId: selectedChannels[0],
          mergeIds: selectedChannels.slice(1),
        }),
      })
      setIsMergeMode(false)
      setSelectedChannels([])
      fetchDashboardData()
    } catch (error) {
      console.error("[v0] Failed to merge channels:", error)
    }
  }

  const bulkToggleChannels = async (enabled: boolean) => {
    if (selectedChannels.length === 0) return

    try {
      await fetch("/api/admin/channels/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedChannels,
          enabled,
        }),
      })
      setSelectedChannels([])
      fetchDashboardData()
    } catch (error) {
      console.error("[v0] Failed to bulk update channels:", error)
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
      console.log("[v0] Creating channel with data:", {
        ...createForm,
        mergeIds: createMode === "merge" ? selectedChannels : [],
      })

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
        console.error("[v0] Failed to create channel:", data)
        alert(`Échec de la création de la chaîne: ${data.error || JSON.stringify(data)}`)
        return
      }

      console.log("[v0] Channel created successfully:", data)

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Activity className="mx-auto h-12 w-12 animate-pulse text-cyan-500" />
          <p className="mt-4 text-muted-foreground">Chargement du tableau de bord...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
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

      {/* Server Monitoring Section */}
      {serverStats && (
        <div className="mb-6 grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500 p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              CPU App
            </h3>
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
          </Card>

          <Card className="border-l-4 border-l-purple-500 p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              RAM App
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Usage:</span>
                <span className="font-bold">{serverStats.memory.usagePercent}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all"
                  style={{ width: `${serverStats.memory.usagePercent}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {serverStats.memory.used} / {serverStats.memory.total}
              </div>
            </div>
          </Card>

          {serverStats.network && (
            <Card className="border-l-4 border-l-cyan-500 p-4">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-500" />
                Réseau
              </h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connexions:</span>
                  <span className="font-medium">{serverStats.network.activeConnections}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Req/min:</span>
                  <span className="font-medium">{serverStats.network.requestsPerMinute}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bande:</span>
                  <span className="font-medium text-xs">{serverStats.network.bandwidthEstimate}</span>
                </div>
              </div>
            </Card>
          )}

          <Card className="border-l-4 border-l-green-500 p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Système
            </h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uptime:</span>
                <span className="font-medium">{serverStats.system.uptime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform:</span>
                <span className="font-medium">{serverStats.system.platform}</span>
              </div>
              {serverStats.system.nodeVersion && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Node:</span>
                  <span className="font-medium text-xs">{serverStats.system.nodeVersion}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Catalog Sync Status */}
      {syncStatus && (
        <Card className="mb-6 p-4 border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold mb-1">Synchronisation du Catalogue</h3>
              <div className="text-sm text-muted-foreground">
                {syncStatus.cached_channels} chaînes en cache
                {syncStatus.last_sync && (
                  <span className="ml-2">
                    • Dernière synchro: {new Date(syncStatus.last_sync.started_at).toLocaleString()}
                    {syncStatus.last_sync.status === "success" && <span className="text-green-500 ml-1">✓</span>}
                  </span>
                )}
              </div>
            </div>
            <Button onClick={syncCatalogNow} size="sm" className="bg-cyan-500 hover:bg-cyan-600">
              <TrendingUp className="mr-2 h-4 w-4" />
              Synchroniser maintenant
            </Button>
          </div>
        </Card>
      )}

      <div className="mb-6 md:mb-8 grid gap-3 md:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-500/10 to-transparent p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Utilisateurs</p>
              <p className="text-xl md:text-2xl font-bold">{stats?.totalUsers || 0}</p>
            </div>
            <Users className="h-6 w-6 md:h-8 md:w-8 text-purple-500" />
          </div>
        </Card>

        <Card className="border-l-4 border-l-cyan-500 bg-gradient-to-br from-cyan-500/10 to-transparent p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Chaînes</p>
              <p className="text-xl md:text-2xl font-bold">{stats?.totalChannels || 0}</p>
            </div>
            <TvMinimal className="h-6 w-6 md:h-8 md:w-8 text-cyan-500" />
          </div>
        </Card>

        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-500/10 to-transparent p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Actives</p>
              <p className="text-xl md:text-2xl font-bold">{stats?.enabledChannels || 0}</p>
            </div>
            <Activity className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
          </div>
        </Card>

        <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-500/10 to-transparent p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">VIP</p>
              <p className="text-xl md:text-2xl font-bold">{stats?.vipUsers || 0}</p>
            </div>
            <Crown className="h-6 w-6 md:h-8 md:w-8 text-orange-500" />
          </div>
        </Card>

        <Card className="border-l-4 border-l-red-500 bg-gradient-to-br from-red-500/10 to-transparent p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Admins</p>
              <p className="text-xl md:text-2xl font-bold">{stats?.adminUsers || 0}</p>
            </div>
            <Shield className="h-6 w-6 md:h-8 md:w-8 text-red-500" />
          </div>
        </Card>

        <Card className="border-l-4 border-l-yellow-500 bg-gradient-to-br from-yellow-500/10 to-transparent p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Favoris</p>
              <p className="text-xl md:text-2xl font-bold">{stats?.totalFavorites || 0}</p>
            </div>
            <Star className="h-6 w-6 md:h-8 md:w-8 text-yellow-500" />
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-500/10 to-transparent p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold">En ligne</h3>
            <Activity className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold mb-2">{stats?.onlineUsers || 0}</p>
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Membres:</span>
              <span className="font-medium">{stats?.membersOnline || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Invités:</span>
              <span className="font-medium">{stats?.guestsOnline || 0}</span>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-pink-500 bg-gradient-to-br from-pink-500/10 to-transparent p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">En visionnage</p>
              <p className="text-xl md:text-2xl font-bold">{stats?.liveViewers || 0}</p>
              <p className="text-xs text-muted-foreground">regardent maintenant</p>
            </div>
            <TvMinimal className="h-6 w-6 md:h-8 md:w-8 text-pink-500 animate-pulse" />
          </div>
        </Card>

        <Card className="col-span-1 md:col-span-2 p-3 md:p-4">
          <h3 className="text-sm md:text-base font-bold mb-3">Top Chaînes en Direct</h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {stats?.currentlyWatching && stats.currentlyWatching.length > 0 ? (
              stats.currentlyWatching.map((channel, index) => (
                <div key={channel.channel_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>
                    <span className="text-sm font-medium truncate">{channel.channel_name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {channel.viewer_count} <Activity className="ml-1 h-3 w-3 inline" />
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun visionnage en cours</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* User Management */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Gestion des Utilisateurs</h2>
            <Badge variant="secondary">{filteredUsers.length} utilisateurs</Badge>
          </div>

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
                    <p className="text-xs text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</p>
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
        </Card>

        {/* Channel Management */}
        <Card className="lg:col-span-2 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <h2 className="text-lg md:text-xl font-bold">Gestion des Chaînes</h2>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => openCreateDialog("create")} size="sm" className="bg-green-500 hover:bg-green-600">
                Créer une chaîne
              </Button>
              {isMergeMode ? (
                <>
                  <Button
                    onClick={() => openCreateDialog("merge")}
                    size="sm"
                    variant="outline"
                    disabled={selectedChannels.length < 2}
                  >
                    <Merge className="mr-2 h-4 w-4" />
                    Fusionner ({selectedChannels.length})
                  </Button>
                  <Button onClick={() => setIsMergeMode(false)} size="sm" variant="ghost">
                    Annuler
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsMergeMode(true)} size="sm" variant="outline">
                  Mode Fusion
                </Button>
              )}
              <Button onClick={syncCatalogNow} size="sm" className="bg-cyan-500 hover:bg-cyan-600">
                Synchroniser
              </Button>
            </div>
          </div>

          <Input
            placeholder="Rechercher une chaîne..."
            value={channelSearch}
            onChange={(e) => setChannelSearch(e.target.value)}
            className="mb-4"
          />

          <div className="max-h-[600px] overflow-y-auto space-y-2">
            {filteredChannels.map((channel) => (
              <div
                key={channel.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  selectedChannels.includes(channel.id) ? "bg-purple-500/20 border-purple-500" : "bg-card"
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  {isMergeMode && (
                    <Checkbox
                      checked={selectedChannels.includes(channel.id)}
                      onCheckedChange={() => toggleChannelSelection(channel.id)}
                    />
                  )}
                  <TvMinimal className="h-5 w-5 text-cyan-500" />
                  <div className="flex-1">
                    <div className="font-medium">{channel.name}</div>
                    <div className="text-xs text-muted-foreground">ID: {channel.id}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={() => openEditDialog(channel)} size="sm" variant="ghost">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Switch checked={channel.enabled} onCheckedChange={(checked) => toggleChannel(channel.id, checked)} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* VIP Keys Management Section */}
      <Card className="mt-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Key className="h-5 w-5 text-amber-500" />
            Gestion des Clés VIP
          </h2>
          <Button onClick={generateVipKey} className="bg-amber-500 hover:bg-amber-600">
            <Key className="mr-2 h-4 w-4" />
            Générer une Clé
          </Button>
        </div>

        <div className="max-h-[300px] space-y-3 overflow-y-auto">
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
      </Card>

      {/* Create/Merge Channel Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{createMode === "merge" ? "Fusionner des chaînes" : "Créer une nouvelle chaîne"}</DialogTitle>
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

      {/* Existing dialogs */}
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
    </div>
  )
}
