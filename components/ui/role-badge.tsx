import { Shield, Crown, User } from 'lucide-react'
import { theme } from '@/lib/theme'
import { getUserRoleType, getRoleDisplayName, type UserRole } from '@/lib/permissions'

interface RoleBadgeProps {
  role?: string | null
  isVip?: boolean
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

export function RoleBadge({
  role,
  isVip,
  size = 'md',
  showIcon = true,
  className = '',
}: RoleBadgeProps) {
  const userRoleType = getUserRoleType(role, isVip)
  const displayName = getRoleDisplayName(role, isVip)
  const roleBadge = theme.badges[userRoleType]

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  const Icon = userRoleType === 'admin' ? Shield : userRoleType === 'vip' ? Crown : User

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full ${roleBadge.bg} border ${roleBadge.border} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && <Icon className={`${iconSizes[size]} ${roleBadge.icon}`} />}
      <span className={`font-bold ${roleBadge.text}`}>{displayName}</span>
    </div>
  )
}
