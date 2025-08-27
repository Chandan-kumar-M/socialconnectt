"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Trash2, Calendar } from "lucide-react"
import Link from "next/link"

interface Comment {
  id: string
  content: string
  created_at: string
  author_id: string
  profiles: {
    username: string
    first_name: string
    last_name: string
    avatar_url: string | null
  }
}

interface CommentSectionProps {
  postId: string
  currentUserId: string
}

export function CommentSection({ postId, currentUserId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [postId])

  const fetchComments = async () => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("comments")
      .select(`
        id,
        content,
        created_at,
        author_id,
        profiles (
          username,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq("post_id", postId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching comments:", error)
    } else {
      setComments(data || [])
    }
    setIsLoading(false)
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newComment.trim()) return

    setIsSubmitting(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          content: newComment.trim(),
          author_id: currentUserId,
          post_id: postId,
        })
        .select(`
          id,
          content,
          created_at,
          author_id,
          profiles (
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      setComments((prev) => [...prev, data])
      setNewComment("")

      const { data: postData } = await supabase.from("posts").select("author_id").eq("id", postId).single()

      if (postData && postData.author_id !== currentUserId) {
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", currentUserId)
          .single()

        await supabase.from("notifications").insert({
          recipient_id: postData.author_id,
          sender_id: currentUserId,
          notification_type: "comment",
          post_id: postId,
          message: `@${currentProfile?.username || "someone"} commented on your post`,
        })
      }
    } catch (error) {
      console.error("Comment error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    const supabase = createClient()

    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId)

      if (error) throw error

      setComments((prev) => prev.filter((comment) => comment.id !== commentId))
    } catch (error) {
      console.error("Delete comment error:", error)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comments ({comments.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Comment Form */}
        <form onSubmit={handleSubmitComment} className="space-y-4">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            maxLength={200}
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">{newComment.length}/200 characters</span>
            <Button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Posting..." : "Comment"}
            </Button>
          </div>
        </form>

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No comments yet. Be the first to comment!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Link href={`/profile/${comment.profiles.username}`}>
                  <Avatar className="w-8 h-8 cursor-pointer">
                    <AvatarImage src={comment.profiles.avatar_url || ""} alt={comment.profiles.username} />
                    <AvatarFallback className="text-xs">
                      {comment.profiles.first_name?.[0]}
                      {comment.profiles.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/profile/${comment.profiles.username}`}
                        className="font-semibold text-sm text-gray-900 hover:text-blue-600"
                      >
                        {comment.profiles.first_name} {comment.profiles.last_name}
                      </Link>
                      <span className="text-xs text-gray-500">@{comment.profiles.username}</span>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(comment.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {comment.author_id === currentUserId && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDeleteComment(comment.id)} className="text-red-600">
                            <Trash2 className="w-3 h-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 mt-1">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
