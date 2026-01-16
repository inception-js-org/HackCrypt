"use client"

import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AdminEditDetailsPage() {
  return (
    <PageContainer title="Edit Details" description="Update admin profile information">
      <Card className="border-0 shadow-lg max-w-2xl">
        <CardHeader>
          <CardTitle className="text-black">Admin Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-black">
                  First Name
                </Label>
                <Input id="firstName" defaultValue="Admin" className="border-[#E2E8F0]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-black">
                  Last Name
                </Label>
                <Input id="lastName" defaultValue="User" className="border-[#E2E8F0]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-black">
                Email
              </Label>
              <Input id="email" type="email" defaultValue="admin@school.edu" className="border-[#E2E8F0]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-black">
                Phone Number
              </Label>
              <Input id="phone" type="tel" defaultValue="+1 234 567 8902" className="border-[#E2E8F0]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminId" className="text-black">
                Admin ID
              </Label>
              <Input id="adminId" defaultValue="ADM-2026-001" disabled className="border-[#E2E8F0] bg-[#F8FAFC]" />
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
