"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Heart, MessageCircle, Calendar } from "lucide-react"

interface Post {
  id: string
  content: string
  image_url: string | null
  category: string
  like_count: number
  comment_count: number
  created_at: string
  profiles: {
    username: string
    first_name: string
    last_name: string
    avatar_url: string | null
  }
}

interface UserPostsProps {
  userId: string
  canViewPosts: boolean
}

export function UserPosts({ userId, canViewPosts }: UserPostsProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!canViewPosts) {
      setIsLoading(false)
      return
    }

    const fetchPosts = async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("posts")
        .select(`
          id,
          content,
          image_url,
          category,
          like_count,
          comment_count,
          created_at,
          profiles (
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq("author_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching posts:", error)
      } else {
        setPosts(data || [])
      }
      setIsLoading(false)
    }

    fetchPosts()
  }, [userId, canViewPosts])

  if (!canViewPosts) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-600">This user's posts are private.</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-600">No posts yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Posts</h2>
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={post.profiles.avatar_url || ""} alt={post.profiles.username} />
                  <AvatarFallback>
                    {post.profiles.first_name?.[0]}
                    {post.profiles.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {post.profiles.first_name} {post.profiles.last_name}
                    </span>
                    <span className="text-gray-500">@{post.profiles.username}</span>
                    {post.category !== "general" && (
                      <Badge variant="secondary" className="text-xs">
                        {post.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
                {post.image_url && (
                  <img
                    src={post.image_url || "/placeholder.svg"}
                    alt="Post image"
                    className="mt-3 rounded-lg max-w-full h-auto"
                  />
                )}
              </div>

              <div className="flex items-center gap-6 text-gray-500">
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  <span className="text-sm">{post.like_count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">{post.comment_count}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
