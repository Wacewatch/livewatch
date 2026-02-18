import { createBrowserClient } from "@supabase/ssr"

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[v0] Supabase env vars not available, returning mock client")
    const mockClient = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: "Supabase not configured" } }),
        signUp: async () => ({ data: { user: null, session: null }, error: { message: "Supabase not configured" } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }), order: () => ({ limit: async () => ({ data: [], error: null }) }) }), in: () => ({ data: [], error: null }), order: () => ({ limit: async () => ({ data: [], error: null }) }) }),
        insert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
      }),
    } as any
    supabaseInstance = mockClient
    return supabaseInstance
  }

  supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)

  return supabaseInstance
}
