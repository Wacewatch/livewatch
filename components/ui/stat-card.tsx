import { LucideIcon } from 'lucide-react'
import { theme } from '@/lib/theme'
import { UserRole } from '@/lib/permissions'

interface StatCardProps {
  icon: LucideIcon
  value: string | number
  label: string
  subtitle?: string
  role?: UserRole
  onClick?: () => void
  href?: string
  className?: string
}

export function StatCard({
  icon: Icon,
  value,
  label,
  subtitle,
  role = 'user',
  onClick,
  href,
  className = '',
}: StatCardProps) {
  const roleBadge = theme.badges[role]
  const isInteractive = Boolean(onClick || href)

  const content = (
    <>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg ${roleBadge.bg} border ${roleBadge.border} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${roleBadge.icon}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
      {subtitle && (
        <div className="mt-2 pt-2 border-t border-border/30">
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      )}
    </>
  )

  const baseClasses = `glass-card border border-border/50 rounded-xl p-4 ${className}`
  const interactiveClasses = isInteractive
    ? 'hover:border-primary/50 hover:bg-slate-800/80 transition-all cursor-pointer group'
    : ''

  if (href) {
    return (
      <a href={href} className={`${baseClasses} ${interactiveClasses}`}>
        {content}
      </a>
    )
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={`${baseClasses} ${interactiveClasses} text-left w-full`}>
        {content}
      </button>
    )
  }

  return <div className={baseClasses}>{content}</div>
}
