import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { sessions, classes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const facultyId = searchParams.get("facultyId");
    const date = searchParams.get("date");

    const allSessions = await db
      .select({
        id: sessions.id,
        classId: sessions.classId,
        facultyId: sessions.facultyId,
        subject: sessions.subject,
        scheduledStartTime: sessions.scheduledStartTime,
        scheduledEndTime: sessions.scheduledEndTime,
        actualStartTime: sessions.actualStartTime,
        actualEndTime: sessions.actualEndTime,
        status: sessions.status,
        class: {
          id: classes.id,
          grade: classes.grade,
          section: classes.section,
          maxCapacity: classes.maxCapacity,
        },
      })
      .from(sessions)
      .leftJoin(classes, eq(sessions.classId, classes.id));

    // Filter by faculty if provided
    let filteredSessions = allSessions;
    if (facultyId) {
      filteredSessions = filteredSessions.filter(
        (s) => s.facultyId === parseInt(facultyId)
      );
    }

    // Filter by date if provided
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      filteredSessions = filteredSessions.filter((s) => {
        const sessionDate = new Date(s.scheduledStartTime);
        return sessionDate >= startOfDay && sessionDate <= endOfDay;
      });
    }

    return NextResponse.json(filteredSessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { classId, facultyId, subject, scheduledStartTime, scheduledEndTime } = body;

    if (!classId || !facultyId || !subject || !scheduledStartTime || !scheduledEndTime) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const newSession = await db
      .insert(sessions)
      .values({
        classId,
        facultyId,
        subject,
        scheduledStartTime: new Date(scheduledStartTime),
        scheduledEndTime: new Date(scheduledEndTime),
        status: "SCHEDULED",
      })
      .returning();

    return NextResponse.json(newSession[0], { status: 201 });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}