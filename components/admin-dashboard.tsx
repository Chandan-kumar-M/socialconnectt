"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, FileText, Activity, Trash2, UserX } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface AdminStats {
  totalUsers: number
  totalPosts: number
  activeToday: number
}

interface User {
  id: string
  username: string
  email: string
  full_name: string
  avatar_url: string | null
  created_at: string
  is_active: boolean
  posts_count: number
  followers_count: number
}

interface Post {
  id: string
  content: string
  created_at: string
  image_url: string | null
  category: string
  like_count: number
  comment_count: number
  author: {
    username: string
    full_name: string
    avatar_url: string | null
  }
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalPosts: 0, activeToday: 0 })
  const [users, setUsers] = useState<User[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load stats
      const [usersResult, postsResult, activeResult] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("posts").select("id", { count: "exact" }).eq("is_active", true),
        supabase
          .from("profiles")
          .select("id", { count: "exact" })
          .gte("last_sign_in_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ])

      setStats({
        totalUsers: usersResult.count || 0,
        totalPosts: postsResult.count || 0,
        activeToday: activeResult.count || 0,
      })

      // Load users with stats
      const { data: usersData } = await supabase
        .from("profiles")
        .select(`
          id, username, email, full_name, avatar_url, created_at, is_active,
          posts:posts(count),
          followers:follows!follows_following_id_fkey(count)
        `)
        .order("created_at", { ascending: false })
        .limit(50)

      const formattedUsers =
        usersData?.map((user) => ({
          ...user,
          posts_count: user.posts?.[0]?.count || 0,
          followers_count: user.followers?.[0]?.count || 0,
        })) || []

      setUsers(formattedUsers)

      // Load recent posts
      const { data: postsData } = await supabase
        .from("posts")
        .select(`
          id, content, created_at, image_url, category, like_count, comment_count,
          author:profiles(username, full_name, avatar_url)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(50)

      setPosts(postsData || [])
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const deactivateUser = async (userId: string) => {
    try {
      const { error } = await supabase.from("profiles").update({ is_active: false }).eq("id", userId)

      if (error) throw error

      setUsers(users.map((user) => (user.id === userId ? { ...user, is_active: false } : user)))

      toast({
        title: "Success",
        description: "User deactivated successfully",
      })
    } catch (error) {
      console.error("Error deactivating user:", error)
      toast({
        title: "Error",
        description: "Failed to deactivate user",
        variant: "destructive",
      })
    }
  }

  const deletePost = async (postId: string) => {
    try {
      const { error } = await supabase.from("posts").update({ is_active: false }).eq("id", postId)

      if (error) throw error

      setPosts(posts.filter((post) => post.id !== postId))
      setStats((prev) => ({ ...prev, totalPosts: prev.totalPosts - 1 }))

      toast({
        title: "Success",
        description: "Post deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting post:", error)
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="flex justify-center py-8">Loading dashboard...</div>
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPosts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeToday}</div>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="posts">Content Management</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={user.avatar_url || ""} />
                        <AvatarFallback>{user.full_name?.charAt(0) || user.username.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.full_name || user.username}</div>
                        <div className="text-sm text-muted-foreground">@{user.username}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        <div className="flex space-x-4 text-sm text-muted-foreground mt-1">
                          <span>{user.posts_count} posts</span>
                          <span>{user.followers_count} followers</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={user.is_active ? "default" : "secondary"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {user.is_active && (
                        <Button variant="outline" size="sm" onClick={() => deactivateUser(user.id)}>
                          <UserX className="h-4 w-4 mr-1" />
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Management</CardTitle>
              <CardDescription>Manage posts and content moderation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={post.author.avatar_url || ""} />
                          <AvatarFallback>
                            {post.author.full_name?.charAt(0) || post.author.username.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{post.author.full_name || post.author.username}</span>
                            <span className="text-sm text-muted-foreground">@{post.author.username}</span>
                            <Badge variant="outline">{post.category}</Badge>
                          </div>
                          <p className="mt-2 text-sm">{post.content}</p>
                          {post.image_url && (
                            <img
                              src={post.image_url || "/placeholder.svg"}
                              alt="Post image"
                              className="mt-2 rounded-lg max-w-xs"
                            />
                          )}
                          <div className="flex space-x-4 text-sm text-muted-foreground mt-2">
                            <span>{post.like_count} likes</span>
                            <span>{post.comment_count} comments</span>
                            <span>{new Date(post.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => deletePost(post.id)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
