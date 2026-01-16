"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useUser, useClerk } from "@clerk/nextjs"

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

  const user: User | null = clerkUser
    ? {
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.emailAddresses[0]?.emailAddress || "User",
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        role: (clerkUser.unsafeMetadata?.role as string) || "student",
      }
    : null

  const logout = async () => {
    await signOut()
  }

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: isLoaded && !!clerkUser, logout }}>
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
