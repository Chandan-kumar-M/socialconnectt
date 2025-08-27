import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  console.log("[v0] Supabase URL:", url)
  console.log("[v0] Supabase Key exists:", !!key)

  if (!url || !key) {
    console.error("[v0] Missing Supabase environment variables!")
    throw new Error("Missing Supabase environment variables")
  }

  return createBrowserClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

export { createBrowserClient }
