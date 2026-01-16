"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { ArrowLeft } from "lucide-react"

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { login } = useAuth()
  const defaultRole = searchParams.get("role") || "student"
  const [activeTab, setActiveTab] = useState(defaultRole)

  const handleLogin = (role: "student" | "teacher" | "admin", name: string) => {
    login(role, name)
    router.push("/")
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <Link
        href="/"
        className="fixed top-6 left-6 flex items-center gap-2 text-[#64748B] hover:text-[#3B82F6] transition-colors z-10"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back</span>
      </Link>
      <div className="w-full max-w-md mt-20">
        
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-[#3B82F6] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <span className="text-black font-bold text-xl">ATTENDIX</span>
        </Link>

        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-black">Welcome Back</CardTitle>
            <CardDescription className="text-[#64748B]">Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="student">Student</TabsTrigger>
                <TabsTrigger value="teacher">Teacher</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
              </TabsList>

              <TabsContent value="student">
                <LoginFormFields role="student" onLogin={(name) => handleLogin("student", name)} />
              </TabsContent>

              <TabsContent value="teacher">
                <LoginFormFields role="teacher" onLogin={(name) => handleLogin("teacher", name)} />
              </TabsContent>

              <TabsContent value="admin">
                <LoginFormFields role="admin" onLogin={(name) => handleLogin("admin", name)} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function LoginFormFields({ role, onLogin }: { role: string; onLogin: (name: string) => void }) {
  const [name, setName] = useState("John Doe")

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onLogin(name)
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor={`${role}-name`} className="text-black">
          Full Name
        </Label>
        <Input
          id={`${role}-name`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your full name"
          className="border-[#E2E8F0] focus:border-[#3B82F6] focus:ring-[#3B82F6]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${role}-email`} className="text-black">
          Email
        </Label>
        <Input
          id={`${role}-email`}
          type="email"
          placeholder={`Enter your ${role} email`}
          className="border-[#E2E8F0] focus:border-[#3B82F6] focus:ring-[#3B82F6]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${role}-password`} className="text-black">
          Password
        </Label>
        <Input
          id={`${role}-password`}
          type="password"
          placeholder="Enter your password"
          className="border-[#E2E8F0] focus:border-[#3B82F6] focus:ring-[#3B82F6]"
        />
      </div>
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-[#64748B]">
          <input type="checkbox" className="rounded border-[#E2E8F0]" />
          Remember me
        </label>
        <Link href="#" className="text-[#3B82F6] hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white">
        Sign In as {role.charAt(0).toUpperCase() + role.slice(1)}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
