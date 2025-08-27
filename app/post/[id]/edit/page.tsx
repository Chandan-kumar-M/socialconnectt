import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { EditPostForm } from "@/components/edit-post-form"

interface EditPostPageProps {
  params: {
    id: string
  }
}

export default async function EditPostPage({ params }: EditPostPageProps) {
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
    .single()

  if (error || !post) {
    notFound()
  }

  // Check if user owns this post
  if (post.author_id !== user.id) {
    redirect("/feed")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Post</h1>
        <EditPostForm post={post} />
      </div>
    </div>
  )
}
