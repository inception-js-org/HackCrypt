"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  name: string
  email: string
  role: "student" | "teacher" | "admin"
}

interface AuthContextType {
  user: User | null
  login: (role: "student" | "teacher" | "admin", name?: string) => void
  logout: () => void
  isLoggedIn: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Check localStorage for existing session
    const savedUser = localStorage.getItem("attendai_user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const login = (role: "student" | "teacher" | "admin", name = "John Doe") => {
    const newUser = {
      name,
      email: `${name.toLowerCase().replace(" ", ".")}@example.com`,
      role,
    }
    setUser(newUser)
    localStorage.setItem("attendai_user", JSON.stringify(newUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("attendai_user")
  }

  return <AuthContext.Provider value={{ user, login, logout, isLoggedIn: !!user }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
