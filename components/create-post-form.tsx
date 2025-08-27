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

interface Profile {
  id: string
  username: string
  first_name: string
  last_name: string
  avatar_url: string | null
}

interface CreatePostFormProps {
  profile: Profile
}

export function CreatePostForm({ profile }: CreatePostFormProps) {
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("general")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
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
      setError(null)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const supabase = createClient()
    const fileExt = file.name.split(".").pop()
    const fileName = `${profile.id}-${Date.now()}.${fileExt}`

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
      let image_url = null

      // Upload image if selected
      if (imageFile) {
        image_url = await uploadImage(imageFile)
        if (!image_url) {
          throw new Error("Failed to upload image")
        }
      }

      const { error } = await supabase.from("posts").insert({
        content: content.trim(),
        author_id: profile.id,
        category,
        image_url,
      })

      if (error) throw error

      router.push("/feed")
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
            <AvatarImage src={profile.avatar_url || ""} alt={profile.username} />
            <AvatarFallback>
              {profile.first_name?.[0]}
              {profile.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold">
              {profile.first_name} {profile.last_name}
            </div>
            <div className="text-sm text-gray-500">@{profile.username}</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">What's on your mind?</Label>
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
            <Label>Image (optional)</Label>
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
              {isLoading ? "Posting..." : "Post"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/feed")}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
