import { Crown, Sparkles, Zap, ExternalLink, Check } from 'lucide-react'
import { theme } from '@/lib/theme'

interface VipUpgradeCardProps {
  compact?: boolean
  className?: string
}

export function VipUpgradeCard({ compact = false, className = '' }: VipUpgradeCardProps) {
  const features = [
    'Aucune publicité',
    'Qualité 4K',
    'Streams illimités',
    'Accès prioritaire',
    'Support premium',
  ]

  if (compact) {
    return (
      <div className={`glass-card border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-transparent to-yellow-500/5 rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center">
            <Crown className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Passez VIP Premium</h3>
            <p className="text-xs text-muted-foreground">Débloquez toutes les fonctionnalités</p>
          </div>
        </div>
        <a
          href="https://ko-fi.com/wavewatch"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold text-sm transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/30"
        >
          Devenir VIP
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    )
  }

  return (
    <div className={`glass-card border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-transparent to-yellow-500/5 rounded-2xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
          <Crown className="w-6 h-6 text-black" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-foreground">VIP Premium</h3>
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-sm text-muted-foreground">
            L'expérience ultime sans compromis
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-3 mb-6">
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-yellow-400" />
            </div>
            <span className="text-sm text-foreground">{feature}</span>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <a
        href="https://ko-fi.com/wavewatch"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold text-sm transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/30"
      >
        <Zap className="w-4 h-4" />
        Acheter VIP Premium
        <ExternalLink className="w-4 h-4" />
      </a>

      {/* Price Info */}
      <div className="mt-4 pt-4 border-t border-yellow-500/20">
        <p className="text-xs text-center text-muted-foreground">
          Paiement unique • Accès à vie • Support prioritaire
        </p>
      </div>
    </div>
  )
}
