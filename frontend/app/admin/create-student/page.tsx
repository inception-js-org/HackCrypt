"use client"

import { useState } from "react"
import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const recentStudents = [
  { id: "STU-2026-001", name: "Alex Student", class: "12-A", email: "alex@school.edu" },
  { id: "STU-2026-002", name: "Jane Doe", class: "11-B", email: "jane@school.edu" },
  { id: "STU-2026-003", name: "Mike Johnson", class: "10-A", email: "mike@school.edu" },
]

export default function CreateStudentPage() {
  const [step, setStep] = useState(1)

  return (
    <PageContainer title="Create Student" description="Add a new student to the system">
      <div className="grid lg:grid-cols-2 gap-8">
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-[#3B82F6] text-white rounded-t-lg">
            <CardTitle>New Student Registration</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {step === 1 && (
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-black">
                      First Name
                    </Label>
                    <Input id="firstName" placeholder="Enter first name" className="border-[#E2E8F0]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-black">
                      Last Name
                    </Label>
                    <Input id="lastName" placeholder="Enter last name" className="border-[#E2E8F0]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-black">
                    Email
                  </Label>
                  <Input id="email" type="email" placeholder="student@school.edu" className="border-[#E2E8F0]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-black">
                    Phone Number
                  </Label>
                  <Input id="phone" type="tel" placeholder="+1 234 567 8900" className="border-[#E2E8F0]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-black">Class</Label>
                  <Select>
                    <SelectTrigger className="border-[#E2E8F0]">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12-A">Class 12-A</SelectItem>
                      <SelectItem value="12-B">Class 12-B</SelectItem>
                      <SelectItem value="11-A">Class 11-A</SelectItem>
                      <SelectItem value="11-B">Class 11-B</SelectItem>
                      <SelectItem value="10-A">Class 10-A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                >
                  Next: Biometric Setup
                </Button>
              </form>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center py-8 bg-[#F8FAFC] rounded-lg">
                  <div className="w-24 h-24 bg-[#EBF5FF] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">📷</span>
                  </div>
                  <p className="text-black font-medium mb-2">Face Registration</p>
                  <p className="text-[#64748B] mb-4">Capture student face for recognition</p>
                  <div className="flex gap-4 justify-center">
                    <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white">Capture Face</Button>
                    <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white">Upload Photo</Button>
                  </div>
                </div>

                <div className="text-center py-8 bg-[#F8FAFC] rounded-lg">
                  <div className="w-24 h-24 bg-[#EBF5FF] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">👆</span>
                  </div>
                  <p className="text-black font-medium mb-2">Fingerprint Registration</p>
                  <p className="text-[#64748B] mb-4">Scan student fingerprint for verification</p>
                  <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white">Scan Fingerprint</Button>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 border-[#3B82F6] text-[#3B82F6]"
                  >
                    Back
                  </Button>
                  <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white">Create Student</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-black">Recently Added Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg">
                  <div>
                    <p className="font-medium text-black">{student.name}</p>
                    <p className="text-sm text-[#64748B]">
                      {student.id} • Class {student.class}
                    </p>
                  </div>
                  <span className="text-[#64748B] text-sm">{student.email}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
