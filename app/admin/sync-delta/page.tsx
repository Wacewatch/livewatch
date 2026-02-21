"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, RefreshCw } from "lucide-react"

export default function SyncDeltaPage() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSync = async () => {
    setSyncing(true)
    setResult(null)
    try {
      const response = await fetch("/api/delta/sync", {
        method: "POST",
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: String(error) })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>

        <div className="glass-card rounded-2xl p-8">
          <h1 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Synchronisation Delta
          </h1>

          <p className="text-muted-foreground mb-6">
            Cliquez sur le bouton ci-dessous pour synchroniser les chaînes et pays Delta depuis l'API VAVOO vers la base
            de données. Cette opération est automatique toutes les 30 minutes via un cron job.
          </p>

          <Button onClick={handleSync} disabled={syncing} className="w-full mb-6">
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Synchronisation en cours..." : "Lancer la synchronisation"}
          </Button>

          {result && (
            <div className="glass-card rounded-xl p-6 border border-purple-500/30">
              <h2 className="font-bold text-lg mb-4">Résultat:</h2>
              <pre className="text-sm overflow-auto max-h-96 bg-black/30 p-4 rounded-lg">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
