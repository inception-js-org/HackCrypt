import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function AdminAttendancePage() {
  return (
    <PageContainer title="System Attendance" description="Overview of all attendance across the institution">
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Total Students</p>
            <p className="text-3xl font-bold text-black mt-2">450</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Present Today</p>
            <p className="text-3xl font-bold text-green-600 mt-2">423</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Absent Today</p>
            <p className="text-3xl font-bold text-red-600 mt-2">27</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Overall Rate</p>
            <p className="text-3xl font-bold text-[#3B82F6] mt-2">94%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-black">Class-wise Attendance Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-black font-semibold">Class</th>
                  <th className="px-4 py-3 text-left text-black font-semibold">Total</th>
                  <th className="px-4 py-3 text-left text-black font-semibold">Present</th>
                  <th className="px-4 py-3 text-left text-black font-semibold">Absent</th>
                  <th className="px-4 py-3 text-left text-black font-semibold">Rate</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { cls: "12-A", total: 35, present: 33, absent: 2 },
                  { cls: "12-B", total: 30, present: 29, absent: 1 },
                  { cls: "11-A", total: 32, present: 30, absent: 2 },
                  { cls: "11-B", total: 32, present: 31, absent: 1 },
                  { cls: "10-A", total: 38, present: 35, absent: 3 },
                ].map((row) => (
                  <tr key={row.cls} className="border-b hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 font-medium text-black">Class {row.cls}</td>
                    <td className="px-4 py-3 text-[#64748B]">{row.total}</td>
                    <td className="px-4 py-3">
                      <Badge className="bg-green-600 text-white">{row.present}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="bg-red-600 text-white">{row.absent}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[#3B82F6] font-medium">
                      {Math.round((row.present / row.total) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
