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
    const emptyResult = { data: null, error: null }
    const emptyArrayResult = { data: [], error: null }
    const createQueryBuilder = (): any => {
      const builder: any = {
        select: () => builder,
        insert: async () => emptyResult,
        update: () => builder,
        upsert: async () => emptyResult,
        delete: () => builder,
        eq: () => builder,
        neq: () => builder,
        in: () => builder,
        is: () => builder,
        gt: () => builder,
        lt: () => builder,
        gte: () => builder,
        lte: () => builder,
        like: () => builder,
        ilike: () => builder,
        order: () => builder,
        limit: () => builder,
        range: () => builder,
        match: () => builder,
        not: () => builder,
        or: () => builder,
        filter: () => builder,
        single: async () => emptyResult,
        maybeSingle: async () => emptyResult,
        then: (resolve: any) => resolve(emptyArrayResult),
      }
      return builder
    }
    const mockClient = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: "Supabase not configured" } }),
        signUp: async () => ({ data: { user: null, session: null }, error: { message: "Supabase not configured" } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        resetPasswordForEmail: async () => emptyResult,
      },
      from: () => createQueryBuilder(),
      rpc: async () => emptyResult,
    } as any
    supabaseInstance = mockClient
    return supabaseInstance
  }

  supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return supabaseInstance
}
