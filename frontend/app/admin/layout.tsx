"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardNavbar } from "@/components/dashboard-navbar"
import { useAuth } from "@/contexts/auth-context"

const adminNavItems = [
  { label: "Create Student", href: "/admin/create-student" },
  { label: "Create Teacher", href: "/admin/create-teacher" },
  { label: "Create Class", href: "/admin/create-class" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    // Check if user is logged in and has admin role
    if (!isLoggedIn || (user?.role !== "ADMIN" && user?.role !== "admin")) {
      router.push("/login/choose-role")
    }
  }, [isLoggedIn, user, router])

  // Don't render if not admin
  if (!isLoggedIn || (user?.role !== "ADMIN" && user?.role !== "admin")) {
    return null
  }
  
  return (
    <>
      <DashboardNavbar 
        role="admin" 
        navItems={adminNavItems} 
        userName={user?.name || "Admin"} 
      />
      {children}
    </>
  )
}
