"use client"

import type React from "react"
import { DashboardNavbar } from "@/components/dashboard-navbar"
import { useAuth } from "@/contexts/auth-context"

const studentNavItems = [
  { label: "Timetable", href: "/student/timetable" },
  { label: "Analytics", href: "/student/analytics" },
  { label: "Grievances", href: "/student/grievances" },
]

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  
  return (
    <>
      <DashboardNavbar 
        role="student" 
        navItems={studentNavItems} 
        userName={user?.name || "Student"} 
      />
      {children}
    </>
  )
}
