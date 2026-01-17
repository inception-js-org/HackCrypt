import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const attendanceRecords = [
  { date: "2026-01-15", class: "12-A", present: 33, absent: 2, late: 0 },
  { date: "2026-01-14", class: "11-B", present: 30, absent: 1, late: 1 },
  { date: "2026-01-13", class: "12-B", present: 28, absent: 2, late: 0 },
  { date: "2026-01-10", class: "10-A", present: 36, absent: 1, late: 1 },
]

export default function TeacherAttendancePage() {
  return (
    <PageContainer title="Attendance Records" description="View attendance history for your classes">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-black">Session Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F8FAFC]">
                <tr className="border-b border-[#E2E8F0]">
                  <th className="px-4 py-3 text-left text-[#64748B] font-semibold text-sm">Date</th>
                  <th className="px-4 py-3 text-left text-[#64748B] font-semibold text-sm">Class</th>
                  <th className="px-4 py-3 text-left text-[#64748B] font-semibold text-sm">Present</th>
                  <th className="px-4 py-3 text-left text-[#64748B] font-semibold text-sm">Absent</th>
                  <th className="px-4 py-3 text-left text-[#64748B] font-semibold text-sm">Late</th>
                  <th className="px-4 py-3 text-left text-[#64748B] font-semibold text-sm">Rate</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record, index) => {
                  const total = record.present + record.absent + record.late
                  const rate = Math.round((record.present / total) * 100)
                  return (
                    <tr key={index} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 text-[#64748B]">{record.date}</td>
                      <td className="px-4 py-3 text-black font-medium">{record.class}</td>
                      <td className="px-4 py-3">
                        <Badge className="bg-green-100 text-green-700">{record.present}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-red-100 text-red-700">{record.absent}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-orange-100 text-orange-700">{record.late}</Badge>
                      </td>
                      <td className="px-4 py-3 text-[#3B82F6] font-semibold">{rate}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
