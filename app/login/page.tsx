import { Metadata } from 'next'
import Link from 'next/link'
import { AuthForm } from '@/components/auth/auth-form'

export const metadata: Metadata = {
  title: 'Connexion | LiveWatch',
  description: 'Connectez-vous à votre compte LiveWatch',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card border border-border/50 rounded-2xl p-6 md:p-8">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">LiveWatch</h1>
            <p className="text-sm md:text-base text-muted-foreground">Gérez votre compte</p>
          </div>

          <AuthForm />

          <div className="mt-6 pt-6 border-t border-border/30 text-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg md:rounded-xl bg-primary/10 border border-primary/30 text-primary font-semibold text-sm md:text-base hover:bg-primary/20 transition-colors"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
