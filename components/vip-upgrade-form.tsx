"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Crown, Zap, Star, Shield, ExternalLink } from "lucide-react"

export function VipUpgradeForm() {

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
        <div className="mb-6 text-center">
          <h2 className="mb-2 text-2xl font-bold">Obtenez votre accès VIP</h2>
          <p className="text-muted-foreground">Soutenez le projet et débloquez tous les avantages premium</p>
        </div>

        <div className="space-y-4">
          <a
            href="https://ko-fi.com/wavewatch"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 text-lg font-bold text-white transition-all duration-300 hover:from-amber-600 hover:to-orange-600 hover:shadow-lg hover:shadow-amber-500/30"
          >
            <Crown className="h-6 w-6" />
            Acheter VIP Premium
            <ExternalLink className="h-5 w-5" />
          </a>

          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Après votre achat sur Ko-fi, vous recevrez automatiquement votre accès VIP.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
