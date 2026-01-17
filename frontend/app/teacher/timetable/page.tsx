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
import AttendanceCamera from "@/components/attendance-camera"
import { VideoAttendanceDialog } from "@/components/video-attendance-dialog"
import { Video } from "lucide-react"

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
  
  // Video attendance state
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const [selectedSessionForVideo, setSelectedSessionForVideo] = useState<Session | null>(null)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const { toast } = useToast()

  // New session form state
  const [newSession, setNewSession] = useState({
    classId: "",
    subject: "",
    startTime: "",
    endTime: "",
  })

  // Add fingerprint match tracking state
  const [fingerprintMatches, setFingerprintMatches] = useState<Array<{
    fingerprintId: number
    studentId: number
    studentName: string
    confidence: number
    timestamp: Date
  }>>([])
  const [recentFingerprintMatch, setRecentFingerprintMatch] = useState<{
    studentName: string
    timestamp: Date
  } | null>(null)

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
      setSessions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching sessions:", error)
      setSessions([])
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
      console.log("📚 Fetching students for class ID:", classId)
      const response = await fetch(`/api/students/by-class?classId=${classId}`)
      
      if (!response.ok) {
        console.error("❌ Failed to fetch students:", response.status, response.statusText)
        const errorText = await response.text()
        console.error("Error details:", errorText)
        toast({
          title: "Error",
          description: "Failed to load class students",
          variant: "destructive",
        })
        return
      }
      
      const data = await response.json()
      console.log("✅ Students fetched:", data.students?.length || 0, "students")
      
      if (data.students && data.students.length > 0) {
        console.log("📋 CLASS ROSTER:")
        data.students.forEach((s: Student) => {
          console.log(`  👤 ${s.firstName} ${s.lastName}`)
          console.log(`     • Database ID: ${s.id}`)
          console.log(`     • Face ID: ${s.faceId || 'NULL ⚠️'}`)
          console.log(`     • Fingerprint ID: ${s.fingerprintId || 'NULL'}`)
        })
      } else {
        console.warn("⚠️ No students found in this class!")
      }
      
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
          facultyId: 1,
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
        //setShowCamera(true)
        
        if (session.classId) {
          await fetchClassStudents(session.classId)
          await fetchAttendance(session.id)
        }

        timerRef.current = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev <= 1000) {
              endSession()
              return 0
            }
            return prev - 1000
          })
        }, 1000)

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
      // Send FP_STOP command to Arduino
      console.log("🛑 Sending FP_STOP command to Arduino...")
      try {
        await fetch("http://localhost:8000/api/fingerprint/stop", {
          method: "POST",
        })
        console.log("✅ FP_STOP command sent")
      } catch (fpError) {
        console.warn("⚠️ Could not send FP_STOP (Arduino may be disconnected):", fpError)
      }

      if (timerRef.current) clearInterval(timerRef.current)

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
        setFingerprintMatches([])
        setRecentFingerprintMatch(null)
        setShowCamera(false)
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

  const handleAttendanceMarked = useCallback(async (studentId: string, confidence: number) => {
    if (!activeSession) {
      console.log("⚠️ No active session")
      return
    }
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("🎯 ATTENDANCE MARKING ATTEMPT")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("📍 Detected student_id:", studentId, "(type:", typeof studentId, ")")
    console.log("🎚️ Confidence:", confidence)
    console.log("")
    console.log("📋 CLASS ROSTER (", classStudents.length, "students ):")
    classStudents.forEach(s => {
      console.log(`  • ${s.firstName} ${s.lastName}`)
      console.log(`    DB ID: ${s.id} (type: ${typeof s.id})`)
      console.log(`    Face ID: ${s.faceId || 'NULL'} (type: ${typeof s.faceId})`)
    })
    console.log("")
    
    const studentIdNum = parseInt(studentId, 10)
    console.log("🔍 Trying to match student_id:", studentId)
    console.log("   Converted to number:", studentIdNum)
    
    let student = classStudents.find((s) => {
      const matchByFaceId = s.faceId === studentId
      const matchByFaceIdString = s.faceId === String(studentIdNum)
      const matchById = s.id === studentIdNum
      const matchByIdString = String(s.id) === studentId
      
      console.log(`   Checking ${s.firstName}: faceId=${matchByFaceId}, faceIdStr=${matchByFaceIdString}, id=${matchById}, idStr=${matchByIdString}`)
      
      return matchByFaceId || matchByFaceIdString || matchById || matchByIdString
    })
    
    console.log("")
    if (student) {
      console.log("✅ MATCH FOUND IN CLASS:", student.firstName, student.lastName, "(DB ID:", student.id, ")")
      
      if (recognizedStudents.has(student.id)) {
        console.log("⚠️ Student already recognized (duplicate)")
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        return
      }
      
      console.log("📝 Calling recordAttendance...")
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      await recordAttendance(activeSession.id, student.id, "face", confidence)
    } else {
      console.warn("⚠️ Student NOT in expected class roster")
      console.warn("   This student may be enrolled but assigned to a different class")
      console.warn("   Attempting to mark attendance using database ID:", studentIdNum)
      
      if (recognizedStudents.has(studentIdNum)) {
        console.log("⚠️ Student already recognized (duplicate)")
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        return
      }
      
      console.log("📝 Calling recordAttendance with database ID:", studentIdNum)
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      
      await recordAttendance(activeSession.id, studentIdNum, "face", confidence)
      
      toast({
        title: "Student Not in Class",
        description: `Student ID ${studentIdNum} detected but not in this class roster`,
        variant: "destructive",
      })
    }
  }, [activeSession, classStudents, recognizedStudents, toast])

  const recordAttendance = async (
    sessionId: number,
    studentId: number,
    type: "face" | "fingerprint",
    confidence?: number
  ) => {
    try {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      console.log("📝 RECORDING ATTENDANCE")
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      console.log("Session ID:", sessionId)
      console.log("Student ID:", studentId)
      console.log("Type:", type)
      console.log("Confidence:", confidence)
      
      if (type === "face" && recognizedStudents.has(studentId)) {
        console.log("⚠️ Duplicate face recognition ignored for student:", studentId)
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        return
      }
      if (type === "fingerprint" && fingerprintVerified.has(studentId)) {
        console.log("⚠️ Duplicate fingerprint ignored for student:", studentId)
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        return
      }

      console.log("🚀 Sending POST to /api/attendance...")
      const requestBody = {
        sessionId,
        studentId,
        type,
        confidence: confidence ? Math.round(confidence * 100) : undefined,
      }
      console.log("Request body:", JSON.stringify(requestBody, null, 2))
      
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      console.log("📡 Response status:", response.status, response.ok ? "✅" : "❌")

      if (response.ok) {
        const record = await response.json()
        console.log("✅ Attendance recorded successfully!")
        console.log("Record:", record)
        
        if (type === "face") {
          setRecognizedStudents((prev) => new Set([...prev, studentId]))
        } else {
          setFingerprintVerified((prev) => new Set([...prev, studentId]))
        }

        await fetchAttendance(sessionId)

        const student = classStudents.find((s) => s.id === studentId)
        toast({
          title: type === "face" ? "Face Recognized" : "Fingerprint Verified",
          description: `${student?.firstName} ${student?.lastName}`,
        })
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      } else {
        const errorData = await response.json()
        console.error("❌ Error response:", errorData)
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      }
    } catch (error) {
      console.error("❌ Exception recording attendance:", error)
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    }
  }

  useEffect(() => {
    if (!activeSession) return

    console.log("🔄 Starting fingerprint polling for session:", activeSession.id)
    console.log("📋 Available students in class:", classStudents.length)
    
    const checkFingerprint = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/fingerprint/identify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: activeSession.id }),
        })
        
        const data = await response.json()

        console.log("👆 Fingerprint API response:", data)

        if (data.success && data.fingerprintId) {
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
          console.log("👆 FINGERPRINT MATCH DETECTED")
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
          console.log("🔍 Searching for student with fingerprintId:", data.fingerprintId)
          console.log("   Type:", typeof data.fingerprintId)
          console.log("")
          console.log("📋 Available students:")
          classStudents.forEach(s => {
            console.log(`  • ${s.firstName} ${s.lastName}`)
            console.log(`    fingerprintId: ${s.fingerprintId} (type: ${typeof s.fingerprintId})`)
            console.log(`    Match: ${s.fingerprintId === data.fingerprintId || String(s.fingerprintId) === String(data.fingerprintId)}`)
          })
          
          // Try to find student by fingerprintId (handle both string and number)
          const student = classStudents.find((s) => 
            s.fingerprintId === data.fingerprintId || 
            String(s.fingerprintId) === String(data.fingerprintId) ||
            s.fingerprintId === String(data.fingerprintId) ||
            Number(s.fingerprintId) === Number(data.fingerprintId)
          )
          
          console.log("")
          if (student) {
            console.log("✅ STUDENT FOUND:", student.firstName, student.lastName)
            console.log("   Student DB ID:", student.id)
            console.log("   Already verified?", fingerprintVerified.has(student.id))
            
            if (!fingerprintVerified.has(student.id)) {
              console.log("📝 Recording new fingerprint attendance...")
              
              // Add to fingerprint matches list
              const newMatch = {
                fingerprintId: Number(data.fingerprintId),
                studentId: student.id,
                studentName: `${student.firstName} ${student.lastName}`,
                confidence: data.confidence || 0,
                timestamp: new Date(),
              }
              
              setFingerprintMatches(prev => [...prev, newMatch])
              setRecentFingerprintMatch({
                studentName: newMatch.studentName,
                timestamp: newMatch.timestamp,
              })
              
              // Clear the flash after 3 seconds
              setTimeout(() => {
                setRecentFingerprintMatch(null)
              }, 3000)
              
              await recordAttendance(activeSession.id, student.id, "fingerprint", data.confidence)
            } else {
              console.log("⚠️ Student already verified - skipping duplicate")
            }
          } else {
            console.warn("❌ NO STUDENT FOUND with fingerprintId:", data.fingerprintId)
            console.warn("   This fingerprint is not registered to any student in this class")
            
            toast({
              title: "Unknown Fingerprint",
              description: `Fingerprint ID ${data.fingerprintId} not registered in this class`,
              variant: "destructive",
            })
          }
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        }
      } catch (error) {
        console.error("❌ Fingerprint check error:", error)
      }
    }

    const fpInterval = setInterval(checkFingerprint, 2000) // Check every 2 seconds
    return () => {
      console.log("🛑 Stopping fingerprint polling")
      clearInterval(fpInterval)
    }
  }, [activeSession, classStudents, fingerprintVerified, toast])

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

  // Handler for video attendance button
  const openVideoAttendance = (session: Session) => {
    setSelectedSessionForVideo(session)
    setVideoDialogOpen(true)
  }

  const handleVideoAttendanceComplete = () => {
    fetchSessions()
    if (activeSession && selectedSessionForVideo?.id === activeSession.id) {
      fetchAttendance(activeSession.id)
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
                  <div className="flex items-center gap-3">
                    {getStatusBadge(session.status)}
                    {/* Video Attendance Button - Only show for ACTIVE sessions */}
                    {session.status === "ACTIVE" && (
                      <Button
                        onClick={() => openVideoAttendance(session)}
                        variant="outline"
                        className="border-purple-500 text-purple-600 hover:bg-purple-50"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Video Attendance
                      </Button>
                    )}
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
                <AttendanceCamera 
                  sessionId={activeSession.id}
                  onAttendanceMarked={handleAttendanceMarked}
                />
              </div>

              {/* Fingerprint Status */}
              <div className="space-y-4">
                <h3 className="font-semibold text-black">Fingerprint Verification</h3>
                <div 
                  className={`rounded-lg p-6 text-center transition-all ${
                    recentFingerprintMatch 
                      ? "bg-green-100 border-2 border-green-500" 
                      : "bg-[#F8FAFC]"
                  }`}
                >
                  <div className="w-20 h-20 bg-[#EBF5FF] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">
                      {recentFingerprintMatch ? "✓" : "👆"}
                    </span>
                  </div>
                  {recentFingerprintMatch ? (
                    <>
                      <p className="text-green-700 font-bold text-lg">✓ Match Found!</p>
                      <p className="text-green-600 font-medium">{recentFingerprintMatch.studentName}</p>
                      <p className="text-green-500 text-xs mt-1">
                        {recentFingerprintMatch.timestamp.toLocaleTimeString()}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-black font-medium">Scanner Ready</p>
                      <p className="text-[#64748B] text-sm mt-2">
                        Place finger on scanner
                      </p>
                    </>
                  )}
                </div>

                {/* Fingerprint Matches List */}
                {fingerprintMatches.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-black flex items-center justify-between">
                      <span>👆 Fingerprint Matches ({fingerprintMatches.length})</span>
                    </h4>
                    <div className="max-h-48 overflow-y-auto space-y-2 bg-green-50 rounded-lg p-3">
                      {fingerprintMatches.map((match, idx) => (
                        <div
                          key={`${match.fingerprintId}-${idx}`}
                          className="flex items-center justify-between p-2 bg-white rounded border border-green-200 hover:border-green-400 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-black">
                              ID: {match.fingerprintId}
                            </p>
                            <p className="text-sm text-green-700 font-semibold">
                              {match.studentName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-[#64748B]">
                              {match.timestamp.toLocaleTimeString()}
                            </p>
                            <Badge className="bg-green-100 text-green-700 text-xs mt-1">
                              Conf: {match.confidence}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Attendance List */}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  <h4 className="font-medium text-black">Recent Attendance</h4>
                  {attendanceRecords.length === 0 ? (
                    <p className="text-sm text-[#64748B] text-center py-4">
                      No attendance marked yet
                    </p>
                  ) : (
                    attendanceRecords.slice(-5).reverse().map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-sm">
                          {record.student?.firstName} {record.student?.lastName}
                        </span>
                        <div className="flex gap-1">
                          {record.faceRecognizedAt && (
                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                              📷 Face
                            </Badge>
                          )}
                          {record.fingerprintVerifiedAt && (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              👆 Print
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
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
                onClick={() => openVideoAttendance(activeSession)}
                variant="outline"
                className="border-purple-500 text-purple-600 hover:bg-purple-50"
              >
                <Video className="w-4 h-4 mr-2" />
                Video Attendance
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

      {/* Video Attendance Dialog */}
      {selectedSessionForVideo && (
        <VideoAttendanceDialog
          open={videoDialogOpen}
          onOpenChange={setVideoDialogOpen}
          sessionId={selectedSessionForVideo.id}
          classId={selectedSessionForVideo.classId}
          className={`${selectedSessionForVideo.class?.grade}-${selectedSessionForVideo.class?.section}`}
          subject={selectedSessionForVideo.subject}
          onAttendanceMarked={handleVideoAttendanceComplete}
        />
      )}
    </PageContainer>
  )
}
