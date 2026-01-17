"use client";

import { useState, useRef } from "react";
import { PageContainer } from "@/components/page-container";
import { Card } from "@/components/ui/card";
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
import { User, Camera, Fingerprint, CheckCircle, Upload } from "lucide-react";

const steps = [
  {
    id: 1,
    title: "Welcome! Let's Get to Know You",
    subtitle: "Personal Information",
    description:
      "This will help us to make the registration seamless. This information will also help us to stay connected with you!",
    icon: User,
  },
  {
    id: 2,
    title: "Let's Capture Your Face",
    subtitle: "Face Recognition Setup",
    description:
      "Position the student's face within the frame. This will be used for automated attendance recognition.",
    icon: Camera,
  },
  {
    id: 3,
    title: "Fingerprint Registration",
    subtitle: "Biometric Setup",
    description: "Place the student's finger on the scanner. This adds an extra layer of verification for attendance.",
    icon: Fingerprint,
  },
  {
    id: 4,
    title: "All Set! Registration Complete",
    subtitle: "Review & Confirm",
    description: "Review all the information before finalizing the student registration.",
    icon: CheckCircle,
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
  const [currentStep, setCurrentStep] = useState(1);
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
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [processingSteps, setProcessingSteps] = useState<number>(0);
  const [showWebcam, setShowWebcam] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [fingerprintStatus, setFingerprintStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [fingerprintMessage, setFingerprintMessage] = useState("");
  const [fingerprintSlotId, setFingerprintSlotId] = useState(0);
  const [fingerprintStep, setFingerprintStep] = useState(0);

  // Map DB ID to fingerprint slot (1-127)
  const mapToSlot = (dbId: number) => {
    return ((dbId - 1) % 127) + 1;
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

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

        const data = await response.json();
        setStudentDbId(data.id);
        const slotId = mapToSlot(Number(data.id));
        setFingerprintSlotId(slotId);
        nextStep();

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
        description:
          "Student ID not found. Please go back and save student information first.",
        variant: "destructive",
      });
      return;
    }

    console.log("🎥 Starting face capture for student:", studentDbId);

    setShowWebcam(true);
    setIsProcessing(true);
    setProcessingSteps(0);
    setProcessingStatus("📷 Initializing camera...");
    
    // Animate steps progressively - much slower timing
    setTimeout(() => setProcessingSteps(1), 3000);
    setTimeout(() => setProcessingSteps(2), 7500);
    setTimeout(() => setProcessingSteps(3), 10000);

    try {
      const faceId = studentDbId;

      // Start the webcam enrollment session
      console.log("📡 Starting webcam enrollment session...");
      setProcessingStatus("🔍 Detecting face...");
      await fetch(`http://localhost:8000/enroll/webcam/start?student_id=${faceId}`, {
        method: "POST",
      });

      // Wait a moment for webcam to initialize
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Poll for enrollment completion
      let completed = false;
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max

      console.log("⏳ Waiting for enrollment to complete...");
      setProcessingStatus("🎯 Capturing facial features...");

      while (!completed && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

        const statusResponse = await fetch(
          `http://localhost:8000/enroll/webcam/status?student_id=${faceId}`
        );
        const status = await statusResponse.json();

        console.log(`Enrollment status (attempt ${attempts + 1}):`, status);

        // Update status message based on progress
        if (attempts < 10) {
          setProcessingStatus("📸 Capturing multiple angles...");
        } else if (attempts < 20) {
          setProcessingStatus("🧬 Extracting facial landmarks...");
        } else if (attempts < 30) {
          setProcessingStatus("🔬 Analyzing facial features...");
        } else {
          setProcessingStatus("💾 Processing embeddings...");
        }

        if (status.completed) {
          completed = true;
          console.log("✅ Enrollment completed!");
          break;
        }

        attempts++;
      }

      if (!completed) {
        throw new Error("Enrollment timeout. Please try again.");
      }

      // Finalize enrollment
      console.log("💾 Finalizing enrollment in Pinecone...");
      setProcessingStatus("✨ Finalizing enrollment...");
      const response = await fetch(
        `http://localhost:8000/enroll/webcam?student_id=${faceId}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Face enrollment error:", errorData);
        throw new Error(errorData.detail || "Face enrollment failed");
      }

      const data = await response.json();
      console.log("✅ Enrollment response:", data);

      // Update student record with face ID
      console.log("📝 Updating database with face_id:", data.face_id);
      setProcessingStatus("💾 Saving to database...");
      const dbResponse = await fetch("/api/students/update-biometric", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentDbId,
          faceId: data.face_id,
        }),
      });

      const dbResult = await dbResponse.json();
      console.log("✅ Database update result:", dbResult);

      if (!dbResponse.ok) {
        throw new Error(dbResult.error || "Failed to update database");
      }

      setFaceEnrolled(true);

      toast({
        title: "Success",
        description: `Face captured successfully! (${data.samples} samples collected)`,
      });
    } catch (error) {
      console.error("❌ Face capture error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to capture face. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setShowWebcam(false);
      setProcessingStatus("");
      setProcessingSteps(0);
    }
  };

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
    setProcessingSteps(0);
    setProcessingStatus("📤 Uploading photo...");
    
    // Animate steps progressively - much slower timing
    setTimeout(() => setProcessingSteps(1), 1500);
    setTimeout(() => setProcessingSteps(2), 3500);
    setTimeout(() => setProcessingSteps(3), 5500);
    
    try {
      const faceId = studentDbId;

      const formDataObj = new FormData();
      formDataObj.append("image", file);
      formDataObj.append("student_id", faceId);

      setProcessingStatus("🔍 Detecting face in photo...");
      const response = await fetch("http://localhost:8000/enroll/", {
        method: "POST",
        body: formDataObj,
      });

      if (!response.ok) {
        throw new Error("Face enrollment failed");
      }

      setProcessingStatus("🧬 Extracting facial features...");
      await new Promise((resolve) => setTimeout(resolve, 500));

      setProcessingStatus("💾 Saving to database...");
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
      setProcessingStatus("");
      setProcessingSteps(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleScanFingerprint = async () => {
    if (!studentDbId) {
      toast({
        title: "Error",
        description: "Student ID not found. Please go back and save student information first.",
        variant: "destructive",
      });
      return;
    }

    setFingerprintStatus("scanning")
    setFingerprintMessage("🔌 Connecting to sensor...")
    setFingerprintStep(0)
    setIsProcessing(true)
    setProcessingStatus("🔌 Connecting to sensor...")
    setProcessingSteps(0)

    // Simulate Arduino steps appearing progressively
    setTimeout(() => {
      setProcessingSteps(1)
      setProcessingStatus(" Place finger")
    }, 1500)
    
    setTimeout(() => {
      setProcessingSteps(2)
      setProcessingStatus(" Remove finger")
    }, 5000)
    
    setTimeout(() => {
      setProcessingSteps(3)
      setProcessingStatus(" Place SAME finger again")
    }, 7500)

    try {
      // Start enrollment request
      const startTime = Date.now()
      const response = await fetch("http://localhost:8000/api/fingerprint/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentId: fingerprintSlotId }),
      })

      const data = await response.json()
      console.log("📡 Fingerprint response:", data)

      if (data.success) {
        setFingerprintStatus("success")
        setFingerprintStep(4)
        setFingerprintMessage("🎉 Fingerprint enrolled successfully!")
        setProcessingSteps(4)
        setProcessingStatus("🎉 Fingerprint Enrollment SUCCESS")

        await fetch('/api/students/update-biometric', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentDbId,
            fingerprintId: String(fingerprintSlotId),
          }),
        })

        setFingerprintEnrolled(true)

        toast({
          title: "Success",
          description: "Fingerprint enrolled successfully!",
        })
        
        // Clear overlay after success
        setTimeout(() => {
          setIsProcessing(false)
          setProcessingStatus("")
          setProcessingSteps(0)
        }, 2000)
      } else {
        setFingerprintStatus("error")
        setFingerprintStep(0)
        setFingerprintMessage(data.error || data.message || "Enrollment failed. Please try again.")

        toast({
          title: "Error",
          description: data.error || "Fingerprint enrollment failed.",
          variant: "destructive",
        })
        setIsProcessing(false)
        setProcessingStatus("")
        setProcessingSteps(0)
      }
    } catch (error) {
      setFingerprintStatus("error")
      setFingerprintStep(0)
      setFingerprintMessage("❌ Failed to connect to fingerprint service.")

      toast({
        title: "Error",
        description: "Failed to connect to fingerprint service.",
        variant: "destructive",
      });
      setIsProcessing(false)
      setProcessingStatus("")
      setProcessingSteps(0)
    }
  };

  const handleComplete = async () => {
    setIsProcessing(true);

    try {
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
      setFingerprintStatus("idle");
      setFingerprintMessage("");
      setFingerprintSlotId(0);
      setCurrentStep(1);
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

  const currentStepData = steps[currentStep - 1];
  const progressPercent = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <PageContainer title="" description="">
      <div className="min-h-[calc(100vh-120px)] flex flex-col">
        <div className="flex-1 flex flex-col lg:flex-row gap-8 lg:gap-16 px-4 lg:px-12 py-8">
          <div className="lg:w-2/5 flex flex-col justify-center">
            <p className="text-[#3B82F6] font-medium mb-2 tracking-wide">Step {currentStep}</p>
            <h1 className="text-3xl lg:text-4xl font-bold text-black mb-4 leading-tight">{currentStepData.title}</h1>
            <p className="text-[#64748B] text-lg leading-relaxed">{currentStepData.description}</p>
          </div>

          <div className="lg:w-3/5 flex items-center justify-center">
            <Card className="w-full max-w-3xl bg-white shadow-xl border-0 rounded-2xl overflow-hidden">
              <div className="bg-[#3B82F6] px-6 py-4">
                <h2 className="text-white font-semibold text-lg">
                  {formData.firstName ? `Hi, ${formData.firstName} ${formData.lastName}` : currentStepData.subtitle}
                </h2>
              </div>

              <div className="p-6">
                {currentStep === 1 && (
                  <div className="space-y-5 animate-in fade-in duration-300">
                    <div className="space-y-2">
                      <Label className="text-[#64748B] text-sm">
                        First Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="Enter first name"
                        className={`border-[#E2E8F0] h-12 rounded-lg focus:border-[#3B82F6] focus:ring-[#3B82F6] ${
                          errors.firstName ? "border-red-500" : ""
                        }`}
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                      />
                      {errors.firstName && (
                        <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#64748B] text-sm">
                        Last Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="Enter last name"
                        className={`border-[#E2E8F0] h-12 rounded-lg focus:border-[#3B82F6] focus:ring-[#3B82F6] ${
                          errors.lastName ? "border-red-500" : ""
                        }`}
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                      />
                      {errors.lastName && (
                        <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#64748B] text-sm">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="email"
                        placeholder="student@school.edu"
                        className={`border-[#E2E8F0] h-12 rounded-lg focus:border-[#3B82F6] focus:ring-[#3B82F6] ${
                          errors.email ? "border-red-500" : ""
                        }`}
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#64748B] text-sm">
                        Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="tel"
                        placeholder="+1 234 567 8900"
                        className={`border-[#E2E8F0] h-12 rounded-lg focus:border-[#3B82F6] focus:ring-[#3B82F6] ${
                          errors.phone ? "border-red-500" : ""
                        }`}
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#64748B] text-sm">
                        Class <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.class}
                        onValueChange={(value) => handleInputChange("class", value)}
                      >
                        <SelectTrigger className={`border-[#E2E8F0] h-12 rounded-lg ${
                          errors.class ? "border-red-500" : ""
                        }`}>
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
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="animate-in fade-in duration-300">
                    <div className="flex flex-col items-center">
                      <div className="relative w-64 h-64 bg-black rounded-xl overflow-hidden mb-4">
                        {showWebcam && !faceEnrolled && studentDbId ? (
                          <>
                            <img
                              src={`http://localhost:8000/video_feed?student_id=${studentDbId}`}
                              alt="Webcam Feed"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error("Video feed error");
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                            <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                              RECORDING
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-40 h-52 border-2 border-dashed border-[#3B82F6] rounded-[50%] animate-pulse" />
                            </div>
                          </>
                        ) : faceEnrolled ? (
                          <div className="w-full h-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                            <div className="text-center text-white">
                              <CheckCircle className="w-16 h-16 mx-auto mb-2" />
                              <p className="font-medium">Face Captured!</p>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#1E293B] to-[#0F172A] flex items-center justify-center">
                            <Camera className="w-12 h-12 text-white/40" />
                          </div>
                        )}
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUploadPhoto}
                        className="hidden"
                      />

                      {!showWebcam && !faceEnrolled && (
                        <div className="flex flex-col gap-3 w-full max-w-xs">
                          <Button
                            onClick={handleCaptureFace}
                            disabled={isProcessing}
                            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white w-full"
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            {isProcessing ? "Capturing..." : "Start Camera"}
                          </Button>
                          <div className="relative flex items-center justify-center">
                            <div className="border-t border-[#E2E8F0] w-full" />
                            <span className="absolute bg-white px-3 text-[#94A3B8] text-sm">or</span>
                          </div>
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                            variant="outline"
                            className="border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6]/10 w-full"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Photo
                          </Button>
                        </div>
                      )}

                      {showWebcam && !faceEnrolled && !processingStatus && (
                        <p className="text-sm text-[#64748B] text-center max-w-xs">
                          Please look at the camera. Capturing multiple angles...
                        </p>
                      )}

                      {faceEnrolled && (
                        <Button
                          onClick={() => {
                            setFaceEnrolled(false);
                            setShowWebcam(false);
                          }}
                          variant="outline"
                          className="border-[#3B82F6] text-[#3B82F6]"
                        >
                          Retake Photo
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="animate-in fade-in duration-300">
                    <div className="flex flex-col items-center">
                      <div
                        className={`
                        relative w-48 h-48 rounded-xl flex items-center justify-center mb-4 transition-all duration-500
                        ${
                          fingerprintEnrolled || fingerprintStatus === "success"
                            ? "bg-gradient-to-br from-green-500 to-green-600"
                            : "bg-gradient-to-br from-[#1E293B] to-[#0F172A]"
                        }
                      `}
                      >
                        {fingerprintEnrolled || fingerprintStatus === "success" ? (
                          <div className="text-center text-white">
                            <CheckCircle className="w-16 h-16 mx-auto mb-2" />
                            <p className="font-medium">Registered!</p>
                          </div>
                        ) : (
                          <div className="relative">
                            <Fingerprint className="w-20 h-20 text-[#3B82F6]" />
                            {fingerprintStatus === "scanning" && (
                              <div className="absolute inset-0 bg-[#3B82F6]/30 rounded-full animate-ping" />
                            )}
                          </div>
                        )}

                        {fingerprintStatus === "scanning" && (
                          <div className="absolute inset-0 overflow-hidden rounded-xl">
                            <div
                              className="w-full h-0.5 bg-[#3B82F6] shadow-lg shadow-blue-400"
                              style={{
                                animation: "scan 2s ease-in-out infinite",
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <p className="text-[#64748B] text-sm text-center mb-2 max-w-xs font-medium">
                        Fingerprint Slot ID: {fingerprintSlotId}
                      </p>

                      {/* Step Progress Indicator */}
                      {fingerprintStatus === "scanning" && fingerprintStep > 0 && (
                        <div className="flex justify-center items-center gap-3 mb-4">
                          {[1, 2, 3].map((step) => (
                            <div
                              key={step}
                              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                step <= fingerprintStep
                                  ? 'bg-[#3B82F6] scale-110'
                                  : 'bg-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      )}

                      <p className={`text-center mb-4 max-w-md font-semibold text-lg ${
                        fingerprintStatus === "success" ? "text-green-600" :
                        fingerprintStatus === "error" ? "text-red-600" :
                        fingerprintStatus === "scanning" ? "text-[#3B82F6]" :
                        "text-[#64748B]"
                      }`}>
                        {fingerprintEnrolled || fingerprintStatus === "success"
                          ? fingerprintMessage || "Fingerprint successfully registered."
                          : fingerprintStatus === "scanning"
                            ? fingerprintMessage || "Place finger on the scanner device."
                            : fingerprintStatus === "error"
                              ? fingerprintMessage
                              : "Place finger on the scanner device."}
                      </p>

                      {!fingerprintEnrolled && fingerprintStatus !== "success" ? (
                        <Button
                          onClick={handleScanFingerprint}
                          disabled={isProcessing || fingerprintStatus === "scanning"}
                          className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                        >
                          {fingerprintStatus === "scanning" ? (
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Scanning...
                            </span>
                          ) : fingerprintStatus === "error" ? (
                            <>
                              <Fingerprint className="w-4 h-4 mr-2" />
                              Try Again
                            </>
                          ) : (
                            <>
                              <Fingerprint className="w-4 h-4 mr-2" />
                              Scan Fingerprint
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            setFingerprintEnrolled(false);
                            setFingerprintStatus("idle");
                            setFingerprintMessage("");
                          }}
                          variant="outline"
                          className="border-[#3B82F6] text-[#3B82F6]"
                        >
                          Rescan
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="animate-in fade-in duration-300 space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
                        <span className="text-[#64748B]">Name</span>
                        <span className="font-medium text-black">
                          {formData.firstName} {formData.lastName}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
                        <span className="text-[#64748B]">Email</span>
                        <span className="font-medium text-black">{formData.email}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
                        <span className="text-[#64748B]">Phone</span>
                        <span className="font-medium text-black">{formData.phone}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
                        <span className="text-[#64748B]">Class</span>
                        <span className="font-medium text-black">{formData.class}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-[#64748B]">Face</span>
                        <span className={`font-medium ${faceEnrolled ? "text-green-600" : "text-orange-500"}`}>
                          {faceEnrolled ? "✓ Captured" : "⚠ Pending"}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-[#64748B]">Fingerprint</span>
                        <span className={`font-medium ${fingerprintEnrolled ? "text-green-600" : "text-orange-500"}`}>
                          {fingerprintEnrolled ? "✓ Registered" : "⚠ Optional"}
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white h-12"
                      onClick={handleComplete}
                      disabled={isProcessing}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {isProcessing ? "Processing..." : "Complete Registration"}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] py-6 px-4 lg:px-12">
          <div className="relative mb-6">
            <div className="h-2 bg-[#E2E8F0] rounded-full relative overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div
              className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
              style={{ left: `calc(${progressPercent}% - 20px)` }}
            >
              <div className="w-10 h-10 bg-[#3B82F6] rounded-full flex items-center justify-center shadow-lg shadow-blue-300 animate-pulse">
                <User className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="absolute inset-0 flex justify-between items-center">
              {steps.map((step) => {
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                return (
                  <div
                    key={step.id}
                    className={`
                      w-4 h-4 rounded-full border-2 transition-all duration-300
                      ${
                        isCompleted
                          ? "bg-[#3B82F6] border-[#3B82F6]"
                          : isCurrent
                            ? "bg-white border-[#3B82F6]"
                            : "bg-white border-[#CBD5E1]"
                      }
                    `}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Button
              onClick={prevStep}
              disabled={currentStep === 1 || isProcessing}
              className={`
                px-8 py-3 rounded-full font-medium transition-all duration-300
                ${
                  currentStep === 1 || isProcessing
                    ? "bg-[#CBD5E1] text-white cursor-not-allowed"
                    : "bg-[#1E293B] hover:bg-black text-white"
                }
              `}
            >
              Previous
            </Button>

            {currentStep < 4 && (
              <Button
                onClick={() => {
                  if (currentStep === 1) {
                    handleNext();
                  } else {
                    nextStep();
                  }
                }}
                disabled={isProcessing}
                className="px-8 py-3 rounded-full bg-[#1E293B] hover:bg-black text-white font-medium"
              >
                {currentStep === 1 ? "Save & Next" : "Next"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Full Page Processing Overlay */}
      {isProcessing && processingStatus && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center">
          {/* Animated Loading Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800">
            <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-[loading_2s_ease-in-out_infinite]"></div>
          </div>
          
          <div className="w-full max-w-4xl mx-8">
            <div className="space-y-16">
              <div className="text-center mb-20">
                <h3 className="text-7xl font-bold text-white tracking-wide">
                  {!faceEnrolled ? "PROCESSING EMBEDDINGS" : "FINGERPRINT ENROLLMENT"}
                </h3>
                {/* Spinning loader */}
                <div className="flex justify-center mt-8">
                  <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                </div>
              </div>
              
              {/* Face Enrollment Steps */}
              {!faceEnrolled && (
                <div className="space-y-10">
                  <div className={`transition-all duration-1000 ease-out transform ${processingSteps >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    <div className="flex items-center gap-8">
                      <div className={`w-6 h-6 rounded-full transition-all duration-700 ${processingSteps >= 1 ? 'bg-green-400 shadow-lg shadow-green-400/50 scale-100' : 'bg-gray-600 scale-75'}`}></div>
                      <span className="text-4xl font-medium text-white/90">Detecting facial landmarks</span>
                    </div>
                  </div>

                  <div className={`transition-all duration-1000 ease-out transform ${processingSteps >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    <div className="flex items-center gap-8">
                      <div className={`w-6 h-6 rounded-full transition-all duration-700 ${processingSteps >= 2 ? 'bg-green-400 shadow-lg shadow-green-400/50 scale-100' : 'bg-gray-600 scale-75'}`}></div>
                      <span className="text-4xl font-medium text-white/90">Extracting 512-dimension features</span>
                    </div>
                  </div>

                  <div className={`transition-all duration-1000 ease-out transform ${processingSteps >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    <div className="flex items-center gap-8">
                      <div className={`w-6 h-6 rounded-full transition-all duration-700 ${processingSteps >= 3 ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50 scale-100 animate-pulse' : 'bg-gray-600 scale-75'}`}></div>
                      <span className="text-4xl font-medium text-white/90">Generating ArcFace embeddings</span>
                    </div>
                  </div>

                  <div className={`transition-all duration-1000 ease-out transform ${processingSteps >= 4 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    <div className="flex items-center gap-8">
                      <div className={`w-6 h-6 rounded-full transition-all duration-700 ${processingSteps >= 4 ? 'bg-blue-400 shadow-lg shadow-blue-400/50 scale-100' : 'bg-gray-600 scale-75'}`}></div>
                      <span className="text-4xl font-medium text-white/70">Storing to vector database</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Fingerprint Enrollment Steps */}
              {faceEnrolled && (
                <div className="space-y-10">
                  <div className={`transition-all duration-1000 ease-out transform ${processingSteps >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    <div className="flex items-center gap-8">
                      <div className={`w-6 h-6 rounded-full transition-all duration-700 ${processingSteps >= 1 ? 'bg-blue-400 shadow-lg shadow-blue-400/50 scale-100' : 'bg-gray-600 scale-75'}`}></div>
                      <span className="text-4xl font-medium text-white/90">👉 Place finger</span>
                    </div>
                  </div>

                  <div className={`transition-all duration-1000 ease-out transform ${processingSteps >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    <div className="flex items-center gap-8">
                      <div className={`w-6 h-6 rounded-full transition-all duration-700 ${processingSteps >= 2 ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50 scale-100' : 'bg-gray-600 scale-75'}`}></div>
                      <span className="text-4xl font-medium text-white/90">✋ Remove finger</span>
                    </div>
                  </div>

                  <div className={`transition-all duration-1000 ease-out transform ${processingSteps >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    <div className="flex items-center gap-8">
                      <div className={`w-6 h-6 rounded-full transition-all duration-700 ${processingSteps >= 3 ? 'bg-blue-400 shadow-lg shadow-blue-400/50 scale-100 animate-pulse' : 'bg-gray-600 scale-75'}`}></div>
                      <span className="text-4xl font-medium text-white/90">👉 Place SAME finger again</span>
                    </div>
                  </div>

                  <div className={`transition-all duration-1000 ease-out transform ${processingSteps >= 4 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    <div className="flex items-center gap-8">
                      <div className={`w-6 h-6 rounded-full transition-all duration-700 ${processingSteps >= 4 ? 'bg-green-400 shadow-lg shadow-green-400/50 scale-100' : 'bg-gray-600 scale-75'}`}></div>
                      <span className="text-4xl font-medium text-white/90">🎉 Fingerprint Enrollment SUCCESS</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(192px); }
        }
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </PageContainer>
  );
}