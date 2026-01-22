"use client"

import { useEffect, useState } from "react"
import { CreditCard, CheckCircle, Clock, AlertCircle, Download, RefreshCw, Search, Filter } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface KofiTransaction {
  id: string
  transaction_id: string
  user_id: string
  user_email: string
  amount: number
  currency: string
  status: "completed" | "pending" | "failed"
  payment_method: string
  donor_name: string
  message?: string
  created_at: string
  processed_at?: string
}

export function KofiTransactions() {
  const [transactions, setTransactions] = useState<KofiTransaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<KofiTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending" | "failed">("all")
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [stats, setStats] = useState({
    completed: 0,
    pending: 0,
    failed: 0,
  })

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/admin/kofi-transactions")
        if (!response.ok) throw new Error("Failed to fetch transactions")

        const data = await response.json()
        setTransactions(data.transactions || [])

        // Calculate stats
        const completedTxns = (data.transactions || []).filter((t: KofiTransaction) => t.status === "completed")
        const pendingTxns = (data.transactions || []).filter((t: KofiTransaction) => t.status === "pending")
        const failedTxns = (data.transactions || []).filter((t: KofiTransaction) => t.status === "failed")

        setStats({
          completed: completedTxns.length,
          pending: pendingTxns.length,
          failed: failedTxns.length,
        })

        const total = completedTxns.reduce((sum: number, t: KofiTransaction) => sum + t.amount, 0)
        setTotalRevenue(total)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  useEffect(() => {
    let filtered = transactions

    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.donor_name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter)
    }

    setFilteredTransactions(filtered)
  }, [searchTerm, statusFilter, transactions])

  const handleExportCSV = () => {
    const csvContent = [
      ["Transaction ID", "User Email", "Donor", "Amount", "Currency", "Status", "Payment Method", "Date"],
      ...filteredTransactions.map((t) => [
        t.transaction_id,
        t.user_email,
        t.donor_name,
        t.amount,
        t.currency,
        t.status,
        t.payment_method,
        new Date(t.created_at).toLocaleString(),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `kofi-transactions-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Complété</Badge>
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">En attente</Badge>
      case "failed":
        return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Échoué</Badge>
      default:
        return <Badge>Inconnu</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            Transactions Ko-fi
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Gérez tous les paiements Ko-fi reçus</p>
        </div>
        <Button onClick={handleExportCSV} className="gap-2">
          <Download className="w-4 h-4" />
          Exporter CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Chiffre d'affaires</p>
              <p className="text-2xl font-bold text-foreground">${totalRevenue.toFixed(2)}</p>
            </div>
            <CreditCard className="w-8 h-8 text-primary/50" />
          </div>
        </Card>

        <Card className="glass-card border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Complétées</p>
              <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500/50" />
          </div>
        </Card>

        <Card className="glass-card border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">En attente</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500/50" />
          </div>
        </Card>

        <Card className="glass-card border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Échouées</p>
              <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500/50" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card border-border/50 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par email, transaction ID ou donateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="completed">Complétées</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="failed">Échouées</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      {loading ? (
        <Card className="glass-card border-border/50 p-8">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-primary/50 mx-auto mb-2 animate-spin" />
            <p className="text-muted-foreground">Chargement des transactions...</p>
          </div>
        </Card>
      ) : error ? (
        <Card className="glass-card border-border/50 p-8">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-400">Erreur: {error}</p>
          </div>
        </Card>
      ) : filteredTransactions.length === 0 ? (
        <Card className="glass-card border-border/50 p-8">
          <div className="text-center">
            <CreditCard className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-muted-foreground">Aucune transaction trouvée</p>
          </div>
        </Card>
      ) : (
        <Card className="glass-card border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/50 bg-black/20">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">ID Transaction</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Email Utilisateur</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Donateur</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">Montant</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Statut</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Méthode</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-cyan-400">{transaction.transaction_id.substring(0, 8)}...</td>
                    <td className="px-4 py-3 text-foreground">{transaction.user_email}</td>
                    <td className="px-4 py-3 text-foreground">{transaction.donor_name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-400">
                      {transaction.currency} {transaction.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(transaction.status)}
                        {getStatusBadge(transaction.status)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{transaction.payment_method}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(transaction.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Total Transactions */}
      <Card className="glass-card border-border/50 p-4">
        <p className="text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{filteredTransactions.length}</span> transaction(s)
        </p>
      </Card>
    </div>
  )
}
