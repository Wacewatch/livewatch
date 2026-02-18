'use client'

import React from "react"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

type AuthMode = 'login' | 'signup'

export function AuthForm() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      setSuccess('Connexion réussie ! Redirection...')
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 500)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la connexion')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      setLoading(false)
      return
    }

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
        },
      })

      if (signUpError) throw signUpError

      if (!signUpData.user) {
        setError('Erreur lors de la création du compte')
        return
      }

      // Créer le profil utilisateur
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: signUpData.user.id,
          email,
          role: 'member',
          is_vip: false,
        })

      if (profileError) throw profileError

      setSuccess('Compte créé avec succès ! Veuillez vérifier votre email pour confirmer.')
      setTimeout(() => {
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setMode('login')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = mode === 'login' ? handleLogin : handleSignup

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 bg-slate-800/50 rounded-lg border border-border/30">
        <button
          type="button"
          onClick={() => {
            setMode('login')
            setError(null)
            setSuccess(null)
          }}
          className={`flex-1 py-2 px-3 rounded-md font-semibold text-sm transition-all ${
            mode === 'login'
              ? 'bg-primary text-black'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Connexion
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup')
            setError(null)
            setSuccess(null)
          }}
          className={`flex-1 py-2 px-3 rounded-md font-semibold text-sm transition-all ${
            mode === 'signup'
              ? 'bg-primary text-black'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          S'inscrire
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert className="border-green-500/30 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-400">{success}</AlertDescription>
        </Alert>
      )}

      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="vous@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
          className="bg-slate-800/50 border-border/30 focus:border-primary"
        />
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">
          Mot de passe
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
          className="bg-slate-800/50 border-border/30 focus:border-primary"
        />
      </div>

      {/* Confirm Password Field (Signup Only) */}
      {mode === 'signup' && (
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirmer le mot de passe
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
            className="bg-slate-800/50 border-border/30 focus:border-primary"
          />
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-primary/90 text-black font-bold text-base h-10"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {mode === 'login' ? 'Connexion...' : 'Création...'}
          </>
        ) : (
          mode === 'login' ? 'Se connecter' : 'Créer un compte'
        )}
      </Button>

      {/* Helper Text */}
      <p className="text-xs text-center text-muted-foreground">
        {mode === 'login'
          ? 'Pas de compte ? Cliquez sur "S\'inscrire" ci-dessus'
          : 'Vous avez déjà un compte ? Cliquez sur "Connexion" ci-dessus'}
      </p>
    </form>
  )
}
