"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Heart, MessageCircle, Calendar, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Post {
  id: string
  content: string
  image_url: string | null
  category: string
  like_count: number
  comment_count: number
  created_at: string
  author_id: string
  profiles: {
    username: string
    first_name: string
    last_name: string
    avatar_url: string | null
  }
}

interface PostCardProps {
  post: Post
  currentUserId?: string
  onLike?: (postId: string, isLiked: boolean) => void
  onDelete?: (postId: string) => void
  initialIsLiked?: boolean
}

export function PostCard({ post, currentUserId, onLike, onDelete, initialIsLiked = false }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [isLiking, setIsLiking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const isOwnPost = currentUserId === post.author_id

  const handleLike = async () => {
    if (!currentUserId || isLiking) return

    setIsLiking(true)
    const supabase = createClient()

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase.from("likes").delete().eq("user_id", currentUserId).eq("post_id", post.id)

        if (error) throw error
        setIsLiked(false)
        setLikeCount((prev) => prev - 1)
      } else {
        // Like
        const { error } = await supabase.from("likes").insert({
          user_id: currentUserId,
          post_id: post.id,
        })

        if (error) throw error
        setIsLiked(true)
        setLikeCount((prev) => prev + 1)

        if (!isOwnPost) {
          const { data: currentProfile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", currentUserId)
            .single()

          // Create notification if not own post
          await supabase.from("notifications").insert({
            recipient_id: post.author_id,
            sender_id: currentUserId,
            notification_type: "like",
            post_id: post.id,
            message: `@${currentProfile?.username || "someone"} liked your post`,
          })
        }
      }

      onLike?.(post.id, !isLiked)
    } catch (error) {
      console.error("Like error:", error)
    } finally {
      setIsLiking(false)
    }
  }

  const handleDelete = async () => {
    if (!isOwnPost || isDeleting) return

    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.from("posts").delete().eq("id", post.id)

      if (error) throw error
      onDelete?.(post.id)
    } catch (error) {
      console.error("Delete error:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${post.profiles.username}`}>
              <Avatar className="w-10 h-10 cursor-pointer">
                <AvatarImage src={post.profiles.avatar_url || ""} alt={post.profiles.username} />
                <AvatarFallback>
                  {post.profiles.first_name?.[0]}
                  {post.profiles.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${post.profiles.username}`}
                  className="font-semibold text-gray-900 hover:text-blue-600"
                >
                  {post.profiles.first_name} {post.profiles.last_name}
                </Link>
                <span className="text-gray-500">@{post.profiles.username}</span>
                {post.category !== "general" && (
                  <Badge variant="secondary" className="text-xs">
                    {post.category}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Calendar className="w-3 h-3" />
                {new Date(post.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>

          {isOwnPost && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/post/${post.id}/edit`)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600" disabled={isDeleting}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="mb-4">
          <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
          {post.image_url && (
            <img
              src={post.image_url || "/placeholder.svg"}
              alt="Post image"
              className="mt-3 rounded-lg max-w-full h-auto cursor-pointer"
              onClick={() => window.open(post.image_url!, "_blank")}
            />
          )}
        </div>

        <div className="flex items-center gap-6 text-gray-500">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={!currentUserId || isLiking}
            className={`flex items-center gap-1 ${isLiked ? "text-red-500" : ""}`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            <span className="text-sm">{likeCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/post/${post.id}`)}
            className="flex items-center gap-1"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">{post.comment_count}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
