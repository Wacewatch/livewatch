import { Heart, Clock, Star, Tv, Crown, Shield } from 'lucide-react'
import { getRoleFeatures } from '@/lib/permissions'
import { theme } from '@/lib/theme'

interface FeatureLimitsProps {
  role?: string | null
  isVip?: boolean
  currentFavorites?: number
  currentHistory?: number
  compact?: boolean
}

export function FeatureLimits({
  role,
  isVip,
  currentFavorites = 0,
  currentHistory = 0,
  compact = false,
}: FeatureLimitsProps) {
  const features = getRoleFeatures(role, isVip)
  const roleType = role === 'admin' ? 'admin' : isVip || role === 'vip' ? 'vip' : 'user'
  const badge = theme.badges[roleType]

  const limitItems = [
    {
      icon: Heart,
      label: 'Favoris',
      current: currentFavorites,
      max: features.maxFavorites,
      show: true,
    },
    {
      icon: Clock,
      label: 'Historique',
      current: currentHistory,
      max: features.maxHistory,
      show: true,
    },
    {
      icon: Star,
      label: 'Qualité',
      value: features.maxQualityLevel.toUpperCase(),
      show: true,
    },
    {
      icon: Tv,
      label: 'Streams',
      value: features.maxSimultaneousStreams === -1 ? '∞' : features.maxSimultaneousStreams,
      show: true,
    },
  ]

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {limitItems.filter(item => item.show).map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
            <item.icon className={`w-3 h-3 ${badge.icon}`} />
            <span>
              {item.label}: {item.value || (item.max === -1 ? '∞' : `${item.current}/${item.max}`)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {limitItems.filter(item => item.show).map((item, idx) => (
        <div key={idx} className={`glass-card border ${badge.border} rounded-xl p-3`}>
          <div className="flex items-center gap-2 mb-1">
            <item.icon className={`w-4 h-4 ${badge.icon}`} />
            <span className="text-xs text-muted-foreground font-semibold">{item.label}</span>
          </div>
          <div className="text-lg font-bold text-foreground">
            {item.value || (
              <>
                {item.current}
                {item.max !== -1 && (
                  <span className="text-sm text-muted-foreground"> / {item.max}</span>
                )}
                {item.max === -1 && (
                  <span className="text-sm text-muted-foreground"> / ∞</span>
                )}
              </>
            )}
          </div>
          {item.max !== -1 && item.current !== undefined && (
            <div className="mt-2 w-full bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full ${badge.bg} transition-all duration-300`}
                style={{ width: `${Math.min((item.current / item.max) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
