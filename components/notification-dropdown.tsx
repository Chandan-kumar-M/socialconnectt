"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Bell, Heart, UserPlus, MessageCircle } from "lucide-react"
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

interface NotificationDropdownProps {
  userId: string
}

export function NotificationDropdown({ userId }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchNotifications()
    setupRealtimeSubscription()
  }, [userId])

  const fetchNotifications = async () => {
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
      .limit(10)

    if (error) {
      console.error("Error fetching notifications:", error)
    } else {
      setNotifications(data || [])
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0)
    }
  }

  const setupRealtimeSubscription = () => {
    const supabase = createClient()

    const channel = supabase
      .channel("notifications")
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
            setNotifications((prev) => [data, ...prev.slice(0, 9)])
            setUnreadCount((prev) => prev + 1)
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
      setUnreadCount((prev) => Math.max(0, prev - 1))
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
      setUnreadCount(0)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "follow":
        return <UserPlus className="w-4 h-4 text-blue-500" />
      case "like":
        return <Heart className="w-4 h-4 text-red-500" />
      case "comment":
        return <MessageCircle className="w-4 h-4 text-green-500" />
      default:
        return <Bell className="w-4 h-4 text-gray-500" />
    }
  }

  const getNotificationLink = (notification: Notification) => {
    if (notification.post_id) {
      return `/post/${notification.post_id}`
    }
    return `/profile/${notification.sender.username}`
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${!notification.is_read ? "bg-blue-50" : ""}`}
                onClick={() => {
                  if (!notification.is_read) {
                    markAsRead(notification.id)
                  }
                  setIsOpen(false)
                }}
              >
                <Link href={getNotificationLink(notification)} className="block">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={notification.sender.avatar_url || ""} alt={notification.sender.username} />
                      <AvatarFallback className="text-xs">
                        {notification.sender.first_name?.[0]}
                        {notification.sender.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {getNotificationIcon(notification.notification_type)}
                        <span className="font-medium text-sm">
                          {notification.sender.first_name} {notification.sender.last_name}
                        </span>
                        {!notification.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            ))
          )}
        </div>

        {notifications.length > 0 && (
          <div className="p-4 border-t">
            <Link
              href="/notifications"
              className="block text-center text-sm text-blue-600 hover:text-blue-500"
              onClick={() => setIsOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
