"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface ClassInfo {
  id: number
  grade: string
  section: string
  maxCapacity: number
}

interface Session {
  id: number
  classId: number
  facultyId: number
  subject: string
  scheduledStartTime: string
  scheduledEndTime: string
  actualStartTime: string | null
  actualEndTime: string | null
  status: "SCHEDULED" | "ACTIVE" | "CLOSED"
  class: ClassInfo | null
}

interface Student {
  id: number
  firstName: string
  lastName: string
  faceId: string | null
  fingerprintId: string | null
}

interface AttendanceRecord {
  id: number
  studentId: number
  faceRecognizedAt: string | null
  fingerprintVerifiedAt: string | null
  faceConfidence: number | null
  status: string
  student: Student | null
}

interface IdentityResult {
  identity: string
  confidence: number
  bbox: { x1: number; y1: number; x2: number; y2: number }
  matched: boolean
}

const SESSION_TIME_LIMIT = 10 * 60 * 1000 // 10 minutes in milliseconds

export default function TeacherTimetablePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [classStudents, setClassStudents] = useState<Student[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState<number>(SESSION_TIME_LIMIT)
  const [recognizedStudents, setRecognizedStudents] = useState<Set<number>>(new Set())
  const [fingerprintVerified, setFingerprintVerified] = useState<Set<number>>(new Set())
  
  const videoRef = useRef<HTMLImageElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const { toast } = useToast()

  // New session form state
  const [newSession, setNewSession] = useState({
    classId: "",
    subject: "",
    startTime: "",
    endTime: "",
  })

  // Fetch sessions
  useEffect(() => {
    fetchSessions()
    fetchClasses()
  }, [])

  const fetchSessions = async () => {
    try {
      const today = new Date().toISOString().split("T")[0]
      const response = await fetch(`/api/sessions?date=${today}`)
      const data = await response.json()
      setSessions(data)
    } catch (error) {
      console.error("Error fetching sessions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchClasses = async () => {
    try {
      const response = await fetch("/api/classes")
      const data = await response.json()
      setClasses(data)
    } catch (error) {
      console.error("Error fetching classes:", error)
    }
  }

  const fetchClassStudents = async (classId: number) => {
    try {
      const response = await fetch(`/api/students/by-class?classId=${classId}`)
      const data = await response.json()
      setClassStudents(data.students || [])
    } catch (error) {
      console.error("Error fetching students:", error)
    }
  }

  const fetchAttendance = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/attendance?sessionId=${sessionId}`)
      const data = await response.json()
      setAttendanceRecords(data)
      
      // Update recognized sets
      const faceSet = new Set<number>()
      const fpSet = new Set<number>()
      data.forEach((record: AttendanceRecord) => {
        if (record.faceRecognizedAt) faceSet.add(record.studentId)
        if (record.fingerprintVerifiedAt) fpSet.add(record.studentId)
      })
      setRecognizedStudents(faceSet)
      setFingerprintVerified(fpSet)
    } catch (error) {
      console.error("Error fetching attendance:", error)
    }
  }

  const createSession = async () => {
    if (!newSession.classId || !newSession.subject || !newSession.startTime || !newSession.endTime) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        variant: "destructive",
      })
      return
    }

    setIsCreatingSession(true)
    try {
      const today = new Date().toISOString().split("T")[0]
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: parseInt(newSession.classId),
          facultyId: 1, // TODO: Get from auth context
          subject: newSession.subject,
          scheduledStartTime: `${today}T${newSession.startTime}:00`,
          scheduledEndTime: `${today}T${newSession.endTime}:00`,
        }),
      })

      if (response.ok) {
        toast({ title: "Success", description: "Session created successfully" })
        fetchSessions()
        setNewSession({ classId: "", subject: "", startTime: "", endTime: "" })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create session",
        variant: "destructive",
      })
    } finally {
      setIsCreatingSession(false)
    }
  }

  const startSession = async (session: Session) => {
    try {
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      })

      if (response.ok) {
        const updatedSession = await response.json()
        setActiveSession({ ...session, ...updatedSession })
        setTimeRemaining(SESSION_TIME_LIMIT)
        
        if (session.classId) {
          await fetchClassStudents(session.classId)
          await fetchAttendance(session.id)
        }

        // Start timer
        timerRef.current = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev <= 1000) {
              endSession()
              return 0
            }
            return prev - 1000
          })
        }, 1000)

        // Start face recognition polling
        startFaceRecognition(session.id)

        toast({ title: "Session Started", description: "Attendance marking is now active" })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start session",
        variant: "destructive",
      })
    }
  }

  const endSession = async () => {
    if (!activeSession) return

    try {
      // Stop timers
      if (timerRef.current) clearInterval(timerRef.current)
      if (recognitionIntervalRef.current) clearInterval(recognitionIntervalRef.current)

      const response = await fetch(`/api/sessions/${activeSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      })

      if (response.ok) {
        toast({ title: "Session Ended", description: "Attendance has been recorded" })
        setActiveSession(null)
        setClassStudents([])
        setAttendanceRecords([])
        setRecognizedStudents(new Set())
        setFingerprintVerified(new Set())
        fetchSessions()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end session",
        variant: "destructive",
      })
    }
  }

  const startFaceRecognition = (sessionId: number) => {
    // Poll the identify endpoint every 2 seconds
    recognitionIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch("http://localhost:8000/identify/webcam", {
          method: "POST",
        })
        const data = await response.json()

        if (data.status === "success" && data.identities) {
          for (const identity of data.identities as IdentityResult[]) {
            if (identity.matched && identity.identity !== "Unknown") {
              // Find student by faceId
              const student = classStudents.find(
                (s) => s.faceId === identity.identity
              )
              
              if (student && !recognizedStudents.has(student.id)) {
                await recordAttendance(sessionId, student.id, "face", identity.confidence)
              }
            }
          }
        }
      } catch (error) {
        console.error("Face recognition error:", error)
      }
    }, 2000)
  }

  const recordAttendance = async (
    sessionId: number,
    studentId: number,
    type: "face" | "fingerprint",
    confidence?: number
  ) => {
    try {
      // Check for duplicates
      if (type === "face" && recognizedStudents.has(studentId)) {
        console.log("Duplicate face recognition ignored for student:", studentId)
        return
      }
      if (type === "fingerprint" && fingerprintVerified.has(studentId)) {
        console.log("Duplicate fingerprint ignored for student:", studentId)
        return
      }

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          studentId,
          type,
          confidence: confidence ? Math.round(confidence * 100) : undefined,
        }),
      })

      if (response.ok) {
        const record = await response.json()
        
        // Update local state
        if (type === "face") {
          setRecognizedStudents((prev) => new Set([...prev, studentId]))
        } else {
          setFingerprintVerified((prev) => new Set([...prev, studentId]))
        }

        // Refresh attendance
        await fetchAttendance(sessionId)

        const student = classStudents.find((s) => s.id === studentId)
        toast({
          title: type === "face" ? "Face Recognized" : "Fingerprint Verified",
          description: `${student?.firstName} ${student?.lastName}`,
        })
      }
    } catch (error) {
      console.error("Error recording attendance:", error)
    }
  }



  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (recognitionIntervalRef.current) clearInterval(recognitionIntervalRef.current)
    }
  }, [])

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return <Badge className="bg-[#F59E0B] text-white">Scheduled</Badge>
      case "ACTIVE":
        return <Badge className="bg-green-600 text-white">Active</Badge>
      case "CLOSED":
        return <Badge className="bg-gray-500 text-white">Closed</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const presentCount = attendanceRecords.filter(
    (r) => r.status === "PRESENT"
  ).length
  const totalStudents = classStudents.length
  const completedToday = sessions.filter((s) => s.status === "CLOSED").length

  return (
    <PageContainer title="Sessions" description="Manage your classes and mark attendance">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">{"Today's Sessions"}</p>
            <p className="text-3xl font-bold text-black mt-2">{sessions.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Total Students</p>
            <p className="text-3xl font-bold text-[#3B82F6] mt-2">
              {activeSession ? totalStudents : "-"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Completed Today</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{completedToday}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">
              {activeSession ? "Present" : "Avg. Attendance"}
            </p>
            <p className="text-3xl font-bold text-black mt-2">
              {activeSession ? `${presentCount}/${totalStudents}` : "94%"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Create Session Button */}
      <div className="mb-6 flex justify-end">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white">
              + Create New Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <Select
                  value={newSession.classId}
                  onValueChange={(value) =>
                    setNewSession({ ...newSession, classId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.grade}-{cls.section} ({cls.maxCapacity} students)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={newSession.subject}
                  onChange={(e) =>
                    setNewSession({ ...newSession, subject: e.target.value })
                  }
                  placeholder="e.g., Mathematics"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={newSession.startTime}
                    onChange={(e) =>
                      setNewSession({ ...newSession, startTime: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={newSession.endTime}
                    onChange={(e) =>
                      setNewSession({ ...newSession, endTime: e.target.value })
                    }
                  />
                </div>
              </div>
              <Button
                onClick={createSession}
                disabled={isCreatingSession}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {isCreatingSession ? "Creating..." : "Create Session"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sessions List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-black">
            {"Today's Schedule - " + new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-[#64748B]">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="text-center py-8 text-[#64748B]">
              No sessions scheduled for today. Create one to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                    activeSession?.id === session.id
                      ? "border-[#3B82F6] bg-[#EBF5FF]"
                      : "border-[#E2E8F0] hover:border-[#3B82F6]"
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <div className="text-center min-w-[120px]">
                      <p className="text-black font-medium">
                        {new Date(session.scheduledStartTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -{" "}
                        {new Date(session.scheduledEndTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-black font-semibold">{session.subject}</p>
                      <p className="text-[#64748B] text-sm">
                        Class {session.class?.grade}-{session.class?.section} •{" "}
                        {session.class?.maxCapacity} students
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(session.status)}
                    {session.status === "SCHEDULED" && (
                      <Button
                        onClick={() => startSession(session)}
                        className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                      >
                        Start Session
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Session Panel */}
      {activeSession && (
        <Card className="border-0 shadow-lg mt-6">
          <CardHeader className="bg-[#3B82F6] text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle>
                Active Session - {activeSession.subject} (
                {activeSession.class?.grade}-{activeSession.class?.section})
              </CardTitle>
              <div className="flex items-center gap-4">
                <Badge className="bg-white text-[#3B82F6] text-lg px-4 py-1">
                  ⏱️ {formatTime(timeRemaining)}
                </Badge>
                <Badge className="bg-green-500 text-white text-lg px-4 py-1">
                  {presentCount}/{totalStudents} Present
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Face Recognition Feed */}
              <div className="space-y-4">
                <h3 className="font-semibold text-black">Face Recognition</h3>
                <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                  <img
                    ref={videoRef}
                    src="http://localhost:8000/video_feed?mode=identify"
                    alt="Live Camera Feed"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none"
                    }}
                  />
                  <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    LIVE
                  </div>
                </div>
                <p className="text-sm text-[#64748B]">
                  {recognizedStudents.size} faces recognized
                </p>
              </div>

              {/* Fingerprint Status */}
              <div className="space-y-4">
                <h3 className="font-semibold text-black">Fingerprint Verification</h3>
                <div className="bg-[#F8FAFC] rounded-lg p-6 text-center">
                  <div className="w-20 h-20 bg-[#EBF5FF] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">👆</span>
                  </div>
                  <p className="text-black font-medium">Scanner Ready</p>
                  <p className="text-[#64748B] text-sm mt-2">
                    {fingerprintVerified.size} fingerprints verified
                  </p>
                </div>

                {/* Attendance List */}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  <h4 className="font-medium text-black">Recent Attendance</h4>
                  {attendanceRecords.slice(-5).reverse().map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <span className="text-sm">
                        {record.student?.firstName} {record.student?.lastName}
                      </span>
                      <div className="flex gap-1">
                        {record.faceRecognizedAt && (
                          <Badge className="bg-blue-100 text-blue-700 text-xs">📷</Badge>
                        )}
                        {record.fingerprintVerifiedAt && (
                          <Badge className="bg-green-100 text-green-700 text-xs">👆</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4 mt-6">
              <Button
                variant="outline"
                className="border-[#3B82F6] text-[#3B82F6] bg-transparent"
              >
                Manual Entry
              </Button>
              <Button
                onClick={endSession}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                End Session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}
