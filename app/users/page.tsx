import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UserSearch } from "@/components/user-search"

export default async function UsersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Discover People</h1>
        <UserSearch />
      </div>
    </div>
  )
}
