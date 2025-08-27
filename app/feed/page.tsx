import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PersonalizedFeed } from "@/components/personalized-feed"
import { Navigation } from "@/components/navigation"

export default async function FeedPage() {
  console.log("[v0] Feed page: Starting authentication check")

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  console.log("[v0] Feed page: User check result", { user: !!user, error: userError })

  if (!user) {
    console.log("[v0] Feed page: No user found, redirecting to login")
    redirect("/auth/login")
  }

  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  console.log("[v0] Feed page: Profile check result", { profile: !!profile, error: profileError })

  if (!profile && !profileError) {
    console.log("[v0] Feed page: Creating missing profile")
    const { data: newProfile } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        username: user.email?.split("@")[0] || "user",
        email: user.email,
        full_name: user.user_metadata?.full_name || "",
      })
      .select()
      .single()

    if (newProfile) {
      console.log("[v0] Feed page: Profile created successfully")
      return (
        <div className="min-h-screen bg-gray-50">
          <Navigation profile={newProfile} />
          <div className="max-w-2xl mx-auto py-8 px-4">
            <PersonalizedFeed userId={user.id} />
          </div>
        </div>
      )
    }
  }

  if (!profile) {
    console.log("[v0] Feed page: Profile error, redirecting to login")
    redirect("/auth/login")
  }

  console.log("[v0] Feed page: Authentication successful, rendering feed")

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation profile={profile} />
      <div className="max-w-2xl mx-auto py-8 px-4">
        <PersonalizedFeed userId={user.id} />
      </div>
    </div>
  )
}
