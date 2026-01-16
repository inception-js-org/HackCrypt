import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function StudentAnalyticsPage() {
  return (
    <PageContainer title="Analytics" description="View your attendance statistics and trends">
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Overall Attendance" value="92%" trend="+2%" />
        <StatCard title="Classes Attended" value="156" subtitle="out of 170" />
        <StatCard title="Current Streak" value="12 days" subtitle="Keep it up!" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-black">Attendance by Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <SubjectBar subject="Mathematics" percentage={95} />
              <SubjectBar subject="Physics" percentage={88} />
              <SubjectBar subject="Chemistry" percentage={92} />
              <SubjectBar subject="English" percentage={96} />
              <SubjectBar subject="Computer Science" percentage={90} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-black">Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <MonthBar month="September" percentage={94} />
              <MonthBar month="October" percentage={91} />
              <MonthBar month="November" percentage={89} />
              <MonthBar month="December" percentage={95} />
              <MonthBar month="January" percentage={92} />
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
