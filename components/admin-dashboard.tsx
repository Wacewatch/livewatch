"use client"

import { useEffect, useState } from "react"
import { Users, Crown, Activity, Globe, RefreshCw, Settings, CheckCircle2, XCircle, Network, Home } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface Stats {
  totalChannels: number
  totalCountries: number
  totalUsers: number
  vipUsers: number
  adminUsers: number
  onlineUsers: number
  activeProxies: number
  totalProxies: number
}

interface Country {
  id: string
  name: string
  code: string
  enabled: boolean
  channel_count: number
}

interface ProxyConfig {
  git_url: string
  update_interval_minutes: number
  auto_update_enabled: boolean
  last_update: string
}

interface Proxy {
  id: number
  proxy_url: string
  host: string
  port: number
  success_rate: number
  speed_ms: number
  is_active: boolean
  last_checked: string
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [countries, setCountries] = useState<Country[]>([])
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [proxyConfig, setProxyConfig] = useState<ProxyConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [showProxyConfigDialog, setShowProxyConfigDialog] = useState(false)
  const [editProxyConfig, setEditProxyConfig] = useState({
    git_url: "",
    update_interval_minutes: 30,
    auto_update_enabled: true,
  })

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(() => {
      fetchDashboardData()
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsRes, countriesRes, proxyRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/countries"),
        fetch("/api/admin/proxy-pool"),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (countriesRes.ok) {
        const countriesData = await countriesRes.json()
        setCountries(countriesData.countries || [])
      }

      if (proxyRes.ok) {
        const proxyData = await proxyRes.json()
        setProxies(proxyData.proxies || [])
        setProxyConfig(proxyData.config)
        if (proxyData.config) {
          setEditProxyConfig({
            git_url: proxyData.config.git_url,
            update_interval_minutes: proxyData.config.update_interval_minutes,
            auto_update_enabled: proxyData.config.auto_update_enabled,
          })
        }
      }
    } catch (error) {
      console.error("[v0] Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleCountry = async (countryId: string, enabled: boolean) => {
    try {
      await fetch("/api/admin/countries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: countryId, enabled }),
      })
      fetchDashboardData()
    } catch (error) {
      console.error("[v0] Failed to toggle country:", error)
    }
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
      alert("Configuration mise à jour !")
    } catch (error) {
      console.error("[v0] Failed to update proxy config:", error)
    }
  }

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

      {/* Stats Cards */}
      <div className="mb-6 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-cyan-500 p-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-cyan-500" />
            <div>
              <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
              <p className="text-xs text-muted-foreground">Utilisateurs</p>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-orange-500 p-4">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{stats?.vipUsers || 0}</p>
              <p className="text-xs text-muted-foreground">VIP</p>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-green-500 p-4">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats?.onlineUsers || 0}</p>
              <p className="text-xs text-muted-foreground">En ligne</p>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-purple-500 p-4">
          <div className="flex items-center gap-3">
            <Network className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">
                {stats?.activeProxies || 0}/{stats?.totalProxies || 0}
              </p>
              <p className="text-xs text-muted-foreground">Proxies Actifs</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Countries Management */}
      <Card className="mb-6 p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-cyan-500" />
            <h2 className="text-lg md:text-xl font-bold">Gestion des Pays</h2>
          </div>
          <Badge variant="secondary">{stats?.totalCountries || 0} pays</Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {countries.map((country) => (
            <Card key={country.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{country.code === "FR" ? "🇫🇷" : country.code === "BE" ? "🇧🇪" : "🌍"}</div>
                <div>
                  <p className="font-semibold">{country.name}</p>
                  <p className="text-xs text-muted-foreground">{country.channel_count} chaînes</p>
                </div>
              </div>
              <Switch checked={country.enabled} onCheckedChange={(enabled) => toggleCountry(country.id, enabled)} />
            </Card>
          ))}
        </div>
      </Card>

      {/* Proxy Rotator Management */}
      <Card className="p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg md:text-xl font-bold">Proxy Rotatif</h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setShowProxyConfigDialog(true)} variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Configuration
            </Button>
            <Button onClick={syncProxies} variant="default" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Synchroniser
            </Button>
          </div>
        </div>

        {proxyConfig && (
          <div className="mb-4 p-4 bg-muted rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">URL Git:</span>
              <span className="font-mono text-xs">{proxyConfig.git_url}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mise à jour auto:</span>
              <Badge variant={proxyConfig.auto_update_enabled ? "default" : "secondary"}>
                {proxyConfig.auto_update_enabled ? "Activé" : "Désactivé"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Intervalle:</span>
              <span>{proxyConfig.update_interval_minutes} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dernière sync:</span>
              <span>{proxyConfig.last_update ? new Date(proxyConfig.last_update).toLocaleString() : "Jamais"}</span>
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {proxies.slice(0, 20).map((proxy) => (
            <div key={proxy.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {proxy.is_active ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <div>
                  <p className="font-mono text-sm">
                    {proxy.host}:{proxy.port}
                  </p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>Succès: {proxy.success_rate}%</span>
                    <span>•</span>
                    <span>Vitesse: {proxy.speed_ms}ms</span>
                  </div>
                </div>
              </div>
              <Badge variant={proxy.is_active ? "default" : "secondary"} className="text-xs">
                {proxy.is_active ? "Actif" : "Inactif"}
              </Badge>
            </div>
          ))}
        </div>

        {proxies.length > 20 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">... et {proxies.length - 20} proxies de plus</p>
        )}
      </Card>

      {/* Proxy Config Dialog */}
      <Dialog open={showProxyConfigDialog} onOpenChange={setShowProxyConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configuration Proxy Rotatif</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>URL Git des Proxies</Label>
              <Input
                value={editProxyConfig.git_url}
                onChange={(e) => setEditProxyConfig({ ...editProxyConfig, git_url: e.target.value })}
                placeholder="https://raw.githubusercontent.com/.../proxies.txt"
              />
            </div>
            <div>
              <Label>Intervalle de mise à jour (minutes)</Label>
              <Input
                type="number"
                value={editProxyConfig.update_interval_minutes}
                onChange={(e) =>
                  setEditProxyConfig({ ...editProxyConfig, update_interval_minutes: Number.parseInt(e.target.value) })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Mise à jour automatique</Label>
              <Switch
                checked={editProxyConfig.auto_update_enabled}
                onCheckedChange={(checked) => setEditProxyConfig({ ...editProxyConfig, auto_update_enabled: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProxyConfigDialog(false)}>
              Annuler
            </Button>
            <Button onClick={updateProxyConfig}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
