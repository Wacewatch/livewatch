import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminPanel } from "@/components/admin-panel"

export default async function AdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">You do not have admin privileges.</p>
        </div>
      </div>
    )
  }

  return <AdminPanel />
}
