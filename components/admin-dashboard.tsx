"use client"

import { useEffect, useState } from "react"
import { Users, LaptopMinimal as TvMinimal, Star, Shield, Crown, UserCircle, Activity, TrendingUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface Stats {
  totalUsers: number
  totalChannels: number
  enabledChannels: number
  totalFavorites: number
  vipUsers: number
  adminUsers: number
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
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [userSearch, setUserSearch] = useState("")
  const [channelSearch, setChannelSearch] = useState("")

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsRes, usersRes, channelsRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/users"),
        fetch("/api/admin/channels"),
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
    } catch (error) {
      console.error("[v0] Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const syncChannels = async () => {
    try {
      const catalogRes = await fetch("/api/catalog")
      const catalogData = await catalogRes.json()

      const syncRes = await fetch("/api/admin/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels: catalogData.channels }),
      })

      if (syncRes.ok) {
        fetchDashboardData()
      }
    } catch (error) {
      console.error("[v0] Failed to sync channels:", error)
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

  const toggleChannel = async (channelId: string, enabled: boolean) => {
    try {
      await fetch("/api/admin/channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: channelId, enabled }),
      })
      fetchDashboardData()
    } catch (error) {
      console.error("[v0] Failed to toggle channel:", error)
    }
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
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Administration</h1>
        <p className="text-muted-foreground">Tableau de bord Admin</p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-500/10 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Utilisateurs</p>
              <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
            </div>
            <Users className="h-8 w-8 text-purple-500" />
          </div>
        </Card>

        <Card className="border-l-4 border-l-cyan-500 bg-gradient-to-br from-cyan-500/10 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Chaînes</p>
              <p className="text-2xl font-bold">{stats?.totalChannels || 0}</p>
            </div>
            <TvMinimal className="h-8 w-8 text-cyan-500" />
          </div>
        </Card>

        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-500/10 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Actives</p>
              <p className="text-2xl font-bold">{stats?.enabledChannels || 0}</p>
            </div>
            <Activity className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-500/10 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">VIP</p>
              <p className="text-2xl font-bold">{stats?.vipUsers || 0}</p>
            </div>
            <Crown className="h-8 w-8 text-orange-500" />
          </div>
        </Card>

        <Card className="border-l-4 border-l-red-500 bg-gradient-to-br from-red-500/10 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Admins</p>
              <p className="text-2xl font-bold">{stats?.adminUsers || 0}</p>
            </div>
            <Shield className="h-8 w-8 text-red-500" />
          </div>
        </Card>

        <Card className="border-l-4 border-l-yellow-500 bg-gradient-to-br from-yellow-500/10 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Favoris</p>
              <p className="text-2xl font-bold">{stats?.totalFavorites || 0}</p>
            </div>
            <Star className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Gestion des Chaînes</h2>
            <Button onClick={syncChannels} size="sm" className="bg-cyan-500 hover:bg-cyan-600">
              <TrendingUp className="mr-2 h-4 w-4" />
              Synchroniser
            </Button>
          </div>

          <Input
            placeholder="Rechercher une chaîne..."
            value={channelSearch}
            onChange={(e) => setChannelSearch(e.target.value)}
            className="mb-4"
          />

          <div className="max-h-[400px] space-y-3 overflow-y-auto">
            {filteredChannels.map((channel) => (
              <div key={channel.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                    <TvMinimal className="h-5 w-5 text-cyan-500" />
                  </div>
                  <div>
                    <p className="font-medium">{channel.name}</p>
                    <p className="text-xs text-muted-foreground">ID: {channel.id}</p>
                  </div>
                </div>
                <Switch checked={channel.enabled} onCheckedChange={(checked) => toggleChannel(channel.id, checked)} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
