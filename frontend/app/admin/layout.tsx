import type React from "react"
import { DashboardNavbar } from "@/components/dashboard-navbar"

const adminNavItems = [
  { label: "Create Student", href: "/admin/create-student" },
  { label: "Create Teacher", href: "/admin/create-teacher" },
  { label: "Create Class", href: "/admin/create-class" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardNavbar role="admin" navItems={adminNavItems} userName="Admin User" />
      {children}
    </>
  )
}
