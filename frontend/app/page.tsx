"use client"

import { AnimatedBackground } from "@/components/animated-background"
import { LandingNavbar } from "@/components/landing-navbar"
import SyncUserOnLoad from "@/components/SyncUserOnLoad"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"

export default function LandingPage() {
  const { isLoggedIn, user } = useAuth()

  return (
    <main className="min-h-screen bg-[#3B82F6] relative overflow-hidden">
      <SyncUserOnLoad />
      <AnimatedBackground />
      <LandingNavbar />

      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center">
        {/* Large background text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-[12rem] md:text-[18rem] lg:text-[21rem] font-bold text-white/30 tracking-tight select-none whitespace-nowrap">
            ATTEND<span className="text-white/30">IX</span>
          </h1>
        </div>

        <div className="relative z-10 mt-16">
          {/* Image with slight transparency for bluish tint */}
          <img
            src="/images/chatgpt-20image-20jan-2015-2c-202026-2c-2009-53-00-20pm-photoroom.png"
            alt="Face recognition technology demonstration"
            className="w-auto h-[65vh] md:h-[75vh] lg:h-[95vh] object-contain opacity-87 mix-blend-luminosity"
          />

          <div className="absolute bottom-12 md:bottom-29 left-1/2 -translate-x-1/2 w-full text-center z-20">
            {isLoggedIn ? (
              <p className="text-white text-sm md:text-base lg:text-lg tracking-[0.3em] uppercase font-light drop-shadow-lg">
                Welcome back, {user?.name} — {user?.role} Dashboard
              </p>
            ) : (
              <p className="text-white text-sm md:text-base lg:text-lg tracking-[0.3em] uppercase font-light drop-shadow-lg">
                Transforming Attendance with AI-Powered Recognition
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Only show features sections when not logged in */}
      {!isLoggedIn && (
        <>
          {/* Features Section */}
          <section id="features" className="relative z-10 py-24 bg-white">
            <div className="container mx-auto px-8">
              <h2 className="text-4xl font-bold text-center text-black mb-16">
                Cutting-Edge <span className="text-[#3B82F6]">Features</span>
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <FeatureCard
                  title="Face Recognition"
                  description="Advanced AI-powered face detection for quick and accurate attendance marking"
                />
                <FeatureCard
                  title="Fingerprint Detection"
                  description="Secure biometric verification as an alternative authentication method"
                />
                <FeatureCard
                  title="Smart Analytics"
                  description="Comprehensive attendance analytics and anomaly detection for better insights"
                />
              </div>
            </div>
          </section>

          {/* User Types Section */}
          <section id="technology" className="relative z-10 py-24 bg-[#F8FAFC]">
            <div className="container mx-auto px-8">
              <h2 className="text-4xl font-bold text-center text-black mb-16">
                Designed for <span className="text-[#3B82F6]">Everyone</span>
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <UserTypeCard
                  title="Students"
                  description="View timetables, check attendance records, track analytics, and submit grievances"
                  href="/login?role=student"
                />
                <UserTypeCard
                  title="Teachers"
                  description="Manage sessions, track student attendance, view analytics, and handle grievances"
                  href="/login?role=teacher"
                />
                <UserTypeCard
                  title="Administrators"
                  description="Create and manage students, teachers, classes, and oversee the entire system"
                  href="/login?role=admin"
                />
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="relative z-10 py-12 bg-black text-white">
            <div className="container mx-auto px-8 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#3B82F6] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">A</span>
                </div>
                <span className="font-bold text-lg">ATTENDIX</span>
              </div>
              <p className="text-white/60">© 2026 ATTENDIX. All rights reserved.</p>
            </div>
          </footer>
        </>
      )}
    </main>
  )
}

function QuickAccessButtons({ role }: { role: string }) {
  const links = {
    student: [
      { label: "View Timetable", href: "/student/timetable" },
      { label: "Check Attendance", href: "/student/attendance" },
    ],
    teacher: [
      { label: "Manage Sessions", href: "/teacher/sessions" },
      { label: "View Analytics", href: "/teacher/analytics" },
    ],
    admin: [
      { label: "Create Student", href: "/admin/create-student" },
      { label: "Manage System", href: "/admin/create-class" },
    ],
  }

  const roleLinks = links[role as keyof typeof links] || links.student

  return (
    <>
      {roleLinks.map((link) => (
        <Link key={link.href} href={link.href}>
          <Button size="lg" className="bg-black text-white hover:bg-black/80 px-6">
            {link.label}
          </Button>
        </Link>
      ))}
    </>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 hover:shadow-lg transition-shadow">
      <div className="w-16 h-16 bg-[#3B82F6]/10 rounded-xl flex items-center justify-center mb-6">
        <div className="w-8 h-8 bg-[#3B82F6] rounded-lg" />
      </div>
      <h3 className="text-xl font-bold text-black mb-3">{title}</h3>
      <p className="text-[#64748B]">{description}</p>
    </div>
  )
}

function UserTypeCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link href={href}>
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 hover:shadow-lg hover:border-[#3B82F6] transition-all cursor-pointer group">
        <h3 className="text-2xl font-bold text-black mb-3 group-hover:text-[#3B82F6] transition-colors">{title}</h3>
        <p className="text-[#64748B]">{description}</p>
        <div className="mt-6 text-[#3B82F6] font-medium flex items-center gap-2">
          Login as {title.slice(0, -1)}
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </div>
    </Link>
  )
}
