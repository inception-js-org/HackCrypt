"use client"

import { createContext, useContext, type ReactNode, useState, useEffect } from "react"
import { useUser, useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

interface User {
  name: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  isLoggedIn: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [adminUser, setAdminUser] = useState<User | null>(null)

  // Check for admin session on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedAdmin = localStorage.getItem("adminUser")
      if (storedAdmin) {
        try {
          const parsed = JSON.parse(storedAdmin)
          setAdminUser({
            name: "Admin",
            email: "admin@system.com",
            role: "ADMIN",
          })
        } catch (e) {
          localStorage.removeItem("adminUser")
        }
      }
    }
  }, [])

  // If admin is logged in, use admin user
  const user: User | null = adminUser || (clerkUser
    ? {
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.emailAddresses[0]?.emailAddress || "User",
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        role: (clerkUser.unsafeMetadata?.role as string) || "student",
      }
    : null)

  const logout = async () => {
    // Check if admin is logged in
    if (adminUser) {
      localStorage.removeItem("adminUser")
      setAdminUser(null)
      router.push("/")
    } else {
      await signOut()
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: (isLoaded && !!clerkUser) || !!adminUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
