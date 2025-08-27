import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, LinkIcon, Calendar, Settings } from "lucide-react"
import Link from "next/link"
import { FollowButton } from "@/components/follow-button"
import { UserPosts } from "@/components/user-posts"

interface ProfilePageProps {
  params: {
    username: string
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
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

  // Check if current user follows this profile
  const { data: followData } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", currentUser.id)
    .eq("following_id", profile.id)
    .single()

  const isFollowing = !!followData
  const isOwnProfile = currentUser.id === profile.id

  // Check privacy settings
  const canViewProfile =
    profile.privacy_setting === "public" ||
    isOwnProfile ||
    (profile.privacy_setting === "followers_only" && isFollowing)

  if (!canViewProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Private Profile</h1>
            <p className="text-gray-600 mb-4">This profile is private. Follow to see their posts.</p>
            {!isFollowing && !isOwnProfile && (
              <FollowButton targetUserId={profile.id} initialIsFollowing={false} username={profile.username} />
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <Avatar className="w-32 h-32">
                <AvatarImage src={profile.avatar_url || ""} alt={profile.username} />
                <AvatarFallback className="text-2xl">
                  {profile.first_name?.[0]}
                  {profile.last_name?.[0]}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      {profile.first_name} {profile.last_name}
                    </h1>
                    <p className="text-xl text-gray-600">@{profile.username}</p>
                    {profile.role === "admin" && (
                      <Badge variant="secondary" className="mt-2">
                        Admin
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 sm:mt-0">
                    {isOwnProfile ? (
                      <Button asChild variant="outline">
                        <Link href="/profile/edit">
                          <Settings className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Link>
                      </Button>
                    ) : (
                      <FollowButton
                        targetUserId={profile.id}
                        initialIsFollowing={isFollowing}
                        username={profile.username}
                      />
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-6 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{profile.posts_count}</div>
                    <div className="text-sm text-gray-600">Posts</div>
                  </div>
                  <Link
                    href={`/profile/${profile.username}/followers`}
                    className="text-center hover:bg-gray-50 p-2 rounded"
                  >
                    <div className="text-2xl font-bold text-gray-900">{profile.followers_count}</div>
                    <div className="text-sm text-gray-600">Followers</div>
                  </Link>
                  <Link
                    href={`/profile/${profile.username}/following`}
                    className="text-center hover:bg-gray-50 p-2 rounded"
                  >
                    <div className="text-2xl font-bold text-gray-900">{profile.following_count}</div>
                    <div className="text-sm text-gray-600">Following</div>
                  </Link>
                </div>

                {/* Bio and Details */}
                {profile.bio && <p className="text-gray-700 mb-4">{profile.bio}</p>}

                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {profile.location}
                    </div>
                  )}
                  {profile.website && (
                    <div className="flex items-center gap-1">
                      <LinkIcon className="w-4 h-4" />
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {profile.website}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Joined{" "}
                    {new Date(profile.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Posts */}
        <UserPosts userId={profile.id} canViewPosts={canViewProfile} />
      </div>
    </div>
  )
}
