"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { FollowButton } from "@/components/follow-button"

interface Following {
  id: string
  username: string
  first_name: string
  last_name: string
  bio: string | null
  avatar_url: string | null
  followers_count: number
  following_count: number
  posts_count: number
  role: string
}

interface FollowingListProps {
  profileId: string
  currentUserId: string
}

export function FollowingList({ profileId, currentUserId }: FollowingListProps) {
  const [following, setFollowing] = useState<Following[]>([])
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchFollowing = async () => {
      const supabase = createClient()

      // Get following
      const { data: followingData, error } = await supabase
        .from("follows")
        .select(`
          following_id,
          profiles!follows_following_id_fkey (
            id,
            username,
            first_name,
            last_name,
            bio,
            avatar_url,
            followers_count,
            following_count,
            posts_count,
            role
          )
        `)
        .eq("follower_id", profileId)

      if (error) {
        console.error("Error fetching following:", error)
      } else {
        const followingList = followingData?.map((f) => f.profiles).filter(Boolean) || []
        setFollowing(followingList as Following[])
      }

      // Get users that current user follows
      const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", currentUserId)

      if (follows) {
        setFollowingUsers(new Set(follows.map((f) => f.following_id)))
      }

      setIsLoading(false)
    }

    fetchFollowing()
  }, [profileId, currentUserId])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-48"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (following.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-600">Not following anyone yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {following.map((user) => (
        <Card key={user.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href={`/profile/${user.username}`}>
                  <Avatar className="w-12 h-12 cursor-pointer">
                    <AvatarImage src={user.avatar_url || ""} alt={user.username} />
                    <AvatarFallback>
                      {user.first_name?.[0]}
                      {user.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/profile/${user.username}`}
                      className="font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {user.first_name} {user.last_name}
                    </Link>
                    <span className="text-gray-500">@{user.username}</span>
                    {user.role === "admin" && <Badge variant="secondary">Admin</Badge>}
                  </div>
                  {user.bio && <p className="text-gray-600 text-sm mt-1">{user.bio}</p>}
                  <div className="flex gap-4 text-sm text-gray-500 mt-2">
                    <span>{user.posts_count} posts</span>
                    <span>{user.followers_count} followers</span>
                    <span>{user.following_count} following</span>
                  </div>
                </div>
              </div>
              {user.id !== currentUserId && (
                <FollowButton
                  targetUserId={user.id}
                  initialIsFollowing={followingUsers.has(user.id)}
                  username={user.username}
                />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
