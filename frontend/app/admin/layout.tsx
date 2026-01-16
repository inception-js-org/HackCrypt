"use client"

import type React from "react"
import { DashboardNavbar } from "@/components/dashboard-navbar"
import { useAuth } from "@/contexts/auth-context"

const adminNavItems = [
  { label: "Create Student", href: "/admin/create-student" },
  { label: "Create Teacher", href: "/admin/create-teacher" },
  { label: "Create Class", href: "/admin/create-class" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  
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
