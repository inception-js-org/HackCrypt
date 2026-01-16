"use client"

import { useState } from "react"
import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const sessions = [
  { id: 1, time: "09:00 - 10:00", subject: "Mathematics", class: "12-A", students: 35, status: "upcoming" },
  { id: 2, time: "10:00 - 11:00", subject: "Mathematics", class: "11-B", students: 32, status: "upcoming" },
  { id: 3, time: "11:30 - 12:30", subject: "Mathematics", class: "12-B", students: 30, status: "upcoming" },
  { id: 4, time: "02:30 - 03:30", subject: "Mathematics", class: "10-A", students: 38, status: "upcoming" },
]

export default function TeacherTimetablePage() {
  const [activeSession, setActiveSession] = useState<number | null>(null)

  return (
    <PageContainer title="Sessions" description="Manage your classes and mark attendance">
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">{"Today's Sessions"}</p>
            <p className="text-3xl font-bold text-black mt-2">4</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Total Students</p>
            <p className="text-3xl font-bold text-[#3B82F6] mt-2">135</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Completed Today</p>
            <p className="text-3xl font-bold text-green-600 mt-2">0</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Avg. Attendance</p>
            <p className="text-3xl font-bold text-black mt-2">94%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-black">{"Today's Schedule - Wednesday, Jan 15"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                  activeSession === session.id
                    ? "border-[#3B82F6] bg-[#EBF5FF]"
                    : "border-[#E2E8F0] hover:border-[#3B82F6]"
                }`}
              >
                <div className="flex items-center gap-6">
                  <div className="text-center min-w-[100px]">
                    <p className="text-black font-medium">{session.time}</p>
                  </div>
                  <div>
                    <p className="text-black font-semibold">{session.subject}</p>
                    <p className="text-[#64748B] text-sm">
                      Class {session.class} • {session.students} students
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className="bg-[#F59E0B] text-white">{session.status}</Badge>
                  <Button
                    onClick={() => setActiveSession(session.id)}
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                  >
                    Start Session
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {activeSession && (
        <Card className="border-0 shadow-lg mt-6">
          <CardHeader className="bg-[#3B82F6] text-white rounded-t-lg">
            <CardTitle>Active Session - Class {sessions.find((s) => s.id === activeSession)?.class}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="w-24 h-24 bg-[#EBF5FF] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📷</span>
              </div>
              <p className="text-black font-medium mb-2">Face Recognition Active</p>
              <p className="text-[#64748B] mb-6">Students can mark attendance using face detection</p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" className="border-[#3B82F6] text-[#3B82F6] bg-transparent">
                  Manual Entry
                </Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white">End Session</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}
