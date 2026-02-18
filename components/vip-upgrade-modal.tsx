"use client"

import { X, Crown, Check, ExternalLink } from "lucide-react"

interface VipUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function VipUpgradeModal({ isOpen, onClose }: VipUpgradeModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors z-10"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/50">
              <Crown className="w-10 h-10 text-white" />
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Passez VIP Premium</h2>
            <p className="text-white/60 text-sm">Débloquez l'expérience ultime sans publicité</p>
          </div>

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

          <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30 rounded-xl p-4 text-center">
            <p className="text-white/70 text-sm mb-1">Prix unique</p>
            <p className="text-4xl font-bold text-amber-400">5€</p>
            <p className="text-white/50 text-sm mt-1">À vie - Jusqu'à la fin des services</p>
          </div>

          <a
            href="https://ko-fi.com/wavewatch"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-black font-bold text-lg hover:scale-[1.02] transition-all shadow-lg shadow-amber-500/30"
          >
            <Crown className="w-5 h-5" />
            <span>Acheter VIP Premium</span>
            <ExternalLink className="w-5 h-5" />
          </a>

          <p className="text-white/40 text-xs text-center">
            Après votre achat sur Ko-fi, vous recevrez automatiquement votre accès VIP.
          </p>
        </div>
      </div>
    </div>
  )
}
