"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Camera, CameraOff, AlertCircle } from 'lucide-react'

interface AttendanceCameraProps {
  sessionId: number
  onAttendanceMarked: (studentId: string, confidence: number) => void
}

interface DetectedFace {
  bbox: [number, number, number, number]
  student_id?: string
  confidence?: number
  name?: string
}

interface IdentifyResponse {
  faces: DetectedFace[]
  timestamp: string
}

export default function AttendanceCamera({ sessionId, onAttendanceMarked }: AttendanceCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([])
  const markedStudents = useRef<Set<string>>(new Set())

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsActive(true)
        setError(null)
      }
    } catch (err) {
      setError('Failed to access camera. Please grant camera permissions.')
      console.error('Camera error:', err)
    }
  }, [])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }
    setIsActive(false)
    setDetectedFaces([])
    markedStudents.current.clear()
  }, [])

  // Capture and send frame
  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isActive) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to blob and send to backend
    canvas.toBlob(async (blob) => {
      if (!blob) return

      const formData = new FormData()
      formData.append('file', blob, 'frame.jpg')
      formData.append('session_id', sessionId.toString())

      try {
        const response = await fetch('http://localhost:8000/identify/', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          const data: IdentifyResponse = await response.json()
          setDetectedFaces(data.faces || [])

          // Process recognized students
          data.faces?.forEach(face => {
            if (face.student_id && face.confidence && face.confidence >= 0.55) {
              // Check if not already marked
              if (!markedStudents.current.has(face.student_id)) {
                markedStudents.current.add(face.student_id)
                onAttendanceMarked(face.student_id, face.confidence)
              }
            }
          })
        }
      } catch (err) {
        console.error('Frame processing error:', err)
      }
    }, 'image/jpeg', 0.85)
  }, [isActive, sessionId, onAttendanceMarked])

  // Draw bounding boxes on overlay
  useEffect(() => {
    if (!overlayRef.current || !videoRef.current) return

    const overlay = overlayRef.current
    const video = videoRef.current
    const ctx = overlay.getContext('2d')

    if (!ctx) return

    // Match overlay size to video display size
    overlay.width = video.clientWidth
    overlay.height = video.clientHeight

    // Clear previous drawings
    ctx.clearRect(0, 0, overlay.width, overlay.height)

    // Scale factors (video stream size vs display size)
    const scaleX = video.clientWidth / video.videoWidth
    const scaleY = video.clientHeight / video.videoHeight

    // Draw bounding boxes
    detectedFaces.forEach(face => {
      const [x, y, w, h] = face.bbox

      // Scale coordinates
      const scaledX = x * scaleX
      const scaledY = y * scaleY
      const scaledW = w * scaleX
      const scaledH = h * scaleY

      // Set style based on recognition
      if (face.student_id) {
        ctx.strokeStyle = '#22c55e' // Green for recognized
        ctx.fillStyle = '#22c55e'
      } else {
        ctx.strokeStyle = '#eab308' // Yellow for detected but not recognized
        ctx.fillStyle = '#eab308'
      }
      ctx.lineWidth = 3

      // Draw box
      ctx.strokeRect(scaledX, scaledY, scaledW, scaledH)

      // Draw label
      if (face.name || face.student_id) {
        const label = face.name || `ID: ${face.student_id}`
        const confidence = face.confidence ? ` (${(face.confidence * 100).toFixed(0)}%)` : ''
        
        ctx.font = '14px sans-serif'
        const text = label + confidence
        const textWidth = ctx.measureText(text).width
        
        // Background
        ctx.fillRect(scaledX, scaledY - 25, textWidth + 10, 20)
        
        // Text
        ctx.fillStyle = '#ffffff'
        ctx.fillText(text, scaledX + 5, scaledY - 10)
      }
    })
  }, [detectedFaces])

  // Start frame capture interval when camera starts
  useEffect(() => {
    if (isActive) {
      // Capture frame every 2 seconds
      frameIntervalRef.current = setInterval(captureFrame, 2000)
      
      return () => {
        if (frameIntervalRef.current) {
          clearInterval(frameIntervalRef.current)
        }
      }
    }
  }, [isActive, captureFrame])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Live Face Recognition</h3>
          <Button
            onClick={isActive ? stopCamera : startCamera}
            variant={isActive ? "destructive" : "default"}
          >
            {isActive ? (
              <>
                <CameraOff className="mr-2 h-4 w-4" />
                Stop Camera
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Start Camera
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Video feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          
          {/* Overlay for bounding boxes */}
          <canvas
            ref={overlayRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />

          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
              <div className="text-center text-white">
                <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Click "Start Camera" to begin</p>
              </div>
            </div>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          <p>Detected faces: {detectedFaces.length}</p>
          <p>Attendance marked: {markedStudents.current.size}</p>
        </div>
      </div>
    </Card>
  )
}
