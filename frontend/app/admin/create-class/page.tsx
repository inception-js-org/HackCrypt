"use client"

import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

const existingClasses = [
  { id: "12-A", grade: "12", section: "A", students: 35, teacher: "Dr. Sarah Teacher" },
  { id: "12-B", grade: "12", section: "B", students: 30, teacher: "Prof. John Smith" },
  { id: "11-A", grade: "11", section: "A", students: 32, teacher: "Ms. Emily Brown" },
  { id: "11-B", grade: "11", section: "B", students: 32, teacher: "Dr. Sarah Teacher" },
  { id: "10-A", grade: "10", section: "A", students: 38, teacher: "Prof. John Smith" },
]

export default function CreateClassPage() {
  return (
    <PageContainer title="Create Class" description="Add a new class to the system">
      <div className="grid lg:grid-cols-2 gap-8">
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-[#3B82F6] text-white rounded-t-lg">
            <CardTitle>New Class Setup</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-black">Grade</Label>
                  <Select>
                    <SelectTrigger className="border-[#E2E8F0]">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">Grade 12</SelectItem>
                      <SelectItem value="11">Grade 11</SelectItem>
                      <SelectItem value="10">Grade 10</SelectItem>
                      <SelectItem value="9">Grade 9</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-black">Section</Label>
                  <Select>
                    <SelectTrigger className="border-[#E2E8F0]">
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Section A</SelectItem>
                      <SelectItem value="B">Section B</SelectItem>
                      <SelectItem value="C">Section C</SelectItem>
                      <SelectItem value="D">Section D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="room" className="text-black">
                  Room Number
                </Label>
                <Input id="room" placeholder="e.g., Room 101" className="border-[#E2E8F0]" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity" className="text-black">
                  Maximum Capacity
                </Label>
                <Input id="capacity" type="number" placeholder="e.g., 40" className="border-[#E2E8F0]" />
              </div>

              <div className="space-y-2">
                <Label className="text-black">Class Teacher</Label>
                <Select>
                  <SelectTrigger className="border-[#E2E8F0]">
                    <SelectValue placeholder="Assign class teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sarah">Dr. Sarah Teacher</SelectItem>
                    <SelectItem value="john">Prof. John Smith</SelectItem>
                    <SelectItem value="emily">Ms. Emily Brown</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-black">Subjects</Label>
                <div className="flex flex-wrap gap-2 p-4 bg-[#F8FAFC] rounded-lg">
                  <Badge className="bg-[#3B82F6] text-white">Mathematics</Badge>
                  <Badge className="bg-[#3B82F6] text-white">Physics</Badge>
                  <Badge className="bg-[#3B82F6] text-white">Chemistry</Badge>
                  <Badge className="bg-[#3B82F6] text-white">English</Badge>
                  <Badge className="bg-[#3B82F6] text-white">Computer Science</Badge>
                  <Badge variant="outline" className="border-dashed cursor-pointer">
                    + Add Subject
                  </Badge>
                </div>
              </div>

              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white">
                Create Class
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-black">Existing Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {existingClasses.map((cls) => (
                <div key={cls.id} className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg">
                  <div>
                    <p className="font-medium text-black">Class {cls.id}</p>
                    <p className="text-sm text-[#64748B]">
                      {cls.teacher} • {cls.students} students
                    </p>
                  </div>
                  <Badge className="bg-[#3B82F6] text-white">Grade {cls.grade}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
