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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-500/20 max-w-lg w-full my-4 sm:my-8 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-amber-500 to-amber-600 p-4 sm:p-6 text-center">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-all z-10"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <Crown className="w-12 h-12 sm:w-16 sm:h-16 text-black mx-auto mb-2 sm:mb-3" />
          <h2 className="text-2xl sm:text-3xl font-bold text-black">Devenez VIP</h2>
          <p className="text-sm sm:text-base text-black/80 mt-1 sm:mt-2">Accès illimité sans publicité</p>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {!success ? (
            <>
              {/* Benefits */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm sm:text-base">Aucune publicité</p>
                    <p className="text-white/60 text-xs sm:text-sm">Regardez tous les streams instantanément</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm sm:text-base">Accès à vie</p>
                    <p className="text-white/60 text-xs sm:text-sm">Un seul paiement, accès illimité</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm sm:text-base">Toutes les qualités</p>
                    <p className="text-white/60 text-xs sm:text-sm">SD, HD, FHD et 4K disponibles</p>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30 rounded-xl p-3 sm:p-4 text-center">
                <p className="text-white/70 text-xs sm:text-sm mb-1">Prix unique</p>
                <p className="text-3xl sm:text-4xl font-bold text-amber-400">5€</p>
                <p className="text-white/50 text-xs sm:text-sm mt-1">À vie - Jusqu'à la fin des services</p>
              </div>

              {/* Key Input */}
              <div>
                <label className="block text-white font-semibold text-sm sm:text-base mb-2">Clé VIP</label>
                <input
                  type="text"
                  value={vipKey}
                  onChange={(e) => setVipKey(e.target.value)}
                  placeholder="Collez votre clé VIP ici..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-amber-500/50 focus:outline-none transition-all"
                />
                {error && <p className="text-red-400 text-xs sm:text-sm mt-2">{error}</p>}
              </div>

              {/* Action Button */}
              <button
                onClick={handleRedeem}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-black font-bold hover:scale-[1.02] transition-all shadow-lg shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span>Activation...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Activer ma clé VIP</span>
                  </>
                )}
              </button>

              <p className="text-white/40 text-xs text-center px-2">
                Vous n'avez pas de clé ? Contactez l'administrateur pour en obtenir une.
              </p>
            </>
          ) : (
            <div className="text-center py-6 sm:py-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 sm:w-10 sm:h-10 text-green-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Félicitations !</h3>
              <p className="text-sm sm:text-base text-white/70 px-4">
                Vous êtes maintenant VIP. Profitez de votre accès sans publicité !
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
