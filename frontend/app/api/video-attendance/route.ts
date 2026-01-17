import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendance, students, sessions } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, detectedStudents } = body;

    if (!sessionId || !detectedStudents || !Array.isArray(detectedStudents)) {
      return NextResponse.json(
        { error: "Missing sessionId or detectedStudents" },
        { status: 400 }
      );
    }

    // Verify session exists and is active
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Get student IDs as numbers
    const studentIds = detectedStudents.map((s: { student_id: string }) => 
      parseInt(s.student_id, 10)
    ).filter((id: number) => !isNaN(id));

    if (studentIds.length === 0) {
      return NextResponse.json(
        { error: "No valid student IDs found" },
        { status: 400 }
      );
    }

    // Fetch students from database to validate
    const validStudents = await db
      .select()
      .from(students)
      .where(inArray(students.id, studentIds));

    const validStudentIds = new Set(validStudents.map(s => s.id));

    // Check existing attendance records
    const existingAttendance = await db
      .select()
      .from(attendance)
      .where(eq(attendance.sessionId, sessionId));

    const alreadyMarked = new Set(existingAttendance.map(a => a.studentId));

    // Prepare attendance records
    const now = new Date();
    const newRecords = [];
    const skippedDuplicates = [];
    const invalidStudents = [];

    for (const detected of detectedStudents) {
      const studentId = parseInt(detected.student_id, 10);
      
      if (isNaN(studentId)) {
        invalidStudents.push(detected.student_id);
        continue;
      }

      if (!validStudentIds.has(studentId)) {
        invalidStudents.push(studentId);
        continue;
      }

      if (alreadyMarked.has(studentId)) {
        skippedDuplicates.push(studentId);
        continue;
      }

      newRecords.push({
        sessionId: sessionId,
        studentId: studentId,
        faceRecognizedAt: now,
        faceConfidence: Math.round(detected.average_confidence * 100),
        status: "PRESENT" as const,
      });

      alreadyMarked.add(studentId); // Prevent duplicates within batch
    }

    // Insert new attendance records
    let insertedCount = 0;
    if (newRecords.length > 0) {
      await db.insert(attendance).values(newRecords);
      insertedCount = newRecords.length;
    }

    return NextResponse.json({
      success: true,
      message: `Marked ${insertedCount} students present`,
      details: {
        total_detected: detectedStudents.length,
        marked_present: insertedCount,
        skipped_duplicates: skippedDuplicates.length,
        invalid_students: invalidStudents.length,
      },
      marked_students: newRecords.map(r => r.studentId),
      skipped_duplicates: skippedDuplicates,
      invalid_students: invalidStudents,
    });

  } catch (error) {
    console.error("Error marking video attendance:", error);
    return NextResponse.json(
      { error: "Failed to mark attendance" },
      { status: 500 }
    );
  }
}