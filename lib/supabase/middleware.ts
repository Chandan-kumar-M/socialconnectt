import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  console.log("[v0] Middleware processing:", request.nextUrl.pathname)

  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error("[v0] Missing Supabase environment variables in middleware")
    // Allow access to auth pages when Supabase is not configured
    if (request.nextUrl.pathname.startsWith("/auth")) {
      return supabaseResponse
    }
    // Redirect to auth/login for other pages
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/auth/login"
    return NextResponse.redirect(redirectUrl)
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  let user = null
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    user = authUser
  } catch (error) {
    console.error("[v0] Supabase auth error:", error)
    // When Supabase is unreachable, allow access to auth pages but redirect others to login
    if (request.nextUrl.pathname.startsWith("/auth")) {
      return supabaseResponse
    }
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/auth/login"
    console.log("[v0] Redirecting due to auth error from:", request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  console.log("[v0] User exists:", !!user, "Path:", request.nextUrl.pathname)

  if (!user && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    console.log("[v0] Redirecting root to login")
    return NextResponse.redirect(url)
  }

  if (!user && !request.nextUrl.pathname.startsWith("/auth") && request.nextUrl.pathname !== "/") {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    console.log("[v0] Redirecting to login from:", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (user && request.nextUrl.pathname.startsWith("/auth")) {
    const url = request.nextUrl.clone()
    url.pathname = "/feed"
    console.log("[v0] Redirecting authenticated user to feed")
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
