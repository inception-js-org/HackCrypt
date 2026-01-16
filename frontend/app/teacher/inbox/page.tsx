import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const messages = [
  { id: 1, from: "Admin Office", subject: "New policy update", date: "2026-01-15", unread: true },
  { id: 2, from: "Principal", subject: "Staff meeting reminder", date: "2026-01-14", unread: true },
  { id: 3, from: "System", subject: "Anomaly report - Class 12-A", date: "2026-01-13", unread: false },
  { id: 4, from: "Alex Student", subject: "Grievance submitted", date: "2026-01-12", unread: false },
]

export default function TeacherInboxPage() {
  return (
    <PageContainer title="Inbox" description="View your messages and notifications">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-black flex items-center gap-2">
            Messages
            <Badge className="bg-[#3B82F6] text-white">2 new</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-center justify-between p-4 rounded-lg cursor-pointer hover:bg-[#F8FAFC] transition-colors ${
                  message.unread ? "bg-[#EBF5FF]" : "bg-white"
                }`}
              >
                <div className="flex items-center gap-4">
                  {message.unread && <div className="w-2 h-2 bg-[#3B82F6] rounded-full" />}
                  <div>
                    <p className={`font-medium ${message.unread ? "text-black" : "text-[#64748B]"}`}>{message.from}</p>
                    <p className={`text-sm ${message.unread ? "text-black" : "text-[#64748B]"}`}>{message.subject}</p>
                  </div>
                </div>
                <span className="text-sm text-[#64748B]">{message.date}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
