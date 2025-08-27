"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { UserPlus, UserMinus } from "lucide-react"

interface FollowButtonProps {
  targetUserId: string
  initialIsFollowing: boolean
  username: string
}

export function FollowButton({ targetUserId, initialIsFollowing, username }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isLoading, setIsLoading] = useState(false)

  const handleFollow = async () => {
    setIsLoading(true)
    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId)

        if (error) throw error
        setIsFollowing(false)
      } else {
        // Follow
        const { error } = await supabase.from("follows").insert({
          follower_id: user.id,
          following_id: targetUserId,
        })

        if (error) throw error
        setIsFollowing(true)

        const { data: currentProfile } = await supabase
  .from("profiles")
  .select("username")
  .eq("id", user.id)
  .single()



        // Create notification
        await supabase.from("notifications").insert({
          recipient_id: targetUserId,
          sender_id: user.id,
          notification_type: "follow",
          message: `@${currentProfile?.username || "someone"} started following you`,
        })
      }
    } catch (error) {
      console.error("Follow error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleFollow}
      disabled={isLoading}
      variant={isFollowing ? "outline" : "default"}
      className={isFollowing ? "" : "bg-blue-600 hover:bg-blue-700"}
    >
      {isLoading ? (
        "Loading..."
      ) : isFollowing ? (
        <>
          <UserMinus className="w-4 h-4 mr-2" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4 mr-2" />
          Follow
        </>
      )}
    </Button>
  )
}
