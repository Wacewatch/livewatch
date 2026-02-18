'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Crown, Mail, User, Calendar, Copy, Check, Zap, ExternalLink, Heart, Clock, Key, Loader2, X, Tv, Settings, Shield, Star } from 'lucide-react'
import { theme, getRoleBadge } from '@/lib/theme'
import { getRoleFeatures, getRoleDisplayName, getUserRoleType } from '@/lib/permissions'

interface UserProfile {
  id: string
  email: string
  is_vip: boolean
  vip_purchased_at: string | null
  role: string | null
  created_at: string
}

interface FavoriteChannel {
  id: string
  channel_id: string
  created_at: string
  channels: {
    name: string
    logo: string
    category: string
  }
}

interface ViewHistory {
  id: string
  channel_id: string
  channel_name: string
  viewed_at: string
  duration_seconds: number
}

export default function UserDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [favorites, setFavorites] = useState<FavoriteChannel[]>([])
  const [history, setHistory] = useState<ViewHistory[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  
  // VIP Key state
  const [showVipKeyInput, setShowVipKeyInput] = useState(false)
  const [vipKey, setVipKey] = useState('')
  const [redeemingVip, setRedeemingVip] = useState(false)
  const [vipError, setVipError] = useState<string | null>(null)
  const [vipSuccess, setVipSuccess] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
          router.push('/login')
          return
        }

        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (error) throw error

        console.log('[v0] Dashboard user loaded:', {
          email: data?.email,
          is_vip: data?.is_vip,
          role: data?.role,
          vip_purchased_at: data?.vip_purchased_at,
          created_at: data?.created_at
        })

        setUser(data)
      } catch (error) {
        console.error('[v0] Error fetching user:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [supabase, router])

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return
      
      try {
        // Fetch user favorites first
        const { data: favData, error: favError } = await supabase
          .from('user_favorites')
          .select('id, channel_id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(6)

        if (favError) throw favError

        // Fetch channel details from TVVoo API
        if (favData && favData.length > 0) {
          const channelIds = favData.map(f => f.channel_id)
          console.log('[v0] Fetching channels from API for IDs:', channelIds)
          
          // Determine country from first channel ID (e.g., "TF1.fr" -> "fr")
          const country = channelIds[0]?.split('.').pop()?.toLowerCase() || 'fr'
          
          const response = await fetch(`/api/tvvoo/channels?countries=${encodeURIComponent(country)}`)
          if (response.ok) {
            const apiChannels = await response.json()
            
            // Merge favorites with channel data from API
            const mergedData = favData
              .map(fav => {
                const channelData = apiChannels.find((ch: any) => ch.baseId === fav.channel_id)
                return {
                  ...fav,
                  channels: channelData ? {
                    name: channelData.baseName,
                    logo: channelData.logo,
                    category: channelData.categories?.[0] || 'Général'
                  } : {
                    name: fav.channel_id.split('.')[0] || 'Chaîne inconnue',
                    logo: '',
                    category: 'N/A'
                  }
                }
              })
              .filter(fav => fav.channels.name !== 'Chaîne inconnue') // Filter out unfound channels

            setFavorites(mergedData)
          } else {
            throw new Error('Failed to fetch channels from API')
          }
        } else {
          setFavorites([])
        }
      } catch (error) {
        console.error('[v0] Error fetching favorites:', error)
        setFavorites([])
      } finally {
        setLoadingFavorites(false)
      }
    }

    const fetchHistory = async () => {
      if (!user) return
      
      try {
        const { data, error } = await supabase
          .from('channel_views')
          .select('*')
          .eq('user_id', user.id)
          .order('viewed_at', { ascending: false })
          .limit(10)

        if (error) throw error
        setHistory(data || [])
      } catch (error) {
        console.error('[v0] Error fetching history:', error)
      } finally {
        setLoadingHistory(false)
      }
    }

    if (user) {
      fetchFavorites()
      fetchHistory()
    }
  }, [user, supabase])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedEmail(true)
    setTimeout(() => setCopiedEmail(false), 2000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleRedeemVipKey = async () => {
    if (!vipKey.trim()) {
      setVipError('Veuillez entrer une clé VIP')
      return
    }

    setRedeemingVip(true)
    setVipError(null)

    try {
      const response = await fetch('/api/vip/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: vipKey.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'activation')
      }

      setVipSuccess(true)
      setTimeout(() => {
        router.refresh()
        window.location.reload()
      }, 2000)
    } catch (err) {
      setVipError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setRedeemingVip(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
  return `${minutes}m`
  }
  
  // Get user role and features
  const userRoleType = getUserRoleType(user?.role, user?.is_vip)
  const roleFeatures = getRoleFeatures(user?.role, user?.is_vip)
  const isVipOrAdmin = userRoleType !== 'user'
  const roleBadge = getRoleBadge(userRoleType)
  
  console.log('[v0] Dashboard user role:', {
    user_email: user?.email,
    roleType: userRoleType,
    isVipOrAdmin,
    features: roleFeatures
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement du profil...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-card border-b border-border/50 backdrop-blur-xl shadow-2xl">
        <div className="max-w-7xl mx-auto p-3 md:p-5 flex items-center justify-between">
          <Link
            href="/"
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl glass-card border border-border/50 flex items-center justify-center hover:border-primary/50 hover:scale-105 transition-all"
          >
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-foreground" />
          </Link>

          <h1 className="text-lg md:text-xl font-bold text-foreground">Mon Dashboard</h1>

          <button
            onClick={handleLogout}
            className="px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto p-3 md:p-6 lg:p-10 pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Favorites Count */}
          <div className="glass-card border border-border/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg ${roleBadge.bg} border ${roleBadge.border} flex items-center justify-center`}>
                <Heart className={`w-5 h-5 ${roleBadge.icon}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{favorites.length}</p>
                <p className="text-xs text-muted-foreground">Favoris</p>
              </div>
            </div>
            {roleFeatures.maxFavorites > 0 && (
              <div className="mt-2 pt-2 border-t border-border/30">
                <p className="text-xs text-muted-foreground">
                  Max: {roleFeatures.maxFavorites}
                </p>
              </div>
            )}
          </div>

          {/* History Count */}
          <div className="glass-card border border-border/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg ${roleBadge.bg} border ${roleBadge.border} flex items-center justify-center`}>
                <Clock className={`w-5 h-5 ${roleBadge.icon}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{history.length}</p>
                <p className="text-xs text-muted-foreground">Historique</p>
              </div>
            </div>
          </div>

          {/* Quality Badge */}
          <div className="glass-card border border-border/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg ${roleBadge.bg} border ${roleBadge.border} flex items-center justify-center`}>
                <Star className={`w-5 h-5 ${roleBadge.icon}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground uppercase">{roleFeatures.maxQualityLevel}</p>
                <p className="text-xs text-muted-foreground">Qualité Max</p>
              </div>
            </div>
          </div>

          {/* Admin Access or Feature */}
          {roleFeatures.canAccessAdminPanel ? (
            <Link
              href="/admin"
              className="glass-card border border-purple-500/30 rounded-xl p-4 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground group-hover:text-purple-400 transition-colors">Admin</p>
                  <p className="text-xs text-muted-foreground">Accès panel</p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="glass-card border border-border/50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg ${roleBadge.bg} border ${roleBadge.border} flex items-center justify-center`}>
                  <Tv className={`w-5 h-5 ${roleBadge.icon}`} />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{roleFeatures.maxSimultaneousStreams > 0 ? roleFeatures.maxSimultaneousStreams : '∞'}</p>
                  <p className="text-xs text-muted-foreground">Streams</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Link
            href="/"
            className="glass-card border border-border/50 rounded-xl p-4 hover:border-primary/50 hover:bg-slate-800/80 transition-all text-center group"
          >
            <Tv className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-semibold text-foreground">Regarder TV</p>
          </Link>

          <Link
            href="/favorites"
            className="glass-card border border-border/50 rounded-xl p-4 hover:border-primary/50 hover:bg-slate-800/80 transition-all text-center group"
          >
            <Heart className="w-8 h-8 text-red-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-semibold text-foreground">Mes Favoris</p>
          </Link>

          {roleFeatures.canAccessVipPlayer && (
            <Link
              href="/playervip"
              className="glass-card border border-yellow-500/30 rounded-xl p-4 hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all text-center group"
            >
              <Crown className="w-8 h-8 text-yellow-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold text-foreground">Player VIP</p>
            </Link>
          )}

          <button
            onClick={() => window.open('https://ko-fi.com/wavewatch', '_blank')}
            className="glass-card border border-border/50 rounded-xl p-4 hover:border-primary/50 hover:bg-slate-800/80 transition-all text-center group"
          >
            <ExternalLink className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-semibold text-foreground">Support</p>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-3 md:p-6 lg:p-10 pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile & VIP */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="glass-card border border-border/50 rounded-2xl p-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border-2 border-primary/50 flex items-center justify-center overflow-hidden mb-4">
                  <User className="w-10 h-10 md:w-12 md:h-12 text-primary" />
                </div>

                <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">Mon Profil</h2>

                {/* Role Badge */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${roleBadge.bg} border ${roleBadge.border} mb-4`}>
                  {userRoleType === 'admin' ? (
                    <Shield className={`w-4 h-4 ${roleBadge.icon}`} />
                  ) : userRoleType === 'vip' ? (
                    <Crown className={`w-4 h-4 ${roleBadge.icon}`} />
                  ) : (
                    <User className={`w-4 h-4 ${roleBadge.icon}`} />
                  )}
                  <span className={`text-sm font-bold ${roleBadge.text}`}>
                    {getRoleDisplayName(user.role, user.is_vip)}
                  </span>
                </div>

                {/* Email */}
                <div className="w-full p-4 rounded-xl bg-slate-800/50 border border-border/30 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground font-semibold">Email</span>
                  </div>
                  <div className="flex items-center gap-2 justify-between">
                    <span className="text-sm font-mono text-foreground truncate">{user.email}</span>
                    <button
                      onClick={() => copyToClipboard(user.email)}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                    >
                      {copiedEmail ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Member Since */}
                <div className="w-full p-4 rounded-xl bg-slate-800/50 border border-border/30 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground font-semibold">Membre depuis</span>
                  </div>
                  <span className="text-sm font-mono text-foreground">
                    {new Date(user.created_at).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {/* VIP Activation Date - Only show if VIP */}
                {isVipOrAdmin && user.vip_purchased_at && (
                  <div className="w-full p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs text-yellow-400 font-semibold">Premium activé le</span>
                    </div>
                    <span className="text-sm font-mono text-yellow-300">
                      {new Date(user.vip_purchased_at).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* VIP Section */}
            {!isVipOrAdmin ? (
              /* Show VIP upgrade options for non-VIP users */
              <div className="glass-card border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-transparent to-yellow-500/5 rounded-2xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center flex-shrink-0">
                    <Crown className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">VIP Premium</h3>
                    <p className="text-xs text-muted-foreground">Aucune publicité</p>
                  </div>
                </div>

                {!showVipKeyInput ? (
                  <div className="space-y-3">
                    <a
                      href="https://ko-fi.com/wavewatch"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold text-sm transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/30"
                    >
                      Acheter VIP
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => setShowVipKeyInput(true)}
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-border/50 text-foreground font-semibold text-sm transition-all"
                    >
                      <Key className="w-4 h-4" />
                      J'ai un code VIP
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vipSuccess ? (
                      <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
                        <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <p className="text-green-400 font-semibold">VIP activé avec succès !</p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <input
                            type="text"
                            value={vipKey}
                            onChange={(e) => setVipKey(e.target.value)}
                            placeholder="Entrez votre clé VIP"
                            className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                            disabled={redeemingVip}
                          />
                        </div>

                        {vipError && (
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                            <p className="text-red-400 text-xs text-center">{vipError}</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setShowVipKeyInput(false)
                              setVipKey('')
                              setVipError(null)
                            }}
                            className="flex items-center justify-center gap-2 flex-1 px-4 py-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-border/50 text-foreground font-semibold text-sm transition-all"
                            disabled={redeemingVip}
                          >
                            <X className="w-4 h-4" />
                            Annuler
                          </button>

                          <button
                            onClick={handleRedeemVipKey}
                            className="flex items-center justify-center gap-2 flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold text-sm transition-all"
                            disabled={redeemingVip || !vipKey.trim()}
                          >
                            {redeemingVip ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Activation...
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                Activer
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Show gift option for VIP/Admin users */
              <div className="glass-card border border-primary/30 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 rounded-2xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center flex-shrink-0">
                    <Crown className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">Offrir le VIP</h3>
                    <p className="text-xs text-muted-foreground">Partagez l'expérience premium avec vos amis</p>
                  </div>
                </div>

                <a
                  href="https://ko-fi.com/wavewatch"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary/80 hover:to-accent/80 text-white font-bold text-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/30"
                >
                  Acheter une clé VIP pour un ami
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}

            {/* VIP Active Badge */}
            {isVipOrAdmin && (
              <div className="glass-card border border-green-500/30 bg-gradient-to-br from-green-500/10 via-transparent to-green-500/5 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {user.role === 'admin' ? 'Administrateur' : 'VIP Premium Actif'}
                    </h3>
                    <p className="text-sm text-green-400">
                      {user.role === 'admin' ? 'Accès complet à toutes les fonctionnalités' : 'Merci pour votre soutien !'}
                    </p>
                    {user.vip_purchased_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Depuis le {new Date(user.vip_purchased_at).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Favorites & History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Favorites Section */}
            <div className="glass-card border border-border/50 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Mes Favoris</h3>
                  <p className="text-xs text-muted-foreground">Vos chaînes préférées</p>
                </div>
              </div>

              {loadingFavorites ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Chargement...</p>
                </div>
              ) : favorites.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {favorites.map((fav) => {
                    // Extract country from channel_id (e.g., "TF1.fr" -> "fr")
                    const country = fav.channel_id.split('.').pop()?.toLowerCase() || 'fr'
                    return (
                      <Link
                        key={fav.id}
                        href={`/channels/${country}?channel=${encodeURIComponent(fav.channel_id)}`}
                        className="group p-4 rounded-xl bg-slate-800/50 border border-border/30 hover:border-primary/50 hover:bg-slate-800 transition-all"
                      >
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-3 bg-slate-900">
                          {fav.channels.logo && (
                            <Image
                              src={fav.channels.logo}
                              alt={fav.channels.name}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-foreground truncate mb-1">{fav.channels.name}</h4>
                        <p className="text-xs text-muted-foreground truncate">{fav.channels.category}</p>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucun favori pour le moment</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Ajoutez vos chaînes préférées en cliquant sur le cœur</p>
                </div>
              )}
            </div>

            {/* History Section */}
            <div className="glass-card border border-border/50 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Historique</h3>
                  <p className="text-xs text-muted-foreground">Chaînes récemment regardées</p>
                </div>
              </div>

              {loadingHistory ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Chargement...</p>
                </div>
              ) : history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((view) => (
                    <div
                      key={view.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-border/30 hover:border-primary/50 hover:bg-slate-800 transition-all"
                    >
                      <div className="w-12 h-12 rounded-lg bg-slate-900 border border-border/30 flex items-center justify-center flex-shrink-0">
                        <Tv className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground truncate mb-1">{view.channel_name}</h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{new Date(view.viewed_at).toLocaleDateString('fr-FR')}</span>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                          <span>{formatDuration(view.duration_seconds)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucun historique</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Commencez à regarder des chaînes</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
