"use client"

import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface ClassPerformance {
  className: string
  attendance: number
  students: number
  present: number
  total: number
}

interface Anomaly {
  id: number
  reason: string
  resolved: boolean
  createdAt: Date
}

interface TeacherAnalyticsData {
  teacher: {
    id: number
    firstName: string
    lastName: string
    department: string
  }
  statistics: {
    totalClasses: number
    totalStudents: number
    averageAttendance: number
    anomaliesDetected: number
  }
  classPerformance: ClassPerformance[]
  recentAnomalies: Anomaly[]
  subjects: string[]
  subjectAttendanceData: Record<
    string,
    Array<{ date: string; originalDate: string; studentsPresent: number }>
  >
  subjectDateRanges: Record<string, string>
}

export default function TeacherAnalyticsPage() {
  const { user, isLoaded } = useUser()
  const [analytics, setAnalytics] = useState<TeacherAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string>("")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (!user) {
      setError("Please sign in to view analytics")
      setLoading(false)
      return
    }

    const fetchAnalytics = async () => {
      try {
        console.log("Fetching teacher analytics for:", user.id)
        setLoading(true)
        setError(null)

        const url = `/api/faculty/analytics?clerkUserId=${user.id}`
        console.log("Requesting:", url)

        const response = await fetch(url)
        console.log("Response status:", response.status)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        const data = await response.json()
        console.log("Analytics data received:", data)
        setAnalytics(data)
        // Set first subject as default
        if (data.subjects && data.subjects.length > 0) {
          setSelectedSubject(data.subjects[0])
          
          // Set initial date range to full range of first subject
          const firstSubjectData = data.subjectAttendanceData[data.subjects[0]]
          if (firstSubjectData && firstSubjectData.length > 0) {
            const firstDate = firstSubjectData[0].originalDate
            const lastDate = firstSubjectData[firstSubjectData.length - 1].originalDate
            setStartDate(firstDate)
            setEndDate(lastDate)
          }
        }
        setError(null)
      } catch (err) {
        console.error("Error fetching analytics:", err)
        setError(
          err instanceof Error ? err.message : "Failed to fetch analytics data"
        )
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [user, isLoaded])

  if (loading) {
    return (
      <PageContainer
        title="Analytics"
        description="View class attendance statistics and insights"
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-[#64748B]">Loading your analytics...</p>
          <p className="text-sm text-gray-500">Check browser console for details</p>
        </div>
      </PageContainer>
    )
  }

  if (error || !analytics) {
    return (
      <PageContainer
        title="Analytics"
        description="View class attendance statistics and insights"
      >
        <div className="flex items-center justify-center h-64">
          <p className="text-red-600">{error || "No analytics data available"}</p>
        </div>
      </PageContainer>
    )
  }

  const { statistics, classPerformance, recentAnomalies } = analytics

  return (
    <PageContainer
      title="Analytics"
      description="View class attendance statistics and insights"
    >
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Total Classes</p>
            <p className="text-3xl font-bold text-black mt-2">
              {statistics.totalClasses}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Total Students</p>
            <p className="text-3xl font-bold text-[#3B82F6] mt-2">
              {statistics.totalStudents}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Avg. Attendance</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {statistics.averageAttendance}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Anomalies Detected</p>
            <p className="text-3xl font-bold text-[#F59E0B] mt-2">
              {statistics.anomaliesDetected}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-black">Class Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {classPerformance.length > 0 ? (
                classPerformance.map((perf) => (
                  <ClassBar
                    key={perf.className}
                    className={perf.className}
                    attendance={perf.attendance}
                    students={perf.students}
                    present={perf.present}
                    total={perf.total}
                  />
                ))
              ) : (
                <p className="text-[#64748B] text-sm">No class data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-black">Anomaly Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAnomalies.length > 0 ? (
                recentAnomalies.map((anomaly) => (
                  <AnomalyItem
                    key={anomaly.id}
                    reason={anomaly.reason}
                    resolved={anomaly.resolved}
                  />
                ))
              ) : (
                <p className="text-[#64748B] text-sm">No anomalies detected</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {analytics.subjects && analytics.subjects.length > 0 && (
        <Card className="border-0 shadow-lg mt-6">
          <CardHeader>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-black">Attendance Trend by Subject</CardTitle>
                <select
                  value={selectedSubject}
                  onChange={(e) => {
                    const newSubject = e.target.value
                    setSelectedSubject(newSubject)
                    // Update date range for new subject
                    const subjectData = analytics.subjectAttendanceData[newSubject]
                    if (subjectData && subjectData.length > 0) {
                      setStartDate(subjectData[0].originalDate)
                      setEndDate(subjectData[subjectData.length - 1].originalDate)
                    }
                  }}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                >
                  {analytics.subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filters */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#64748B] block mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#64748B] block mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedSubject && analytics.subjectAttendanceData[selectedSubject] && (
              <>
                {(() => {
                  // Filter data based on date range
                  const allData = analytics.subjectAttendanceData[selectedSubject]
                  const filteredData = allData.filter((item) => {
                    const itemDate = new Date(item.originalDate)
                    const start = new Date(startDate)
                    const end = new Date(endDate)
                    return itemDate >= start && itemDate <= end
                  })

                  return (
                    <div>
                      <p className="text-sm text-[#64748B] mb-4">
                        Showing {filteredData.length} of {allData.length} sessions
                      </p>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={filteredData.length > 0 ? filteredData : allData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis label={{ value: "Students Present", angle: -90, position: "insideLeft" }} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="studentsPresent"
                            stroke="#3B82F6"
                            dot={{ fill: "#3B82F6" }}
                            activeDot={{ r: 6 }}
                            name="Students Present"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )
                })()}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}

function ClassBar({ className, attendance, students, present, total }: { className: string; attendance: number; students: number; present: number; total: number }) {
  return (
    <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-black font-bold text-lg">Class {className}</span>
          <p className="text-sm text-[#64748B] mt-1">{students} students in class</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-[#3B82F6]">{attendance}%</p>
          <p className="text-xs text-[#64748B]">Attendance rate</p>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#3B82F6] rounded-full transition-all" 
            style={{ width: `${attendance}%` }} 
          />
        </div>
        <div className="flex justify-between text-xs text-[#64748B]">
          <span>{present} students attended</span>
          <span>{total} total sessions</span>
        </div>
      </div>
    </div>
  )
}

function AnomalyItem({ reason, resolved }: { reason: string; resolved: boolean }) {
  const reasonMessages: Record<string, { title: string; description: string; type: "warning" | "error" | "info" }> = {
    duplicate_face: {
      title: "Duplicate Face Detection",
      description: "Same face detected from multiple students",
      type: "error",
    },
    duplicate_fingerprint: {
      title: "Duplicate Fingerprint",
      description: "Same fingerprint detected from multiple students",
      type: "error",
    },
    low_confidence: {
      title: "Low Confidence Match",
      description: "Face recognition confidence below threshold",
      type: "warning",
    },
    mismatch: {
      title: "Biometric Mismatch",
      description: "Face and fingerprint do not match the same student",
      type: "warning",
    },
  }

  const config = reasonMessages[reason] || {
    title: "Attendance Anomaly",
    description: reason,
    type: "info" as const,
  }

  const colors = {
    warning: "border-l-[#F59E0B] bg-[#FFFBEB]",
    error: "border-l-red-600 bg-red-50",
    info: "border-l-[#3B82F6] bg-[#EBF5FF]",
  }

  return (
    <div className={`p-4 rounded-lg border-l-4 ${colors[config.type]}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-black">{config.title}</p>
          <p className="text-sm text-[#64748B] mt-1">{config.description}</p>
        </div>
        {resolved && (
          <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
            Resolved
          </span>
        )}
      </div>
    </div>
  )
}