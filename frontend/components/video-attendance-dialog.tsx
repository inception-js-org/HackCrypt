"use client"

import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Upload, Video, CheckCircle, Loader2, AlertCircle, Users } from "lucide-react"
import { Name } from "drizzle-orm/sql/sql"

interface DetectedStudent {
  student_id: string
  first_name: string
  last_name: string
  detection_count: number
  average_confidence: number
  max_confidence: number
  first_seen_seconds: number
  last_seen_seconds: number
}

interface VideoAttendanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: number
  classId: number
  className: string
  subject: string
  onAttendanceMarked: () => void
}

type Stage = "upload" | "processing" | "review" | "marking" | "complete"

export function VideoAttendanceDialog({
  open,
  onOpenChange,
  sessionId,
  classId,
  className,
  subject,
  onAttendanceMarked
}: VideoAttendanceDialogProps) {
  const [stage, setStage] = useState<Stage>("upload")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [detectedStudents, setDetectedStudents] = useState<DetectedStudent[]>([])
  const [videoInfo, setVideoInfo] = useState<{
    filename: string
    duration_seconds: number
    frames_processed: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [markingResult, setMarkingResult] = useState<{
    marked_present: number
    skipped_duplicates: number
  } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-matroska', 'video/webm']
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|avi|mov|mkv|webm)$/i)) {
        setError("Invalid file type. Please upload MP4, AVI, MOV, MKV, or WebM")
        return
      }
      
      // Validate file size (max 500MB)
      if (file.size > 500 * 1024 * 1024) {
        setError("File too large. Maximum size is 500MB")
        return
      }
      
      setSelectedFile(file)
      setError(null)
    }
  }

  const processVideo = async () => {
    if (!selectedFile) return
    
    setStage("processing")
    setProgress(10)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append("video", selectedFile)
      formData.append("session_id", sessionId.toString())
      formData.append("class_id", classId.toString())
      
      setProgress(20)
      
      // Send to backend for processing
      const response = await fetch("http://localhost:8000/api/video-attendance/analyze", {
        method: "POST",
        body: formData,
      })
      
      setProgress(80)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Video analysis failed")
      }
      
      const result = await response.json()
      setProgress(100)
      
      setDetectedStudents(result.detected_students || [])
      setVideoInfo(result.video_info)
      setStage("review")
      
    } catch (err) {
      console.error("Video processing error:", err)
      setError(err instanceof Error ? err.message : "Failed to process video")
      setStage("upload")
    }
  }

  const markAttendance = async () => {
    if (detectedStudents.length === 0) return
    
    setStage("marking")
    
    try {
      const response = await fetch("/api/video-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          detectedStudents: detectedStudents.map(s => ({
            first_name: s.first_name,
            last_name: s.last_name,
            student_id: s.student_id,
            average_confidence: s.average_confidence,
          })),
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to mark attendance")
      }
      
      const result = await response.json()
      setMarkingResult({
        marked_present: result.details.marked_present,
        skipped_duplicates: result.details.skipped_duplicates,
      })
      
      setStage("complete")
      onAttendanceMarked()
      
      toast({
        title: "Attendance Marked",
        description: `${result.details.marked_present} students marked present`,
      })
      
    } catch (err) {
      console.error("Marking error:", err)
      setError(err instanceof Error ? err.message : "Failed to mark attendance")
      setStage("review")
    }
  }

  const resetDialog = () => {
    setStage("upload")
    setSelectedFile(null)
    setProgress(0)
    setDetectedStudents([])
    setVideoInfo(null)
    setError(null)
    setMarkingResult(null)
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      resetDialog()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-[#3B82F6]" />
            Video Attendance - {subject}
          </DialogTitle>
          <p className="text-sm text-[#64748B]">
            Class {className} • Session #{sessionId}
          </p>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Upload Stage */}
          {stage === "upload" && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors hover:border-[#3B82F6] hover:bg-[#EBF5FF]/50
                  ${selectedFile ? "border-green-500 bg-green-50" : "border-[#E2E8F0]"}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {selectedFile ? (
                  <div className="space-y-2">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
                    <p className="font-medium text-black">{selectedFile.name}</p>
                    <p className="text-sm text-[#64748B]">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <p className="text-xs text-[#64748B]">Click to change file</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 mx-auto text-[#64748B]" />
                    <p className="font-medium text-black">Drop video here or click to upload</p>
                    <p className="text-sm text-[#64748B]">
                      Supported: MP4, AVI, MOV, MKV, WebM (max 500MB)
                    </p>
                  </div>
                )}
              </div>
              
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
              
              <Button
                onClick={processVideo}
                disabled={!selectedFile}
                className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white"
              >
                Analyze Video
              </Button>
            </div>
          )}

          {/* Processing Stage */}
          {stage === "processing" && (
            <div className="space-y-4 text-center py-8">
              <Loader2 className="w-12 h-12 mx-auto text-[#3B82F6] animate-spin" />
              <div className="space-y-2">
                <p className="font-medium text-black">Processing Video...</p>
                <p className="text-sm text-[#64748B]">
                  Detecting faces and identifying students
                </p>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-[#64748B]">{progress}% complete</p>
            </div>
          )}

          {/* Review Stage */}
          {stage === "review" && (
            <div className="space-y-4">
              {videoInfo && (
                <div className="bg-[#F8FAFC] rounded-lg p-4">
                  <h4 className="font-medium text-black mb-2">Video Analysis Complete</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-[#64748B]">Duration</p>
                      <p className="font-medium">{videoInfo.duration_seconds.toFixed(1)}s</p>
                    </div>
                    <div>
                      <p className="text-[#64748B]">Frames Analyzed</p>
                      <p className="font-medium">{videoInfo.frames_processed}</p>
                    </div>
                    <div>
                      <p className="text-[#64748B]">Students Found</p>
                      <p className="font-medium text-green-600">{detectedStudents.length}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {detectedStudents.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-medium text-black flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Detected Students ({detectedStudents.length})
                  </h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {detectedStudents.map((student, idx) => (
                      <div
                        key={student.student_id}
                        className="flex items-center justify-between p-3 bg-white border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-[#3B82F6] text-white rounded-full flex items-center justify-center text-xs">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-medium text-black">Student ID: {student.student_id}</p>
                            <p className="font-medium text-black">Student Name: {student.first_name || ""} {student.last_name || ""}</p>
                            <p className="text-xs text-[#64748B]">
                              Seen {student.detection_count}x • {student.first_seen_seconds}s - {student.last_seen_seconds}s
                            </p>
                          </div>
                        </div>
                        <Badge className={`
                          ${student.average_confidence >= 0.7 
                            ? "bg-green-100 text-green-700" 
                            : "bg-yellow-100 text-yellow-700"
                          }
                        `}>
                          {(student.average_confidence * 100).toFixed(0)}% match
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-[#64748B]">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No students detected in the video</p>
                  <p className="text-sm">Try uploading a different video with clearer face visibility</p>
                </div>
              )}
              
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={resetDialog}
                  className="flex-1"
                >
                  Upload Different Video
                </Button>
                <Button
                  onClick={markAttendance}
                  disabled={detectedStudents.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Mark {detectedStudents.length} Students Present
                </Button>
              </div>
            </div>
          )}

          {/* Marking Stage */}
          {stage === "marking" && (
            <div className="space-y-4 text-center py-8">
              <Loader2 className="w-12 h-12 mx-auto text-green-600 animate-spin" />
              <p className="font-medium text-black">Marking Attendance...</p>
            </div>
          )}

          {/* Complete Stage */}
          {stage === "complete" && markingResult && (
            <div className="space-y-4 text-center py-8">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
              <div className="space-y-1">
                <p className="text-2xl font-bold text-black">
                  {markingResult.marked_present} Students Marked Present
                </p>
                {markingResult.skipped_duplicates > 0 && (
                  <p className="text-sm text-[#64748B]">
                    {markingResult.skipped_duplicates} already marked (skipped)
                  </p>
                )}
              </div>
              <Button
                onClick={() => handleClose(false)}
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}