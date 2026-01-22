'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Crown, Mail, User, Calendar, Copy, Check, Zap, ExternalLink } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_vip: boolean
  vip_purchased_at: string | null
  is_admin: boolean
  created_at: string
}

export default function UserDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedEmail, setCopiedEmail] = useState(false)

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedEmail(true)
    setTimeout(() => setCopiedEmail(false), 2000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

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
        <div className="max-w-screen-lg mx-auto p-3 md:p-5 flex items-center justify-between">
          <Link
            href="/"
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl glass-card border border-border/50 flex items-center justify-center hover:border-primary/50 hover:scale-105 transition-all"
          >
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-foreground" />
          </Link>

          <button
            onClick={handleLogout}
            className="px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-screen-lg mx-auto p-3 md:p-6 lg:p-10">
        {/* Profile Card */}
        <div className="mb-6 md:mb-8">
          <div className="glass-card border border-border/50 rounded-2xl p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border-2 border-primary/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url || "/placeholder.svg"}
                      alt={user.full_name || 'Avatar'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                  )}
                </div>

                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                    {user.full_name || 'Utilisateur'}
                  </h1>
                  {user.is_vip && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 w-fit">
                      <Crown className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs md:text-sm font-bold text-yellow-400">VIP Premium</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* User Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground font-semibold">Email</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm md:text-base font-mono text-foreground">{user.email}</span>
                  <button
                    onClick={() => copyToClipboard(user.email)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
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
              <div className="p-4 rounded-xl bg-slate-800/50 border border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground font-semibold">Membre depuis</span>
                </div>
                <span className="text-sm md:text-base font-mono text-foreground">
                  {new Date(user.created_at).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>

              {/* VIP Status */}
              {user.is_vip && user.vip_purchased_at && (
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-yellow-400 font-semibold">VIP Depuis</span>
                  </div>
                  <span className="text-sm md:text-base font-mono text-yellow-400">
                    {new Date(user.vip_purchased_at).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}

              {/* Admin Badge */}
              {user.is_admin && (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-blue-400 font-semibold">Rôle</span>
                  </div>
                  <span className="text-sm md:text-base font-mono text-blue-400">Administrateur</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* VIP Section */}
        {!user.is_vip && (
          <div className="mb-6 md:mb-8">
            <div className="glass-card border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-transparent to-yellow-500/5 rounded-2xl p-4 md:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Passer à VIP Premium</h2>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Débloquez des fonctionnalités premium illimitées et aucune limite de publicité
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                  'Aucune limite de chaînes',
                  'Aucune publicité',
                  'Support prioritaire',
                ].map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    <span className="text-xs md:text-sm text-foreground font-medium">{benefit}</span>
                  </div>
                ))}
              </div>

              <a
                href="ko-fi.com/wavewatch"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold text-sm md:text-base transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/30"
              >
                Acheter VIP Premium
                <ExternalLink className="w-4 h-4 md:w-5 md:h-5" />
              </a>

              <p className="text-xs text-muted-foreground mt-4">
                Vous serez redirigé vers Ko-fi pour effectuer le paiement. Une fois le paiement confirmé, votre compte sera automatiquement mis à jour.
              </p>
            </div>
          </div>
        )}

        {/* VIP Benefits Info */}
        {user.is_vip && (
          <div className="glass-card border border-green-500/30 bg-gradient-to-br from-green-500/10 via-transparent to-green-500/5 rounded-2xl p-4 md:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center flex-shrink-0">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">VIP Premium Activé ✓</h3>
                <p className="text-sm text-green-400">Merci pour votre soutien ! Vous bénéficiez maintenant de toutes les fonctionnalités VIP.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
