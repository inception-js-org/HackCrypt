import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendance, students, sessions, ambiguousAttendance, classes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const attendanceRecords = await db
      .select({
        id: attendance.id,
        studentId: attendance.studentId,
        faceRecognizedAt: attendance.faceRecognizedAt,
        fingerprintVerifiedAt: attendance.fingerprintVerifiedAt,
        faceConfidence: attendance.faceConfidence,
        status: attendance.status,
        student: {
          id: students.id,
          firstName: students.firstName,
          lastName: students.lastName,
          faceId: students.faceId,
          fingerprintId: students.fingerprintId,
        },
      })
      .from(attendance)
      .leftJoin(students, eq(attendance.studentId, students.id))
      .where(eq(attendance.sessionId, parseInt(sessionId)));

    return NextResponse.json(attendanceRecords);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, studentId, type, confidence } = body;

    if (!sessionId || !studentId || !type) {
      return NextResponse.json(
        { error: "Session ID, student ID, and type are required" },
        { status: 400 }
      );
    }

    // Check if attendance record already exists for this student in this session
    const existingAttendance = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.sessionId, sessionId),
          eq(attendance.studentId, studentId)
        )
      );

    if (existingAttendance.length > 0) {
      // Update existing record
      const record = existingAttendance[0];
      const updateData: any = {};

      if (type === "face" && !record.faceRecognizedAt) {
        updateData.faceRecognizedAt = new Date();
        updateData.faceConfidence = confidence || 0;
      } else if (type === "fingerprint" && !record.fingerprintVerifiedAt) {
        updateData.fingerprintVerifiedAt = new Date();
      }

      // Determine status
      const hasFace = record.faceRecognizedAt || type === "face";
      const hasFingerprint = record.fingerprintVerifiedAt || type === "fingerprint";

      if (hasFace && hasFingerprint) {
        updateData.status = "PRESENT";
      } else if (hasFace) {
        updateData.status = "FACE_ONLY";
      } else if (hasFingerprint) {
        updateData.status = "FINGERPRINT_ONLY";
      }

      if (Object.keys(updateData).length > 0) {
        const updated = await db
          .update(attendance)
          .set(updateData)
          .where(eq(attendance.id, record.id))
          .returning();

        return NextResponse.json(updated[0]);
      }

      return NextResponse.json(record);
    }

    // Create new attendance record
    const newAttendance = await db
      .insert(attendance)
      .values({
        sessionId,
        studentId,
        faceRecognizedAt: type === "face" ? new Date() : null,
        fingerprintVerifiedAt: type === "fingerprint" ? new Date() : null,
        faceConfidence: type === "face" ? confidence : null,
        status: type === "face" ? "FACE_ONLY" : "FINGERPRINT_ONLY",
      })
      .returning();

    return NextResponse.json(newAttendance[0], { status: 201 });
  } catch (error) {
    console.error("Error recording attendance:", error);
    return NextResponse.json(
      { error: "Failed to record attendance" },
      { status: 500 }
    );
  }
}