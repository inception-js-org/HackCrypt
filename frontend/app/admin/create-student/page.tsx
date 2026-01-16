"use client";

import { useState, useRef } from "react";
import { PageContainer } from "@/components/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const recentStudents = [
  {
    id: "STU-2026-001",
    name: "Alex Student",
    class: "12-A",
    email: "alex@school.edu",
  },
  {
    id: "STU-2026-002",
    name: "Jane Doe",
    class: "11-B",
    email: "jane@school.edu",
  },
  {
    id: "STU-2026-003",
    name: "Mike Johnson",
    class: "10-A",
    email: "mike@school.edu",
  },
];

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  class: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  class?: string;
}

export default function CreateStudentPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    class: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [studentDbId, setStudentDbId] = useState<string>("");
  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [fingerprintEnrolled, setFingerprintEnrolled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [fingerprintStatus, setFingerprintStatus] = useState<"idle" | "scanning" | "success" | "error">("idle")
  const [fingerprintMessage, setFingerprintMessage] = useState("")
  const [fingerprintSlotId, setFingerprintSlotId] = useState(0) // Will be set from DB ID

  // Map DB ID to fingerprint slot (1-127)
  const mapToSlot = (dbId: number) => {
    return ((dbId - 1) % 127) + 1
  }

  const handleFingerprintScan = async () => {
    setFingerprintStatus("scanning")
    setFingerprintMessage("Connecting to sensor...")

    try {
      const response = await fetch("http://localhost:8000/api/fingerprint/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentId }),
      })

      const data = await response.json()

      if (data.success) {
        setFingerprintStatus("success")
        setFingerprintMessage(data.message || "Fingerprint enrolled successfully!")
      } else {
        setFingerprintStatus("error")
        setFingerprintMessage(data.error || "Enrollment failed. Please try again.")
      }
    } catch (error) {
      setFingerprintStatus("error")
      setFingerprintMessage("Failed to connect to fingerprint service. Make sure the backend is running.")
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = "First name must be at least 2 characters";
    } else if (!/^[a-zA-Z\s]+$/.test(formData.firstName)) {
      newErrors.firstName = "First name can only contain letters";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = "Last name must be at least 2 characters";
    } else if (!/^[a-zA-Z\s]+$/.test(formData.lastName)) {
      newErrors.lastName = "Last name can only contain letters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (
      !/^\+?[1-9]\d{1,14}$/.test(formData.phone.replace(/[\s-]/g, ""))
    ) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (!formData.class) {
      newErrors.class = "Class selection is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleNext = async () => {
    if (validateForm()) {
      try {
        const response = await fetch("/api/students", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error("Failed to create student");
        }

<<<<<<< HEAD
        const data = await response.json();
        setStudentDbId(data.id);
        setStep(2);

=======
        const data = await response.json()
        setStudentDbId(data.id)
        const slotId = mapToSlot(Number(data.id))
        setFingerprintSlotId(slotId)
        setStep(2)
        
>>>>>>> origin/durva
        toast({
          title: "Success",
          description:
            "Student information saved. Please proceed with biometric enrollment.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save student information. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCaptureFace = async () => {
    if (!studentDbId) {
      toast({
        title: "Error",
        description: "Student ID not found. Please go back and save student information first.",
        variant: "destructive",
      })
      return
    }

    console.log('🎥 Starting face capture for student:', studentDbId)

    setShowWebcam(true)
    setIsProcessing(true)
    
    try {
      const faceId = studentDbId
      
      // Poll for enrollment completion
      let completed = false
      let attempts = 0
      const maxAttempts = 60 // 60 seconds max
      
      console.log('⏳ Waiting for enrollment to complete...')
      
      while (!completed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
        
        const statusResponse = await fetch(`http://localhost:8000/enroll/webcam/status?student_id=${faceId}`)
        const status = await statusResponse.json()
        
        console.log(`Enrollment status (attempt ${attempts + 1}):`, status)
        
        if (status.completed) {
          completed = true
          console.log('✅ Enrollment completed!')
          break
        }
        
        attempts++
      }
      
      if (!completed) {
        throw new Error('Enrollment timeout. Please try again.')
      }
      
      // Finalize enrollment
      console.log('💾 Finalizing enrollment in Pinecone...')
      const response = await fetch(`http://localhost:8000/enroll/webcam?student_id=${faceId}`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Face enrollment error:', errorData)
        throw new Error(errorData.detail || 'Face enrollment failed')
      }

      const data = await response.json()
      console.log('✅ Enrollment response:', data)
      
      // Update student record with face ID
      console.log('📝 Updating database with face_id:', data.face_id)
      const dbResponse = await fetch('/api/students/update-biometric', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentDbId,
          faceId: data.face_id,
        }),
      })

      const dbResult = await dbResponse.json()
      console.log('✅ Database update result:', dbResult)

      if (!dbResponse.ok) {
        throw new Error(dbResult.error || 'Failed to update database')
      }

      setFaceEnrolled(true)
      
      toast({
        title: "Success",
        description: `Face captured successfully! (${data.samples} samples collected)`,
      })
    } catch (error) {
      console.error('❌ Face capture error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to capture face. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setShowWebcam(false)
    }
  }

  const handleUploadPhoto = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!studentDbId) {
      toast({
        title: "Error",
        description:
          "Student ID not found. Please go back and save student information first.",
        variant: "destructive",
      });
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please upload a valid image file (JPEG/PNG).",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const faceId = studentDbId;

      const formDataObj = new FormData();
      formDataObj.append("image", file);
      formDataObj.append("student_id", faceId);

      const response = await fetch("http://localhost:8000/enroll/", {
        method: "POST",
        body: formDataObj,
      });

      if (!response.ok) {
        throw new Error("Face enrollment failed");
      }

      // Update student record with face ID
      await fetch("/api/students/update-biometric", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentDbId,
          faceId,
        }),
      });

      setFaceEnrolled(true);

      toast({
        title: "Success",
        description: "Photo uploaded and face enrolled successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleScanFingerprint = async () => {
    if (!studentDbId) {
      toast({
        title: "Error",
        description:
          "Student ID not found. Please go back and save student information first.",
        variant: "destructive",
      });
      return;
    }

<<<<<<< HEAD
    setIsProcessing(true);
    try {
      const fingerprintId = studentDbId;

      // TODO: Integrate with actual fingerprint scanner
      // Simulating fingerprint scan
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update student record with fingerprint ID
      await fetch("/api/students/update-biometric", {
=======
    setFingerprintStatus("scanning")
    setFingerprintMessage("Connecting to sensor...")
    setIsProcessing(true)

    try {
      const response = await fetch("http://localhost:8000/api/fingerprint/enroll", {
>>>>>>> origin/durva
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
<<<<<<< HEAD
        body: JSON.stringify({
          studentDbId,
          fingerprintId,
        }),
      });

      setFingerprintEnrolled(true);

      toast({
        title: "Success",
        description: "Fingerprint scanned and enrolled successfully!",
      });
    } catch (error) {
      toast({
=======
        body: JSON.stringify({ studentId: fingerprintSlotId }),
      })

      const data = await response.json()

      if (data.success) {
        setFingerprintStatus("success")
        setFingerprintMessage(data.message || "Fingerprint enrolled successfully!")
        
        // Update student record with fingerprint ID
        await fetch('/api/students/update-biometric', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentDbId,
            fingerprintId: fingerprintSlotId,
          }),
        })

        setFingerprintEnrolled(true)
        
        toast({
          title: "Success",
          description: "Fingerprint scanned and enrolled successfully!",
        })
      } else {
        setFingerprintStatus("error")
        setFingerprintMessage(data.error || "Enrollment failed. Please try again.")
        
        toast({
          title: "Error",
          description: "Failed to scan fingerprint. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      setFingerprintStatus("error")
      setFingerprintMessage("Failed to connect to fingerprint service. Make sure the backend is running.")
      
      toast({
>>>>>>> origin/durva
        title: "Error",
        description: "Failed to connect to fingerprint service.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateStudent = async () => {
    if (!faceEnrolled) {
      toast({
        title: "Warning",
        description: "Please enroll face biometric before creating student.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Send invitation email via Clerk
      const response = await fetch("/api/students/send-invitation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentDbId,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send invitation");
      }

      toast({
        title: "Success",
        description: "Student created successfully! Invitation email sent.",
      });

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        class: "",
      });
      setStudentDbId("");
      setFaceEnrolled(false);
      setFingerprintEnrolled(false);
      setStep(1);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete student creation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageContainer
      title="Create Student"
      description="Add a new student to the system"
    >
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
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="Enter first name"
                      value={formData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      className={`border-[#E2E8F0] ${
                        errors.firstName ? "border-red-500" : ""
                      }`}
                    />
                    {errors.firstName && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.firstName}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-black">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="Enter last name"
                      value={formData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      className={`border-[#E2E8F0] ${
                        errors.lastName ? "border-red-500" : ""
                      }`}
                    />
                    {errors.lastName && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-black">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@school.edu"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`border-[#E2E8F0] ${
                      errors.email ? "border-red-500" : ""
                    }`}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-black">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className={`border-[#E2E8F0] ${
                      errors.phone ? "border-red-500" : ""
                    }`}
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-black">
                    Class <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.class}
                    onValueChange={(value) => handleInputChange("class", value)}
                  >
                    <SelectTrigger
                      className={`border-[#E2E8F0] ${
                        errors.class ? "border-red-500" : ""
                      }`}
                    >
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
                  {errors.class && (
                    <p className="text-red-500 text-sm mt-1">{errors.class}</p>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={handleNext}
                  className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                >
                  Next: Biometric Setup
                </Button>
              </form>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center py-8 bg-[#F8FAFC] rounded-lg">
                  <div
                    className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      faceEnrolled ? "bg-green-100" : "bg-[#EBF5FF]"
                    }`}
                  >
                    <span className="text-4xl">
                      {faceEnrolled ? "✅" : "📷"}
                    </span>
                  </div>
                  <p className="text-black font-medium mb-2">
                    Face Registration
                  </p>
                  <p className="text-[#64748B] mb-4">
                    {faceEnrolled
                      ? "Face enrolled successfully!"
                      : "Capture student face for recognition"}
                  </p>

                  {/* Webcam Preview */}
                  {showWebcam && !faceEnrolled && studentDbId && (
                    <div className="mb-4 mx-auto max-w-md">
                      <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                        <img
                          src={`http://localhost:8000/video_feed?student_id=${studentDbId}`}
                          alt="Webcam Feed"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error("Video feed error");
                            (e.target as HTMLImageElement).src = "";
                          }}
                        />
                        <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          RECORDING
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Please look at the camera. Capturing multiple angles...
                      </p>
                    </div>
                  )}

                  {!faceEnrolled && (
                    <div className="flex gap-4 justify-center">
                      <Button
                        onClick={handleCaptureFace}
                        disabled={isProcessing}
                        className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                      >
                        {isProcessing ? "Capturing..." : "Capture Face"}
                      </Button>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                      >
                        Upload Photo
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUploadPhoto}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

<<<<<<< HEAD
                {faceEnrolled && (
                  <div className="text-center py-8 bg-[#F8FAFC] rounded-lg">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 bg-green-100">
                      <span className="text-4xl">✅</span>
                    </div>
                    <p className="text-black font-medium mb-2">
                      Fingerprint Registration
                    </p>
                    <p className="text-[#64748B] mb-4">
                      {fingerprintEnrolled
                        ? "Fingerprint enrolled successfully!"
                        : "Scan student fingerprint for enrollment"}
                    </p>
                    {!fingerprintEnrolled && (
                      <Button
                        onClick={handleScanFingerprint}
                        disabled={isProcessing}
                        className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                      >
                        {isProcessing ? "Processing..." : "Scan Fingerprint"}
                      </Button>
                    )}
                  </div>
                )}
=======
                <div className="text-center py-8 bg-[#F8FAFC] rounded-lg">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    fingerprintEnrolled ? "bg-green-100" : fingerprintStatus === "scanning" ? "bg-yellow-100" : fingerprintStatus === "error" ? "bg-red-100" : "bg-[#EBF5FF]"
                  }`}>
                    {fingerprintStatus === "scanning" ? (
                      <span className="text-4xl animate-pulse">⏳</span>
                    ) : fingerprintStatus === "success" || fingerprintEnrolled ? (
                      <span className="text-4xl">✅</span>
                    ) : fingerprintStatus === "error" ? (
                      <span className="text-4xl">❌</span>
                    ) : (
                      <span className="text-4xl">👆</span>
                    )}
                  </div>
                  <p className="text-black font-medium mb-2">Fingerprint Registration (Slot ID: {fingerprintSlotId})</p>
                  
                  {fingerprintMessage ? (
                    <div className="mb-4 p-4 bg-white rounded-lg border border-[#E2E8F0] max-h-48 overflow-y-auto">
                      <pre className="text-left text-sm text-[#334155] whitespace-pre-wrap font-mono">
                        {fingerprintMessage}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-[#64748B] mb-4">
                      {fingerprintEnrolled ? "Fingerprint enrolled successfully!" : "Scan student fingerprint (Optional)"}
                    </p>
                  )}
                  
                  {!fingerprintEnrolled && (
                    <Button 
                      onClick={handleScanFingerprint}
                      disabled={isProcessing || fingerprintStatus === "scanning"}
                      className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                    >
                      {fingerprintStatus === "scanning" ? "Scanning..." : "Scan Fingerprint"}
                    </Button>
                  )}
                </div>
>>>>>>> origin/durva

                <div className="flex justify-end gap-4">
                  <Button
                    onClick={() => setStep(1)}
                    className="bg-[#F9FAFB] text-black border border-[#E2E8F0] hover:bg-[#F1F5F9]"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleCreateStudent}
                    disabled={isProcessing}
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                  >
                    {isProcessing ? "Processing..." : "Create Student"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="hidden lg:block">
          <h2 className="text-2xl font-bold mb-4">Recent Students</h2>
          <div className="space-y-4">
            {recentStudents.map((student) => (
              <div
                key={student.id}
                className="p-4 bg-[#F8FAFC] rounded-lg shadow"
              >
                <p className="text-[#374151] font-semibold">{student.name}</p>
                <p className="text-[#6B7280]">{student.email}</p>
                <p className="text-[#6B7280]">{student.class}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
