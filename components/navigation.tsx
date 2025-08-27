"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Home, Search, PlusCircle, User, LogOut, Settings, Bell } from "lucide-react"
import Link from "next/link"
import { NotificationDropdown } from "@/components/notification-dropdown"

interface Profile {
  id: string
  username: string
  first_name: string
  last_name: string
  avatar_url: string | null
  role: string
}

interface NavigationProps {
  profile: Profile
}

export function Navigation({ profile }: NavigationProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const supabase = createClient()

    try {
      await supabase.auth.signOut()
      router.push("/")
      router.refresh()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/feed" className="text-2xl font-bold text-blue-600">
            SocialConnect
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/feed" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors">
              <Home className="w-5 h-5" />
              <span>Home</span>
            </Link>
            <Link href="/users" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors">
              <Search className="w-5 h-5" />
              <span>Discover</span>
            </Link>
            <Link
              href="/create-post"
              className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Create</span>
            </Link>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <NotificationDropdown userId={profile.id} />

            {/* Mobile Navigation */}
            <div className="md:hidden flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/feed">
                  <Home className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/users">
                  <Search className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/create-post">
                  <PlusCircle className="w-5 h-5" />
                </Link>
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 p-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={profile.avatar_url || ""} alt={profile.username} />
                    <AvatarFallback>
                      {profile.first_name?.[0]}
                      {profile.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block font-medium">
                    {profile.first_name} {profile.last_name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${profile.username}`} className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    View Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/edit" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Edit Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/notifications" className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    All Notifications
                  </Link>
                </DropdownMenuItem>
                {profile.role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Admin Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  {isLoggingOut ? "Signing out..." : "Sign Out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  )
}
