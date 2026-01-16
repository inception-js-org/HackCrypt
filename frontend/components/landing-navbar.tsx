"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"

const roleNavItems: Record<string, { label: string; href: string }[]> = {
  STUDENT: [
    { label: "Timetable", href: "/student/timetable" },
    { label: "Analytics", href: "/student/analytics" },
    { label: "Grievances", href: "/student/grievances" },
  ],
  student: [
    { label: "Timetable", href: "/student/timetable" },
    { label: "Analytics", href: "/student/analytics" },
    { label: "Grievances", href: "/student/grievances" },
  ],
  FACULTY: [
    { label: "Sessions", href: "/teacher/sessions" },
    { label: "Analytics", href: "/teacher/analytics" },
    { label: "Grievances", href: "/teacher/grievances" },
  ],
  FACULTY_PENDING: [
    { label: "Sessions", href: "/teacher/sessions" },
    { label: "Analytics", href: "/teacher/analytics" },
    { label: "Grievances", href: "/teacher/grievances" },
  ],
  teacher: [
    { label: "Sessions", href: "/teacher/sessions" },
    { label: "Analytics", href: "/teacher/analytics" },
    { label: "Grievances", href: "/teacher/grievances" },
  ],
  ADMIN: [
    { label: "Create Student", href: "/admin/create-student" },
    { label: "Create Teacher", href: "/admin/create-teacher" },
    { label: "Create Class", href: "/admin/create-class" },
  ],
  admin: [
    { label: "Create Student", href: "/admin/create-student" },
    { label: "Create Teacher", href: "/admin/create-teacher" },
    { label: "Create Class", href: "/admin/create-class" },
  ],
}

export function LandingNavbar() {
  const { user, isLoggedIn, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U"

  const navItems = user?.role ? roleNavItems[user.role] || [] : []

  return (
    <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-6">
      {/* Logo - Left */}
      <Link href="/" className="flex items-center gap-2">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
          <span className="text-[#3B82F6] font-bold text-xl">A</span> 
        </div>
          <span className="text-white/75 font-bold text-xl">
  ATTENDIX
</span>


      </Link>

      {/* Navigation - Center */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-8">
        {isLoggedIn ? (
          navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-white/90 hover:text-white transition-colors font-medium"
            >
              {item.label}
            </Link>
          ))
        ) : (
          <>
            <Link href="#features" className="text-white/90 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#technology" className="text-white/90 hover:text-white transition-colors">
              Technology
            </Link>
            <Link href="#benefits" className="text-white/90 hover:text-white transition-colors">
              Benefits
            </Link>
            <Link href="#about" className="text-white/90 hover:text-white transition-colors">
              About
            </Link>
          </>
        )}
      </div>

      {/* Right side - Button or User Avatar */}
      {isLoggedIn ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Avatar className="h-10 w-10 border-2 border-white">
                <AvatarFallback className="bg-white text-[#3B82F6] font-bold">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/${user?.role}/inbox`} className="cursor-pointer">
                Inbox
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/${user?.role}/attendance`} className="cursor-pointer">
                Attendance
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/${user?.role}/edit-details`} className="cursor-pointer">
                Edit Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/${user?.role}/change-password`} className="cursor-pointer">
                Change Password
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Link href="/login/choose-role">
          <Button className="bg-black text-white hover:bg-black/80 px-6">Get Started</Button>
        </Link>
      )}
    </nav>
  )
}
