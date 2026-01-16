"use client"

import { useState, useEffect } from "react"
import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface Faculty {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
  email: string;
}

export default function CreateTeacherPage() {
  const { toast } = useToast()
  const [recentTeachers, setRecentTeachers] = useState<Faculty[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    assignedClasses: [] as string[],
  })

  useEffect(() => {
    fetchRecentTeachers()
  }, [])

  const fetchRecentTeachers = async () => {
    try {
      const response = await fetch("/api/faculty")
      const data = await response.json()
      if (data.success) {
        setRecentTeachers(data.faculty.slice(0, 3))
      }
    } catch (error) {
      console.error("Error fetching teachers:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Step 1: Create faculty in database
      const response = await fetch("/api/faculty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to create teacher")
      }

      // Step 2: Send invitation email (using faculty route)
      const invitationResponse = await fetch("/api/faculty/send-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facultyDbId: data.faculty.id.toString(),
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      })

      const invitationData = await invitationResponse.json()

      if (!invitationData.success) {
        throw new Error(invitationData.error || "Failed to send invitation")
      }

      toast({
        title: "Success!",
        description: `Teacher ${data.faculty.employeeId} created successfully! Invitation email sent to ${formData.email}`,
      })

      // Reset form and refresh
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        department: "",
        designation: "",
        assignedClasses: [],
      })
      fetchRecentTeachers()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageContainer title="Create Teacher" description="Add a new teacher to the system">
      <div className="grid lg:grid-cols-2 gap-8">
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-[#3B82F6] text-white rounded-t-lg">
            <CardTitle>New Teacher Registration</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-black">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="Enter first name"
                    className="border-[#E2E8F0]"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-black">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Enter last name"
                    className="border-[#E2E8F0]"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-black">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="teacher@school.edu"
                  className="border-[#E2E8F0]"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-black">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  className="border-[#E2E8F0]"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-black">Department</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                  required
                >
                  <SelectTrigger className="border-[#E2E8F0]">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="Physics">Physics</SelectItem>
                    <SelectItem value="Chemistry">Chemistry</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Computer Science">Computer Science</SelectItem>
                    <SelectItem value="Biology">Biology</SelectItem>
                    <SelectItem value="History">History</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-black">Designation</Label>
                <Select
                  value={formData.designation}
                  onValueChange={(value) => setFormData({ ...formData, designation: value })}
                >
                  <SelectTrigger className="border-[#E2E8F0]">
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Professor">Professor</SelectItem>
                    <SelectItem value="Assistant Professor">Assistant Professor</SelectItem>
                    <SelectItem value="Associate Professor">Associate Professor</SelectItem>
                    <SelectItem value="Lecturer">Lecturer</SelectItem>
                    <SelectItem value="Senior Lecturer">Senior Lecturer</SelectItem>
                    <SelectItem value="Teaching Assistant">Teaching Assistant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-black">Assigned Classes (Multi-select)</Label>
                <Select
                  value={formData.assignedClasses[0] || ""}
                  onValueChange={(value) => {
                    if (!formData.assignedClasses.includes(value)) {
                      setFormData({ ...formData, assignedClasses: [...formData.assignedClasses, value] })
                    }
                  }}
                >
                  <SelectTrigger className="border-[#E2E8F0]">
                    <SelectValue placeholder="Select classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12-A">Class 12-A</SelectItem>
                    <SelectItem value="12-B">Class 12-B</SelectItem>
                    <SelectItem value="11-A">Class 11-A</SelectItem>
                    <SelectItem value="11-B">Class 11-B</SelectItem>
                    <SelectItem value="10-A">Class 10-A</SelectItem>
                    <SelectItem value="10-B">Class 10-B</SelectItem>
                  </SelectContent>
                </Select>
                {formData.assignedClasses.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.assignedClasses.map((classId) => (
                      <span
                        key={classId}
                        className="px-3 py-1 bg-[#EBF5FF] text-[#3B82F6] rounded-full text-sm flex items-center gap-2"
                      >
                        {classId}
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              assignedClasses: formData.assignedClasses.filter((c) => c !== classId),
                            })
                          }
                          className="hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Teacher"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-black">Recently Added Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTeachers.length > 0 ? (
                recentTeachers.map((teacher) => (
                  <div key={teacher.id} className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg">
                    <div>
                      <p className="font-medium text-black">{teacher.firstName} {teacher.lastName}</p>
                      <p className="text-sm text-[#64748B]">
                        {teacher.employeeId} • {teacher.department}
                      </p>
                    </div>
                    <span className="text-[#64748B] text-sm">{teacher.email}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-[#64748B] py-8">No teachers added yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}