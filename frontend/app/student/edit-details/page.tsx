"use client"

import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function StudentEditDetailsPage() {
  return (
    <PageContainer title="Edit Details" description="Update your profile information">
      <Card className="border-0 shadow-lg max-w-2xl">
        <CardHeader>
          <CardTitle className="text-black">Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-black">
                  First Name
                </Label>
                <Input id="firstName" defaultValue="Alex" className="border-[#E2E8F0]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-black">
                  Last Name
                </Label>
                <Input id="lastName" defaultValue="Student" className="border-[#E2E8F0]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-black">
                Email
              </Label>
              <Input id="email" type="email" defaultValue="alex.student@school.edu" className="border-[#E2E8F0]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-black">
                Phone Number
              </Label>
              <Input id="phone" type="tel" defaultValue="+1 234 567 8900" className="border-[#E2E8F0]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentId" className="text-black">
                Student ID
              </Label>
              <Input id="studentId" defaultValue="STU-2026-001" disabled className="border-[#E2E8F0] bg-[#F8FAFC]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class" className="text-black">
                Class
              </Label>
              <Input id="class" defaultValue="12-A" disabled className="border-[#E2E8F0] bg-[#F8FAFC]" />
            </div>
            <Button type="submit" className="bg-[#3B82F6] hover:bg-[#2563EB] text-white">
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
