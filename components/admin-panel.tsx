"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, RefreshCw } from "lucide-react"

interface Channel {
  id: string
  name: string
  enabled: boolean
  sort_order: number
}

export function AdminPanel() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    fetchChannels()
  }, [])

  const fetchChannels = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/channels")
      const data = await response.json()
      setChannels(data.channels || [])
    } catch (error) {
      console.error("Failed to fetch channels:", error)
    } finally {
      setLoading(false)
    }
  }

  const syncFromCatalog = async () => {
    try {
      setSyncing(true)
      const catalogResponse = await fetch("/api/catalog")
      const catalogData = await catalogResponse.json()

      await fetch("/api/admin/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels: catalogData.channels }),
      })

      await fetchChannels()
    } catch (error) {
      console.error("Failed to sync channels:", error)
    } finally {
      setSyncing(false)
    }
  }

  const toggleChannel = async (id: string, enabled: boolean) => {
    try {
      await fetch("/api/admin/channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled }),
      })

      setChannels((prev) => prev.map((ch) => (ch.id === id ? { ...ch, enabled } : ch)))
    } catch (error) {
      console.error("Failed to update channel:", error)
    }
  }

  const filteredChannels = channels.filter((ch) => ch.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Channel Management</CardTitle>
            <CardDescription>Enable or disable TV channels from appearing on the frontend</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search channels..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={syncFromCatalog} disabled={syncing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                Sync from Catalog
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-2 text-sm font-medium">
                <span>Channel Name</span>
                <span>Status</span>
              </div>

              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Loading channels...</div>
              ) : filteredChannels.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  {search ? "No channels found" : "No channels. Click 'Sync from Catalog' to import."}
                </div>
              ) : (
                filteredChannels.map((channel) => (
                  <div
                    key={channel.id}
                    className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{channel.name}</span>
                      {channel.enabled ? (
                        <Badge variant="default" className="bg-green-500">
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </div>
                    <Switch
                      checked={channel.enabled}
                      onCheckedChange={(checked) => toggleChannel(channel.id, checked)}
                    />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
