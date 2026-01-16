"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"

interface NavItem {
  label: string
  href: string
}

interface DashboardNavbarProps {
  role: "student" | "teacher" | "admin"
  navItems: NavItem[]
  userName?: string
}

export function DashboardNavbar({ role, navItems, userName = "User" }: DashboardNavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  
  // Use the actual user data if available
  const displayName = user?.name || userName
  const userEmail = user?.email || ""
  
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  return (
    <nav className="bg-white border-b border-[#E2E8F0] px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#3B82F6] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <span className="text-black font-bold text-xl hidden sm:block">ATTENDIX</span>
        </Link>

        {/* Navigation Items */}
        <div className="flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-[#64748B] hover:text-[#3B82F6] transition-colors font-medium",
                pathname === item.href && "text-[#3B82F6] border-b-2 border-[#3B82F6] pb-1",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <span className="text-[#64748B] text-sm hidden sm:block">{displayName}</span>
              <Avatar className="h-10 w-10 bg-[#3B82F6]">
                <AvatarFallback className="bg-[#3B82F6] text-white font-medium">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/${role}/inbox`} className="cursor-pointer">
                Inbox
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/${role}/attendance`} className="cursor-pointer">
                Attendance
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/${role}/edit-details`} className="cursor-pointer">
                Edit Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/${role}/change-password`} className="cursor-pointer">
                Change Password
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
