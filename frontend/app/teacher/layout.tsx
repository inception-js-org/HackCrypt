"use client"

import type React from "react"
import { DashboardNavbar } from "@/components/dashboard-navbar"
import { useAuth } from "@/contexts/auth-context"

const teacherNavItems = [
  { label: "Sessions", href: "/teacher/timetable" },
  { label: "Analytics", href: "/teacher/analytics" },
  { label: "Grievances", href: "/teacher/grievances" },
]

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  
  return (
    <>
      <DashboardNavbar 
        role="teacher" 
        navItems={teacherNavItems} 
        userName={user?.name || "Teacher"} 
      />
      {children}
    </>
  )
}
