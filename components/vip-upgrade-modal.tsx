"use client"

import { useState } from "react"
import { X, Crown, Check, Sparkles, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface VipUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function VipUpgradeModal({ isOpen, onClose }: VipUpgradeModalProps) {
  const [vipKey, setVipKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleRedeem = async () => {
    if (!vipKey.trim()) {
      setError("Veuillez entrer une clé VIP")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/vip/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: vipKey.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'activation")
      }

      setSuccess(true)
      setTimeout(() => {
        router.refresh()
        onClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-500/20 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          <Crown className="w-16 h-16 text-black mx-auto mb-3" />
          <h2 className="text-3xl font-bold text-black">Devenez VIP</h2>
          <p className="text-black/80 mt-2">Accès illimité sans publicité</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!success ? (
            <>
              {/* Benefits */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Aucune publicité</p>
                    <p className="text-white/60 text-sm">Regardez tous les streams instantanément</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Accès à vie</p>
                    <p className="text-white/60 text-sm">Un seul paiement, accès illimité</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Toutes les qualités</p>
                    <p className="text-white/60 text-sm">SD, HD, FHD et 4K disponibles</p>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30 rounded-xl p-4 text-center">
                <p className="text-white/70 text-sm mb-1">Prix unique</p>
                <p className="text-4xl font-bold text-amber-400">5€</p>
                <p className="text-white/50 text-sm mt-1">À vie - Jusqu'à la fin des services</p>
              </div>

              {/* Key Input */}
              <div>
                <label className="block text-white font-semibold mb-2">Clé VIP</label>
                <input
                  type="text"
                  value={vipKey}
                  onChange={(e) => setVipKey(e.target.value)}
                  placeholder="Collez votre clé VIP ici..."
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-amber-500/50 focus:outline-none transition-all"
                />
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
              </div>

              {/* Action Button */}
              <button
                onClick={handleRedeem}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-black font-bold text-lg hover:scale-[1.02] transition-all shadow-lg shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Activation...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Activer ma clé VIP</span>
                  </>
                )}
              </button>

              <p className="text-white/40 text-xs text-center">
                Vous n'avez pas de clé ? Contactez l'administrateur pour en obtenir une.
              </p>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Félicitations !</h3>
              <p className="text-white/70">Vous êtes maintenant VIP. Profitez de votre accès sans publicité !</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
