import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ambiguousAttendance } from "@/db/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionId,
      classId,
      possibleStudentIds,
      faceEmbedding,
      fingerprintData,
      reason,
    } = body;

    const record = await db
      .insert(ambiguousAttendance)
      .values({
        sessionId,
        classId,
        possibleStudentIds: possibleStudentIds || [],
        faceEmbedding,
        fingerprintData,
        reason,
      })
      .returning();

    return NextResponse.json(record[0], { status: 201 });
  } catch (error) {
    console.error("Error recording ambiguous attendance:", error);
    return NextResponse.json(
      { error: "Failed to record ambiguous attendance" },
      { status: 500 }
    );
  }
}