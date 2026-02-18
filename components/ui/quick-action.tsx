import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface QuickActionProps {
  icon: LucideIcon
  label: string
  href?: string
  onClick?: () => void
  variant?: 'default' | 'vip' | 'admin'
  className?: string
}

export function QuickAction({
  icon: Icon,
  label,
  href,
  onClick,
  variant = 'default',
  className = '',
}: QuickActionProps) {
  const variantClasses = {
    default: 'border-border/50 hover:border-primary/50 hover:bg-slate-800/80',
    vip: 'border-yellow-500/30 hover:border-yellow-500/50 hover:bg-yellow-500/5',
    admin: 'border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/5',
  }

  const iconColors = {
    default: 'text-primary',
    vip: 'text-yellow-400',
    admin: 'text-purple-400',
  }

  const baseClasses = `glass-card border rounded-xl p-4 transition-all text-center group ${variantClasses[variant]} ${className}`

  const content = (
    <>
      <Icon className={`w-8 h-8 ${iconColors[variant]} mx-auto mb-2 group-hover:scale-110 transition-transform`} />
      <p className="text-sm font-semibold text-foreground">{label}</p>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={baseClasses}>
        {content}
      </button>
    )
  }

  return <div className={baseClasses}>{content}</div>
}
