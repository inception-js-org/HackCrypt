import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const grievances = [
  { id: 1, student: "Alex Student", subject: "Attendance discrepancy", date: "2026-01-15", status: "pending" },
  { id: 2, student: "Jane Doe", subject: "Face recognition not working", date: "2026-01-14", status: "pending" },
  { id: 3, student: "Mike Johnson", subject: "Wrong class assigned", date: "2026-01-12", status: "resolved" },
]

export default function TeacherGrievancesPage() {
  return (
    <PageContainer title="Grievances" description="Review and respond to student grievances">
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Total Received</p>
            <p className="text-3xl font-bold text-black mt-2">3</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Pending Review</p>
            <p className="text-3xl font-bold text-[#F59E0B] mt-2">2</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Resolved</p>
            <p className="text-3xl font-bold text-green-600 mt-2">1</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-black">Student Grievances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {grievances.map((grievance) => (
              <div key={grievance.id} className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg">
                <div>
                  <p className="font-medium text-black">{grievance.subject}</p>
                  <p className="text-sm text-[#64748B]">
                    From: {grievance.student} • {grievance.date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    className={grievance.status === "resolved" ? "bg-green-600 text-white" : "bg-[#F59E0B] text-white"}
                  >
                    {grievance.status}
                  </Badge>
                  {grievance.status === "pending" && (
                    <Button size="sm" className="bg-[#3B82F6] hover:bg-[#2563EB] text-white">
                      Review
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
