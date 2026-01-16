"use client"

import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function TeacherChangePasswordPage() {
  return (
    <PageContainer title="Change Password" description="Update your account password">
      <Card className="border-0 shadow-lg max-w-md">
        <CardHeader>
          <CardTitle className="text-black">Password Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-black">
                Current Password
              </Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Enter current password"
                className="border-[#E2E8F0]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-black">
                New Password
              </Label>
              <Input id="newPassword" type="password" placeholder="Enter new password" className="border-[#E2E8F0]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-black">
                Confirm New Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                className="border-[#E2E8F0]"
              />
            </div>
            <Button type="submit" className="bg-[#3B82F6] hover:bg-[#2563EB] text-white w-full">
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
