"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { PostCard } from "@/components/post-card"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, PlusCircle } from "lucide-react"
import Link from "next/link"

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

interface PersonalizedFeedProps {
  userId: string
}

const POSTS_PER_PAGE = 20

export function PersonalizedFeed({ userId }: PersonalizedFeedProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  useEffect(() => {
    fetchFeed()
    fetchLikedPosts()
  }, [userId])

  const fetchFeed = async (pageNum = 0, append = false) => {
    const supabase = createClient()

    try {
      // Get users that current user follows + own posts
      const { data: followingData } = await supabase.from("follows").select("following_id").eq("follower_id", userId)

      const followingIds = followingData?.map((f) => f.following_id) || []
      const authorIds = [...followingIds, userId] // Include own posts

      if (authorIds.length === 0) {
        setIsLoading(false)
        return
      }

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
          author_id,
          profiles (
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .in("author_id", authorIds)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range(pageNum * POSTS_PER_PAGE, (pageNum + 1) * POSTS_PER_PAGE - 1)

      if (error) {
        console.error("Error fetching feed:", error)
      } else {
        const newPosts = data || []
        if (append) {
          setPosts((prev) => [...prev, ...newPosts])
        } else {
          setPosts(newPosts)
        }
        setHasMore(newPosts.length === POSTS_PER_PAGE)
      }
    } catch (error) {
      console.error("Feed error:", error)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  const fetchLikedPosts = async () => {
    const supabase = createClient()

    const { data, error } = await supabase.from("likes").select("post_id").eq("user_id", userId)

    if (error) {
      console.error("Error fetching liked posts:", error)
    } else {
      setLikedPosts(new Set(data?.map((like) => like.post_id) || []))
    }
  }

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    const nextPage = page + 1
    setPage(nextPage)
    await fetchFeed(nextPage, true)
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    setPage(0)
    await fetchFeed(0, false)
    await fetchLikedPosts()
  }

  const handleLike = (postId: string, isLiked: boolean) => {
    if (isLiked) {
      setLikedPosts((prev) => new Set([...prev, postId]))
    } else {
      setLikedPosts((prev) => {
        const newSet = new Set(prev)
        newSet.delete(postId)
        return newSet
      })
    }
  }

  const handleDelete = (postId: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId))
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Your Feed</h1>
          <div className="animate-pulse w-8 h-8 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Your Feed</h1>
        <Button variant="ghost" size="sm" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <PlusCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to SocialConnect!</h2>
              <p className="text-gray-600 mb-6">
                Your feed is empty. Start by following some users or create your first post to get started.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link href="/create-post">Create Your First Post</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/users">Discover People</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={userId}
                onLike={handleLike}
                onDelete={handleDelete}
                initialIsLiked={likedPosts.has(post.id)}
              />
            ))}
          </div>

          {hasMore && (
            <div className="text-center">
              <Button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                variant="outline"
                className="w-full sm:w-auto bg-transparent"
              >
                {isLoadingMore ? "Loading more posts..." : "Load More Posts"}
              </Button>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">You've reached the end of your feed!</p>
              <Button asChild variant="outline" className="mt-4 bg-transparent">
                <Link href="/users">Discover More People</Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
