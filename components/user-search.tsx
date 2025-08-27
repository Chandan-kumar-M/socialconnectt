"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"
import Link from "next/link"
import { FollowButton } from "@/components/follow-button"

interface User {
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
  privacy_setting: string
}

export function UserSearch() {
  const [searchTerm, setSearchTerm] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)

        // Get users that current user follows
        const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id)

        if (follows) {
          setFollowingUsers(new Set(follows.map((f) => f.following_id)))
        }
      }
    }
    getCurrentUser()
  }, [])

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchTerm.trim()) {
        setUsers([])
        return
      }

      setIsLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
        .eq("privacy_setting", "public")
        .neq("id", currentUserId)
        .limit(20)

      if (error) {
        console.error("Search error:", error)
      } else {
        setUsers(data || [])
      }
      setIsLoading(false)
    }

    const debounceTimer = setTimeout(searchUsers, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchTerm, currentUserId])

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Search for users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12"
        />
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
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
      )}

      {!isLoading && users.length === 0 && searchTerm && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">No users found matching "{searchTerm}"</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {users.map((user) => (
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
                <FollowButton
                  targetUserId={user.id}
                  initialIsFollowing={followingUsers.has(user.id)}
                  username={user.username}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
