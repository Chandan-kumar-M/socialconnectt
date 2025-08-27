import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { PostCard } from "@/components/post-card"
import { CommentSection } from "@/components/comment-section"

interface PostPageProps {
  params: {
    id: string
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  const { data: post, error } = await supabase
    .from("posts")
    .select(`
      *,
      profiles (
        username,
        first_name,
        last_name,
        avatar_url
      )
    `)
    .eq("id", params.id)
    .eq("is_active", true)
    .single()

  if (error || !post) {
    notFound()
  }

  // Check if user liked this post
  const { data: likeData } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", post.id)
    .single()

  const isLiked = !!likeData

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <PostCard post={post} currentUserId={user.id} initialIsLiked={isLiked} />
        <div className="mt-8">
          <CommentSection postId={post.id} currentUserId={user.id} />
        </div>
      </div>
    </div>
  )
}
