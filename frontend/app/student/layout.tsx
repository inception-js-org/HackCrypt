import type React from "react"
import { DashboardNavbar } from "@/components/dashboard-navbar"

const studentNavItems = [
  { label: "Timetable", href: "/student/timetable" },
  { label: "Analytics", href: "/student/analytics" },
  { label: "Grievances", href: "/student/grievances" },
]

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardNavbar role="student" navItems={studentNavItems} userName="Alex Student" />
      {children}
    </>
  )
}
