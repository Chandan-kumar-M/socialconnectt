"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, Heart, UserPlus, MessageCircle, CheckCheck } from "lucide-react"
import Link from "next/link"

interface Notification {
  id: string
  notification_type: string
  message: string
  is_read: boolean
  created_at: string
  post_id: string | null
  sender: {
    username: string
    first_name: string
    last_name: string
    avatar_url: string | null
  }
}

interface NotificationsListProps {
  userId: string
}

export function NotificationsList({ userId }: NotificationsListProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    fetchNotifications()
    setupRealtimeSubscription()
  }, [userId])

  const fetchNotifications = async (pageNum = 0, append = false) => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("notifications")
      .select(`
        id,
        notification_type,
        message,
        is_read,
        created_at,
        post_id,
        sender:profiles!notifications_sender_id_fkey (
          username,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .range(pageNum * 20, (pageNum + 1) * 20 - 1)

    if (error) {
      console.error("Error fetching notifications:", error)
    } else {
      const newNotifications = data || []
      if (append) {
        setNotifications((prev) => [...prev, ...newNotifications])
      } else {
        setNotifications(newNotifications)
      }
      setHasMore(newNotifications.length === 20)
    }
    setIsLoading(false)
  }

  const setupRealtimeSubscription = () => {
    const supabase = createClient()

    const channel = supabase
      .channel("notifications-page")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          // Fetch the complete notification with sender info
          const { data } = await supabase
            .from("notifications")
            .select(`
              id,
              notification_type,
              message,
              is_read,
              created_at,
              post_id,
              sender:profiles!notifications_sender_id_fkey (
                username,
                first_name,
                last_name,
                avatar_url
              )
            `)
            .eq("id", payload.new.id)
            .single()

          if (data) {
            setNotifications((prev) => [data, ...prev])
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const markAsRead = async (notificationId: string) => {
    const supabase = createClient()

    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId)

    if (!error) {
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)))
    }
  }

  const markAllAsRead = async () => {
    const supabase = createClient()

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", userId)
      .eq("is_read", false)

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    }
  }

  const loadMore = async () => {
    const nextPage = page + 1
    setPage(nextPage)
    await fetchNotifications(nextPage, true)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "follow":
        return <UserPlus className="w-5 h-5 text-blue-500" />
      case "like":
        return <Heart className="w-5 h-5 text-red-500" />
      case "comment":
        return <MessageCircle className="w-5 h-5 text-green-500" />
      default:
        return <Bell className="w-5 h-5 text-gray-500" />
    }
  }

  const getNotificationLink = (notification: Notification) => {
    if (notification.post_id) {
      return `/post/${notification.post_id}`
    }
    return `/profile/${notification.sender.username}`
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="space-y-6">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">{unreadCount} unread notifications</p>
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark all as read
          </Button>
        </div>
      )}

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No notifications yet</h2>
            <p className="text-gray-600">
              When someone follows you, likes your posts, or comments, you'll see it here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  !notification.is_read ? "ring-2 ring-blue-100 bg-blue-50" : ""
                }`}
                onClick={() => {
                  if (!notification.is_read) {
                    markAsRead(notification.id)
                  }
                }}
              >
                <CardContent className="p-6">
                  <Link href={getNotificationLink(notification)} className="block">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={notification.sender.avatar_url || ""} alt={notification.sender.username} />
                        <AvatarFallback>
                          {notification.sender.first_name?.[0]}
                          {notification.sender.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          {getNotificationIcon(notification.notification_type)}
                          <span className="font-semibold text-gray-900">
                            {notification.sender.first_name} {notification.sender.last_name}
                          </span>
                          <span className="text-gray-500">@{notification.sender.username}</span>
                          {!notification.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                        </div>
                        <p className="text-gray-700 mb-2">{notification.message}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(notification.created_at).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {hasMore && (
            <div className="text-center">
              <Button onClick={loadMore} variant="outline" className="bg-transparent">
                Load More Notifications
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
