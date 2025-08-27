import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { FollowingList } from "@/components/following-list"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FollowingPageProps {
  params: {
    username: string
  }
}

export default async function FollowingPage({ params }: FollowingPageProps) {
  const supabase = await createClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()
  if (!currentUser) {
    redirect("/auth/login")
  }

  // Get profile by username
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("username", params.username).single()

  if (error || !profile) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/profile/${params.username}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">{profile.first_name} is Following</h1>
        </div>
        <FollowingList profileId={profile.id} currentUserId={currentUser.id} />
      </div>
    </div>
  )
}
