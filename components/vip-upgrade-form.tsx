"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Crown, Check, Zap, Star, Shield, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"

export function VipUpgradeForm() {
  const [key, setKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const redeemKey = async () => {
    if (!key.trim()) {
      setError("Veuillez entrer une clé VIP")
      return
    }

    setLoading(true)
    setError("")

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("Vous devez être connecté pour activer une clé VIP")
        setLoading(false)
        return
      }

      const response = await fetch("/api/vip/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/")
          router.refresh()
        }, 2000)
      } else {
        setError(data.error || "Clé invalide ou déjà utilisée")
      }
    } catch (err) {
      console.error("[v0] Error redeeming VIP key:", err)
      setError("Une erreur est survenue. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="mx-auto max-w-2xl p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-green-500/20 p-4">
            <Check className="h-12 w-12 text-green-500" />
          </div>
        </div>
        <h2 className="mb-4 text-3xl font-bold">Bienvenue VIP ! 🎉</h2>
        <p className="text-lg text-muted-foreground">
          Votre compte a été mis à niveau avec succès. Profitez de votre expérience sans publicité !
        </p>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-gradient-to-br from-amber-500 to-orange-500 p-4">
            <Crown className="h-12 w-12 text-white" />
          </div>
        </div>
        <h1 className="mb-4 text-4xl font-bold">Devenez VIP</h1>
        <p className="text-xl text-muted-foreground">Profitez d'une expérience premium sans publicité</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-6 py-2 text-amber-500">
          <Star className="h-5 w-5" />
          <span className="font-bold">5€ à vie</span>
        </div>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <Card className="border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-transparent p-6">
          <div className="mb-4 flex justify-center">
            <Zap className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="mb-2 text-center text-lg font-bold">Aucune Publicité</h3>
          <p className="text-center text-sm text-muted-foreground">
            Regardez tous vos contenus sans interruption publicitaire
          </p>
        </Card>

        <Card className="border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-transparent p-6">
          <div className="mb-4 flex justify-center">
            <Crown className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="mb-2 text-center text-lg font-bold">Accès Premium</h3>
          <p className="text-center text-sm text-muted-foreground">Accès direct à tous les streams sans restriction</p>
        </Card>

        <Card className="border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-transparent p-6">
          <div className="mb-4 flex justify-center">
            <Shield className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="mb-2 text-center text-lg font-bold">À Vie</h3>
          <p className="text-center text-sm text-muted-foreground">Un seul paiement pour un accès permanent</p>
        </Card>
      </div>

      <Card className="p-8">
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-bold">Activer votre accès VIP</h2>
          <p className="text-muted-foreground">Entrez votre clé VIP pour débloquer tous les avantages premium</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500 bg-red-500/10 p-4">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="vip-key">Clé VIP</Label>
            <Input
              id="vip-key"
              type="text"
              placeholder="Entrez votre clé VIP..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && redeemKey()}
              className="mt-2"
            />
          </div>

          <Button
            onClick={redeemKey}
            disabled={loading || !key.trim()}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            size="lg"
          >
            {loading ? (
              <>
                <span className="mr-2">Activation en cours...</span>
              </>
            ) : (
              <>
                <Crown className="mr-2 h-5 w-5" />
                <span>Activer VIP</span>
              </>
            )}
          </Button>
        </div>

        <div className="mt-6">
          <Button
            variant="outline"
            size="lg"
            className="w-full border-amber-500/50 hover:bg-amber-500/10"
            onClick={() => window.open("https://ko-fi.com/wavewatch/shop", "_blank")}
          >
            <ExternalLink className="mr-2 h-5 w-5" />
            <span>Obtenir une clé VIP sur Ko-fi</span>
          </Button>
        </div>
      </Card>
    </div>
  )
}
