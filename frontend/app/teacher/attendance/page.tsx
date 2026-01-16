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
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-black font-semibold">Date</th>
                  <th className="px-4 py-3 text-left text-black font-semibold">Class</th>
                  <th className="px-4 py-3 text-left text-black font-semibold">Present</th>
                  <th className="px-4 py-3 text-left text-black font-semibold">Absent</th>
                  <th className="px-4 py-3 text-left text-black font-semibold">Late</th>
                  <th className="px-4 py-3 text-left text-black font-semibold">Rate</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record, index) => {
                  const total = record.present + record.absent + record.late
                  const rate = Math.round((record.present / total) * 100)
                  return (
                    <tr key={index} className="border-b hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 text-[#64748B]">{record.date}</td>
                      <td className="px-4 py-3 text-black font-medium">{record.class}</td>
                      <td className="px-4 py-3">
                        <Badge className="bg-green-600 text-white">{record.present}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-red-600 text-white">{record.absent}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-[#F59E0B] text-white">{record.late}</Badge>
                      </td>
                      <td className="px-4 py-3 text-[#3B82F6] font-medium">{rate}%</td>
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
