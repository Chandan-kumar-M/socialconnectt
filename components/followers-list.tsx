"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { FollowButton } from "@/components/follow-button"

interface Follower {
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

interface FollowersListProps {
  profileId: string
  currentUserId: string
}

export function FollowersList({ profileId, currentUserId }: FollowersListProps) {
  const [followers, setFollowers] = useState<Follower[]>([])
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchFollowers = async () => {
      const supabase = createClient()

      // Get followers
      const { data: followersData, error } = await supabase
        .from("follows")
        .select(`
          follower_id,
          profiles!follows_follower_id_fkey (
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
        .eq("following_id", profileId)

      if (error) {
        console.error("Error fetching followers:", error)
      } else {
        const followersList = followersData?.map((f) => f.profiles).filter(Boolean) || []
        setFollowers(followersList as Follower[])
      }

      // Get users that current user follows
      const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", currentUserId)

      if (follows) {
        setFollowingUsers(new Set(follows.map((f) => f.following_id)))
      }

      setIsLoading(false)
    }

    fetchFollowers()
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

  if (followers.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-600">No followers yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {followers.map((follower) => (
        <Card key={follower.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href={`/profile/${follower.username}`}>
                  <Avatar className="w-12 h-12 cursor-pointer">
                    <AvatarImage src={follower.avatar_url || ""} alt={follower.username} />
                    <AvatarFallback>
                      {follower.first_name?.[0]}
                      {follower.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/profile/${follower.username}`}
                      className="font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {follower.first_name} {follower.last_name}
                    </Link>
                    <span className="text-gray-500">@{follower.username}</span>
                    {follower.role === "admin" && <Badge variant="secondary">Admin</Badge>}
                  </div>
                  {follower.bio && <p className="text-gray-600 text-sm mt-1">{follower.bio}</p>}
                  <div className="flex gap-4 text-sm text-gray-500 mt-2">
                    <span>{follower.posts_count} posts</span>
                    <span>{follower.followers_count} followers</span>
                    <span>{follower.following_count} following</span>
                  </div>
                </div>
              </div>
              {follower.id !== currentUserId && (
                <FollowButton
                  targetUserId={follower.id}
                  initialIsFollowing={followingUsers.has(follower.id)}
                  username={follower.username}
                />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
