import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const timetableData = [
  {
    time: "09:00 - 10:00",
    monday: "Mathematics",
    tuesday: "Physics",
    wednesday: "Chemistry",
    thursday: "English",
    friday: "Computer Science",
  },
  {
    time: "10:00 - 11:00",
    monday: "Physics",
    tuesday: "Chemistry",
    wednesday: "Mathematics",
    thursday: "Computer Science",
    friday: "English",
  },
  { time: "11:00 - 11:30", monday: "Break", tuesday: "Break", wednesday: "Break", thursday: "Break", friday: "Break" },
  {
    time: "11:30 - 12:30",
    monday: "English",
    tuesday: "Mathematics",
    wednesday: "Physics",
    thursday: "Chemistry",
    friday: "Mathematics",
  },
  {
    time: "12:30 - 01:30",
    monday: "Computer Science",
    tuesday: "English",
    wednesday: "Computer Science",
    thursday: "Physics",
    friday: "Chemistry",
  },
  { time: "01:30 - 02:30", monday: "Lunch", tuesday: "Lunch", wednesday: "Lunch", thursday: "Lunch", friday: "Lunch" },
  {
    time: "02:30 - 03:30",
    monday: "Chemistry",
    tuesday: "Computer Science",
    wednesday: "English",
    thursday: "Mathematics",
    friday: "Physics",
  },
]

export default function StudentTimetablePage() {
  return (
    <PageContainer title="Timetable" description="View your weekly class schedule">
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-[#3B82F6] text-white">
          <CardTitle>Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  <th className="px-4 py-3 text-left text-black font-semibold border-b">Time</th>
                  <th className="px-4 py-3 text-left text-black font-semibold border-b">Monday</th>
                  <th className="px-4 py-3 text-left text-black font-semibold border-b">Tuesday</th>
                  <th className="px-4 py-3 text-left text-black font-semibold border-b">Wednesday</th>
                  <th className="px-4 py-3 text-left text-black font-semibold border-b">Thursday</th>
                  <th className="px-4 py-3 text-left text-black font-semibold border-b">Friday</th>
                </tr>
              </thead>
              <tbody>
                {timetableData.map((row, index) => (
                  <tr key={index} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 border-b text-[#64748B] font-medium">{row.time}</td>
                    <td
                      className={`px-4 py-3 border-b ${row.monday === "Break" || row.monday === "Lunch" ? "text-[#64748B] italic" : "text-black"}`}
                    >
                      {row.monday}
                    </td>
                    <td
                      className={`px-4 py-3 border-b ${row.tuesday === "Break" || row.tuesday === "Lunch" ? "text-[#64748B] italic" : "text-black"}`}
                    >
                      {row.tuesday}
                    </td>
                    <td
                      className={`px-4 py-3 border-b ${row.wednesday === "Break" || row.wednesday === "Lunch" ? "text-[#64748B] italic" : "text-black"}`}
                    >
                      {row.wednesday}
                    </td>
                    <td
                      className={`px-4 py-3 border-b ${row.thursday === "Break" || row.thursday === "Lunch" ? "text-[#64748B] italic" : "text-black"}`}
                    >
                      {row.thursday}
                    </td>
                    <td
                      className={`px-4 py-3 border-b ${row.friday === "Break" || row.friday === "Lunch" ? "text-[#64748B] italic" : "text-black"}`}
                    >
                      {row.friday}
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
