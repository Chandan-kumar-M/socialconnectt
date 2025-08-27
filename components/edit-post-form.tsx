"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ImageIcon, X } from "lucide-react"

interface Post {
  id: string
  content: string
  category: string
  image_url: string | null
  author_id: string
  profiles: {
    username: string
    first_name: string
    last_name: string
    avatar_url: string | null
  }
}

interface EditPostFormProps {
  post: Post
}

export function EditPostForm({ post }: EditPostFormProps) {
  const [content, setContent] = useState(post.content)
  const [category, setCategory] = useState(post.category)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(post.image_url)
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        // 2MB limit
        setError("Image file size must be less than 2MB")
        return
      }
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        setError("Image must be a JPEG or PNG file")
        return
      }
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setRemoveCurrentImage(false)
      setError(null)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    if (imagePreview && imagePreview !== post.image_url) {
      URL.revokeObjectURL(imagePreview)
    }
    setImagePreview(null)
    setRemoveCurrentImage(true)
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const supabase = createClient()
    const fileExt = file.name.split(".").pop()
    const fileName = `${post.author_id}-${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage.from("post-images").upload(fileName, file)

    if (error) {
      console.error("Image upload error:", error)
      return null
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("post-images").getPublicUrl(fileName)

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      setError("Post content is required")
      return
    }

    if (content.length > 280) {
      setError("Post content must be 280 characters or less")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      let image_url = post.image_url

      // Handle image changes
      if (imageFile) {
        // Upload new image
        const uploadedUrl = await uploadImage(imageFile)
        if (uploadedUrl) {
          image_url = uploadedUrl
        } else {
          throw new Error("Failed to upload image")
        }
      } else if (removeCurrentImage) {
        // Remove current image
        image_url = null
      }

      const { error } = await supabase
        .from("posts")
        .update({
          content: content.trim(),
          category,
          image_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id)

      if (error) throw error

      router.push(`/post/${post.id}`)
      router.refresh()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.profiles.avatar_url || ""} alt={post.profiles.username} />
            <AvatarFallback>
              {post.profiles.first_name?.[0]}
              {post.profiles.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold">
              {post.profiles.first_name} {post.profiles.last_name}
            </div>
            <div className="text-sm text-gray-500">@{post.profiles.username}</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Edit your post</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts..."
              maxLength={280}
              rows={4}
              className="resize-none"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{content.length}/280 characters</span>
              <span className={content.length > 280 ? "text-red-500" : ""}>{280 - content.length} remaining</span>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="question">Question</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Image</Label>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview || "/placeholder.svg"}
                  alt="Preview"
                  className="w-full max-h-64 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <Label htmlFor="image" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-500">Click to upload an image</span>
                  <input
                    id="image"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </Label>
                <p className="text-xs text-gray-500 mt-1">JPEG or PNG, max 2MB</p>
              </div>
            )}
          </div>

          {error && <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading || !content.trim()} className="bg-blue-600 hover:bg-blue-700">
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push(`/post/${post.id}`)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
