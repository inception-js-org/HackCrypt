import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TeacherAnalyticsPage() {
  return (
    <PageContainer title="Analytics" description="View class attendance statistics and insights">
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Total Classes</p>
            <p className="text-3xl font-bold text-black mt-2">4</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Total Students</p>
            <p className="text-3xl font-bold text-[#3B82F6] mt-2">135</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Avg. Attendance</p>
            <p className="text-3xl font-bold text-green-600 mt-2">94%</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Anomalies Detected</p>
            <p className="text-3xl font-bold text-[#F59E0B] mt-2">3</p>
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
              <ClassBar className="12-A" attendance={96} students={35} />
              <ClassBar className="11-B" attendance={92} students={32} />
              <ClassBar className="12-B" attendance={94} students={30} />
              <ClassBar className="10-A" attendance={91} students={38} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-black">Anomaly Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <AnomalyItem
                title="Unusual pattern detected"
                description="Student John D. marked present but ID scan shows different location"
                type="warning"
              />
              <AnomalyItem
                title="Multiple face detections"
                description="Same face detected from two different devices simultaneously"
                type="error"
              />
              <AnomalyItem
                title="Late arrival trend"
                description="5 students consistently arriving late to first period"
                type="info"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}

function ClassBar({ className, attendance, students }: { className: string; attendance: number; students: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-black font-medium">Class {className}</span>
        <span className="text-[#64748B]">
          {attendance}% • {students} students
        </span>
      </div>
      <div className="h-3 bg-[#E2E8F0] rounded-full overflow-hidden">
        <div className="h-full bg-[#3B82F6] rounded-full transition-all" style={{ width: `${attendance}%` }} />
      </div>
    </div>
  )
}

function AnomalyItem({
  title,
  description,
  type,
}: { title: string; description: string; type: "warning" | "error" | "info" }) {
  const colors = {
    warning: "border-l-[#F59E0B] bg-[#FFFBEB]",
    error: "border-l-red-600 bg-red-50",
    info: "border-l-[#3B82F6] bg-[#EBF5FF]",
  }

  return (
    <div className={`p-4 rounded-lg border-l-4 ${colors[type]}`}>
      <p className="font-medium text-black">{title}</p>
      <p className="text-sm text-[#64748B] mt-1">{description}</p>
    </div>
  )
}
