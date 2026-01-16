"use client"

import { useState, useEffect } from "react"
import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface ClassInfo {
  id: number
  grade: string
  section: string
  roomNumber: string | null
  maxCapacity: number
  teacherId: number | null
  subjects: string[]
}

const availableSubjects = [
  "Mathematics",
  "Physics", 
  "Chemistry",
  "English",
  "Computer Science",
  "Biology",
  "History",
  "Geography",
]

export default function CreateClassPage() {
  const [existingClasses, setExistingClasses] = useState<ClassInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    grade: "",
    section: "",
    roomNumber: "",
    maxCapacity: "",
    teacherId: "",
    subjects: [] as string[],
  })
  
  const { toast } = useToast()

  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    try {
      const response = await fetch("/api/classes")
      const data = await response.json()
      setExistingClasses(data)
    } catch (error) {
      console.error("Error fetching classes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubjectToggle = (subject: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.grade || !formData.section || !formData.maxCapacity) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: formData.grade,
          section: formData.section,
          roomNumber: formData.roomNumber || null,
          maxCapacity: parseInt(formData.maxCapacity),
          teacherId: formData.teacherId ? parseInt(formData.teacherId) : null,
          subjects: formData.subjects,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Class created successfully",
        })
        setFormData({
          grade: "",
          section: "",
          roomNumber: "",
          maxCapacity: "",
          teacherId: "",
          subjects: [],
        })
        fetchClasses()
      } else {
        throw new Error("Failed to create class")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create class. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageContainer title="Create Class" description="Add a new class to the system">
      <div className="grid lg:grid-cols-2 gap-8">
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-[#3B82F6] text-white rounded-t-lg">
            <CardTitle>New Class Setup</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-black">Grade *</Label>
                  <Select
                    value={formData.grade}
                    onValueChange={(value) => setFormData({ ...formData, grade: value })}
                  >
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
                  <Label className="text-black">Section *</Label>
                  <Select
                    value={formData.section}
                    onValueChange={(value) => setFormData({ ...formData, section: value })}
                  >
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
                <Input
                  id="room"
                  value={formData.roomNumber}
                  onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                  placeholder="e.g., Room 101"
                  className="border-[#E2E8F0]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity" className="text-black">
                  Maximum Capacity *
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.maxCapacity}
                  onChange={(e) => setFormData({ ...formData, maxCapacity: e.target.value })}
                  placeholder="e.g., 40"
                  className="border-[#E2E8F0]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-black">Class Teacher</Label>
                <Select
                  value={formData.teacherId}
                  onValueChange={(value) => setFormData({ ...formData, teacherId: value })}
                >
                  <SelectTrigger className="border-[#E2E8F0]">
                    <SelectValue placeholder="Assign class teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Dr. Sarah Teacher</SelectItem>
                    <SelectItem value="2">Prof. John Smith</SelectItem>
                    <SelectItem value="3">Ms. Emily Brown</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-black">Subjects</Label>
                <div className="flex flex-wrap gap-2 p-4 bg-[#F8FAFC] rounded-lg">
                  {availableSubjects.map((subject) => (
                    <Badge
                      key={subject}
                      className={`cursor-pointer transition-colors ${
                        formData.subjects.includes(subject)
                          ? "bg-[#3B82F6] text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                      onClick={() => handleSubjectToggle(subject)}
                    >
                      {subject}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmitting ? "Creating..." : "Create Class"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-black">Existing Classes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-[#64748B]">Loading classes...</p>
            ) : existingClasses.length === 0 ? (
              <p className="text-center py-8 text-[#64748B]">
                No classes created yet.
              </p>
            ) : (
              <div className="space-y-4">
                {existingClasses.map((cls) => (
                  <div key={cls.id} className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg">
                    <div>
                      <p className="font-medium text-black">
                        Class {cls.grade}-{cls.section}
                      </p>
                      <p className="text-sm text-[#64748B]">
                        {cls.roomNumber || "No room"} • {cls.maxCapacity} students max
                      </p>
                    </div>
                    <Badge className="bg-[#3B82F6] text-white">Grade {cls.grade}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
