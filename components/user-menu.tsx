"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { User, LogOut, LogIn, UserPlus, Shield, Crown, UserCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUserRole } from "@/lib/hooks/use-user-role"
import { VipUpgradeModal } from "@/components/vip-upgrade-modal"

export function UserMenu() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const { role, isAdmin, isVip } = useUserRole()
  const [showVipModal, setShowVipModal] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  const getRoleBadge = () => {
    if (isAdmin) return <Shield className="w-3 h-3 text-red-500" />
    if (isVip) return <Crown className="w-3 h-3 text-amber-500" />
    return <UserCircle className="w-3 h-3 text-blue-500" />
  }

  const getRoleLabel = () => {
    if (isAdmin) return "Admin"
    if (isVip) return "VIP"
    return "Membre"
  }

  if (user) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger className="relative w-14 h-14 rounded-2xl glass-card border border-border/50 hover:border-primary/50 hover:scale-105 transition-all flex items-center justify-center outline-none">
            <User className="w-6 h-6 text-primary" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-background border-2 border-border">
              {getRoleBadge()}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass-card border-border/50">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium leading-none text-foreground">Connecté</p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                    {getRoleBadge()}
                    {getRoleLabel()}
                  </span>
                </div>
                <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push("/dashboard")} className="cursor-pointer">
              <UserCircle className="w-4 h-4 mr-2" />
              Mon Tableau de Bord
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/admin")} className="cursor-pointer">
                  <Shield className="w-4 h-4 mr-2" />
                  Panneau Admin
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-500 hover:text-red-600 cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <VipUpgradeModal isOpen={showVipModal} onClose={() => setShowVipModal(false)} />
      </>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative w-14 h-14 rounded-2xl glass-card border border-border/50 hover:border-primary/50 hover:scale-105 transition-all flex items-center justify-center outline-none">
        <User className="w-6 h-6 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 glass-card border-border/50">
        <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/login")} className="cursor-pointer">
          <LogIn className="w-4 h-4 mr-2" />
          Se connecter
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/login")} className="cursor-pointer">
          <UserPlus className="w-4 h-4 mr-2" />
          Créer un compte
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
