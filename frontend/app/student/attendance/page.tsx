import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const attendanceRecords = [
  { date: "2026-01-15", day: "Wednesday", status: "present", subject: "Mathematics" },
  { date: "2026-01-14", day: "Tuesday", status: "present", subject: "Physics" },
  { date: "2026-01-13", day: "Monday", status: "absent", subject: "Chemistry" },
  { date: "2026-01-10", day: "Friday", status: "present", subject: "English" },
  { date: "2026-01-09", day: "Thursday", status: "present", subject: "Computer Science" },
  { date: "2026-01-08", day: "Wednesday", status: "late", subject: "Mathematics" },
  { date: "2026-01-07", day: "Tuesday", status: "present", subject: "Physics" },
]

export default function StudentAttendancePage() {
  return (
    <PageContainer title="Attendance" description="View your attendance records">
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Present</p>
            <p className="text-3xl font-bold text-green-600 mt-2">156</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Absent</p>
            <p className="text-3xl font-bold text-red-600 mt-2">8</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Late</p>
            <p className="text-3xl font-bold text-[#F59E0B] mt-2">6</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Percentage</p>
            <p className="text-3xl font-bold text-[#3B82F6] mt-2">92%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-black">Recent Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-black font-semibold">Date</th>
                  <th className="px-4 py-3 text-left text-black font-semibold">Day</th>
                  <th className="px-4 py-3 text-left text-black font-semibold">Subject</th>
                  <th className="px-4 py-3 text-left text-black font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record, index) => (
                  <tr key={index} className="border-b hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 text-[#64748B]">{record.date}</td>
                    <td className="px-4 py-3 text-black">{record.day}</td>
                    <td className="px-4 py-3 text-black">{record.subject}</td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          record.status === "present"
                            ? "bg-green-600 text-white"
                            : record.status === "absent"
                              ? "bg-red-600 text-white"
                              : "bg-[#F59E0B] text-white"
                        }
                      >
                        {record.status}
                      </Badge>
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
