import type React from "react"
import { DashboardNavbar } from "@/components/dashboard-navbar"

const teacherNavItems = [
  { label: "Sessions", href: "/teacher/timetable" },
  { label: "Analytics", href: "/teacher/analytics" },
  { label: "Grievances", href: "/teacher/grievances" },
]

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardNavbar role="teacher" navItems={teacherNavItems} userName="Dr. Sarah Teacher" />
      {children}
    </>
  )
}
