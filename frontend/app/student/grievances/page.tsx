"use client"

import { useState } from "react"
import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

const existingGrievances = [
  { id: 1, subject: "Attendance discrepancy", status: "pending", date: "2026-01-10" },
  { id: 2, subject: "Face recognition issue", status: "resolved", date: "2026-01-05" },
  { id: 3, subject: "Wrong class assignment", status: "in-progress", date: "2026-01-08" },
]

export default function StudentGrievancesPage() {
  const [showForm, setShowForm] = useState(false)

  return (
    <PageContainer title="Grievances" description="Submit and track your grievances">
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Total Submitted</p>
            <p className="text-3xl font-bold text-black mt-2">3</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Pending</p>
            <p className="text-3xl font-bold text-[#F59E0B] mt-2">1</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[#64748B] text-sm">Resolved</p>
            <p className="text-3xl font-bold text-green-600 mt-2">1</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end mb-6">
        <Button onClick={() => setShowForm(!showForm)} className="bg-[#3B82F6] hover:bg-[#2563EB] text-white">
          {showForm ? "Cancel" : "New Grievance"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-0 shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="text-black">Submit New Grievance</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-black">
                  Subject
                </Label>
                <Input id="subject" placeholder="Brief description of the issue" className="border-[#E2E8F0]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-black">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Provide detailed information about your grievance"
                  rows={4}
                  className="border-[#E2E8F0]"
                />
              </div>
              <Button type="submit" className="bg-[#3B82F6] hover:bg-[#2563EB] text-white">
                Submit Grievance
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-black">Your Grievances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {existingGrievances.map((grievance) => (
              <div key={grievance.id} className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg">
                <div>
                  <p className="font-medium text-black">{grievance.subject}</p>
                  <p className="text-sm text-[#64748B]">{grievance.date}</p>
                </div>
                <Badge
                  variant={
                    grievance.status === "resolved"
                      ? "default"
                      : grievance.status === "pending"
                        ? "secondary"
                        : "outline"
                  }
                  className={
                    grievance.status === "resolved"
                      ? "bg-green-600 text-white"
                      : grievance.status === "pending"
                        ? "bg-[#F59E0B] text-white"
                        : "bg-[#3B82F6] text-white"
                  }
                >
                  {grievance.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
