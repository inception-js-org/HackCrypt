"use client"

import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

interface AnalyticsData {
  student: {
    id: number
    firstName: string
    lastName: string
    class: string
  }
  statistics: {
    overallAttendance: number
    totalClasses: number
    classesAttended: number
    currentStreak: number
    daysAttended: number
    daysInMonth: number
    monthlyAttendancePercentage: number
  }
  attendanceBySubject: Array<{
    subject: string
    percentage: number
    attended: number
    total: number
  }>
  attendanceByMonth: Array<{
    month: string
    percentage: number
    attended: number
    total: number
  }>
}

export default function StudentAnalyticsPage() {
  const { user, isLoaded } = useUser()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        console.log("Fetching analytics for user:", user.id)
        setLoading(true)
        setError(null)

        const url = `/api/students/analytics?clerkUserId=${user.id}`
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
        description="View your attendance statistics and trends"
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
        description="View your attendance statistics and trends"
      >
        <div className="flex items-center justify-center h-64">
          <p className="text-red-600">{error || "No analytics data available"}</p>
        </div>
      </PageContainer>
    )
  }

  const { statistics, attendanceBySubject, attendanceByMonth } = analytics

  return (
    <PageContainer
      title="Analytics"
      description="View your attendance statistics and trends"
    >
      <div className="grid md:grid-cols-3 gap-4 mb-4">
        <StatCard
          title="Overall Attendance"
          value={`${statistics.overallAttendance}%`}
        />
        <StatCard
          title="Classes Attended"
          value={statistics.classesAttended.toString()}
          subtitle={`out of ${statistics.totalClasses}`}
        />
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-black text-sm">This Month</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex justify-center items-center py-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Attended", value: statistics.monthlyAttendancePercentage },
                      { name: "Remaining", value: 100 - statistics.monthlyAttendancePercentage },
                    ]}
                    cx="50%"
                    cy="50%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                  >
                    <Cell fill="#3B82F6" />
                    <Cell fill="#E2E8F0" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-black">{statistics.daysAttended}</p>
              <p className="text-sm text-[#64748B]">out of {statistics.daysInMonth} days</p>
              <p className="text-lg font-semibold text-[#3B82F6] mt-2">{statistics.monthlyAttendancePercentage}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-black">Attendance by Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {attendanceBySubject.length > 0 ? (
                attendanceBySubject.map((item) => (
                  <SubjectBar
                    key={item.subject}
                    subject={item.subject}
                    percentage={item.percentage}
                  />
                ))
              ) : (
                <p className="text-[#64748B] text-sm">No subject data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-black">Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {attendanceByMonth.length > 0 ? (
                attendanceByMonth.map((item) => (
                  <MonthBar
                    key={item.month}
                    month={item.month}
                    percentage={item.percentage}
                  />
                ))
              ) : (
                <p className="text-[#64748B] text-sm">No monthly data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  trend,
}: { title: string; value: string; subtitle?: string; trend?: string }) {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="pt-6">
        <p className="text-[#64748B] text-sm">{title}</p>
        <div className="flex items-end gap-2 mt-2">
          <span className="text-3xl font-bold text-black">{value}</span>
          {trend && <span className="text-green-600 text-sm font-medium">{trend}</span>}
        </div>
        {subtitle && <p className="text-[#64748B] text-sm mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

function SubjectBar({ subject, percentage }: { subject: string; percentage: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-black">{subject}</span>
        <span className="text-[#64748B]">{percentage}%</span>
      </div>
      <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
        <div className="h-full bg-[#3B82F6] rounded-full transition-all" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

function MonthBar({ month, percentage }: { month: string; percentage: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-black">{month}</span>
        <span className="text-[#64748B]">{percentage}%</span>
      </div>
      <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
        <div className="h-full bg-black rounded-full transition-all" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}