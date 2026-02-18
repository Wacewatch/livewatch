// Role-based permissions and features

export type UserRole = 'admin' | 'vip' | 'user'

export interface RoleFeatures {
  // Viewing features
  canViewChannels: boolean
  canViewFavorites: boolean
  canViewHistory: boolean
  
  // Player features
  hasAdFreeExperience: boolean
  canAccessVipPlayer: boolean
  canDownloadStream: boolean
  canAccessMultipleSources: boolean
  maxQualityLevel: 'sd' | 'hd' | 'fhd' | '4k'
  
  // Admin features
  canAccessAdminPanel: boolean
  canManageChannels: boolean
  canManageUsers: boolean
  canViewAnalytics: boolean
  canManageBanners: boolean
  canManageVipKeys: boolean
  
  // User limits
  maxFavorites: number
  maxHistory: number
  maxSimultaneousStreams: number
  
  // UI features
  showVipBadge: boolean
  prioritySupport: boolean
  customThemes: boolean
}

export const roleFeatures: Record<UserRole, RoleFeatures> = {
  user: {
    canViewChannels: true,
    canViewFavorites: true,
    canViewHistory: true,
    hasAdFreeExperience: false,
    canAccessVipPlayer: false,
    canDownloadStream: false,
    canAccessMultipleSources: false,
    maxQualityLevel: 'hd',
    canAccessAdminPanel: false,
    canManageChannels: false,
    canManageUsers: false,
    canViewAnalytics: false,
    canManageBanners: false,
    canManageVipKeys: false,
    maxFavorites: 20,
    maxHistory: 50,
    maxSimultaneousStreams: 1,
    showVipBadge: false,
    prioritySupport: false,
    customThemes: false,
  },
  vip: {
    canViewChannels: true,
    canViewFavorites: true,
    canViewHistory: true,
    hasAdFreeExperience: true,
    canAccessVipPlayer: true,
    canDownloadStream: true,
    canAccessMultipleSources: true,
    maxQualityLevel: '4k',
    canAccessAdminPanel: false,
    canManageChannels: false,
    canManageUsers: false,
    canViewAnalytics: false,
    canManageBanners: false,
    canManageVipKeys: false,
    maxFavorites: 100,
    maxHistory: 500,
    maxSimultaneousStreams: 3,
    showVipBadge: true,
    prioritySupport: true,
    customThemes: true,
  },
  admin: {
    canViewChannels: true,
    canViewFavorites: true,
    canViewHistory: true,
    hasAdFreeExperience: true,
    canAccessVipPlayer: true,
    canDownloadStream: true,
    canAccessMultipleSources: true,
    maxQualityLevel: '4k',
    canAccessAdminPanel: true,
    canManageChannels: true,
    canManageUsers: true,
    canViewAnalytics: true,
    canManageBanners: true,
    canManageVipKeys: true,
    maxFavorites: -1, // unlimited
    maxHistory: -1, // unlimited
    maxSimultaneousStreams: -1, // unlimited
    showVipBadge: true,
    prioritySupport: true,
    customThemes: true,
  },
}

// Helper function to get features for a role
export function getRoleFeatures(role?: string | null, isVip?: boolean): RoleFeatures {
  if (role === 'admin') return roleFeatures.admin
  if (role === 'vip' || isVip) return roleFeatures.vip
  return roleFeatures.user
}

// Helper function to check if user has a specific feature
export function hasFeature(
  feature: keyof RoleFeatures,
  role?: string | null,
  isVip?: boolean
): boolean {
  const features = getRoleFeatures(role, isVip)
  return Boolean(features[feature])
}

// Helper function to get user role display name
export function getRoleDisplayName(role?: string | null, isVip?: boolean): string {
  if (role === 'admin') return 'Administrateur'
  if (role === 'vip' || isVip) return 'VIP Premium'
  return 'Utilisateur'
}

// Helper function to get user role type
export function getUserRoleType(role?: string | null, isVip?: boolean): UserRole {
  if (role === 'admin') return 'admin'
  if (role === 'vip' || isVip) return 'vip'
  return 'user'
}
