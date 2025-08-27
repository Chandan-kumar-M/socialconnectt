import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const page = Number.parseInt(searchParams.get("page") || "0")
  const limit = Number.parseInt(searchParams.get("limit") || "20")

  try {
    // Get users that current user follows + own posts
    const { data: followingData } = await supabase.from("follows").select("following_id").eq("follower_id", user.id)

    const followingIds = followingData?.map((f) => f.following_id) || []
    const authorIds = [...followingIds, user.id] // Include own posts

    if (authorIds.length === 0) {
      return NextResponse.json({ posts: [], hasMore: false })
    }

    const { data: posts, error } = await supabase
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
      .range(page * limit, (page + 1) * limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get user's liked posts
    const { data: likes } = await supabase.from("likes").select("post_id").eq("user_id", user.id)

    const likedPostIds = new Set(likes?.map((like) => like.post_id) || [])

    const postsWithLikeStatus = posts?.map((post) => ({
      ...post,
      isLiked: likedPostIds.has(post.id),
    }))

    return NextResponse.json({
      posts: postsWithLikeStatus || [],
      hasMore: (posts?.length || 0) === limit,
    })
  } catch (error) {
    console.error("Feed API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
