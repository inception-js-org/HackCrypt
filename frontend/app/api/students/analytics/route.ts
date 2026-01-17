import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendance, students, sessions, classes } from "@/db/schema";
import { eq, and, gte, lte, desc, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clerkUserId = searchParams.get("clerkUserId");

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Clerk User ID is required" },
        { status: 400 }
      );
    }

    // Get student by clerk user ID
    const student = await db
      .select()
      .from(students)
      .where(eq(students.clerkUserId, clerkUserId))
      .limit(1);

    if (!student || student.length === 0) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    const studentId = student[0].id;

    // Get all attendance records for this student
    const attendanceRecords = await db
      .select({
        id: attendance.id,
        status: attendance.status,
        faceRecognizedAt: attendance.faceRecognizedAt,
        fingerprintVerifiedAt: attendance.fingerprintVerifiedAt,
        createdAt: attendance.createdAt,
        sessionId: attendance.sessionId,
        session: {
          id: sessions.id,
          subject: sessions.subject,
          scheduledStartTime: sessions.scheduledStartTime,
        },
        class: {
          grade: classes.grade,
          section: classes.section,
        },
      })
      .from(attendance)
      .innerJoin(sessions, eq(attendance.sessionId, sessions.id))
      .innerJoin(classes, eq(sessions.classId, classes.id))
      .where(eq(attendance.studentId, studentId))
      .orderBy(desc(attendance.createdAt));

    // Calculate statistics
    const totalClasses = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(
      (r) => r.status === "PRESENT" || r.status === "FACE_ONLY" || r.status === "FINGERPRINT_ONLY"
    ).length;
    const overallAttendance = totalClasses > 0 
      ? Math.round((presentCount / totalClasses) * 100) 
      : 0;

    // Calculate by subject
    const subjectMap = new Map<string, { present: number; total: number }>();
    attendanceRecords.forEach((record) => {
      const subject = record.session.subject;
      const isPresent = record.status === "PRESENT" || record.status === "FACE_ONLY" || record.status === "FINGERPRINT_ONLY";

      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, { present: 0, total: 0 });
      }
      const stats = subjectMap.get(subject)!;
      stats.total++;
      if (isPresent) stats.present++;
    });

    const attendanceBySubject = Array.from(subjectMap.entries()).map(
      ([subject, stats]) => ({
        subject,
        percentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
        attended: stats.present,
        total: stats.total,
      })
    );

    // Calculate by month
    const monthMap = new Map<string, { present: number; total: number }>();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    // Get last 5 months
    const now = new Date();
    const fiveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 4, 1);

    attendanceRecords.forEach((record) => {
      const date = new Date(record.session.scheduledStartTime);
      if (date >= fiveMonthsAgo) {
        const monthKey = monthNames[date.getMonth()];
        const isPresent = record.status === "PRESENT" || record.status === "FACE_ONLY" || record.status === "FINGERPRINT_ONLY";

        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, { present: 0, total: 0 });
        }
        const stats = monthMap.get(monthKey)!;
        stats.total++;
        if (isPresent) stats.present++;
      }
    });

    const attendanceByMonth = Array.from(monthMap.entries()).map(
      ([month, stats]) => ({
        month,
        percentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
        attended: stats.present,
        total: stats.total,
      })
    );

    // Calculate attendance streak (consecutive present days)
    let currentStreak = 0;
    const sortedByDate = [...attendanceRecords].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    for (const record of sortedByDate) {
      const isPresent = record.status === "PRESENT" || record.status === "FACE_ONLY" || record.status === "FINGERPRINT_ONLY";
      if (isPresent) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate days attended in current month
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Get unique days in current month where student was present
    const daysAttendedSet = new Set<string>();
    attendanceRecords.forEach((record) => {
      const recordDate = new Date(record.session.scheduledStartTime);
      if (recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
        const isPresent =
          record.status === "PRESENT" ||
          record.status === "FACE_ONLY" ||
          record.status === "FINGERPRINT_ONLY";
        if (isPresent) {
          const dateKey = recordDate.toISOString().split("T")[0];
          daysAttendedSet.add(dateKey);
        }
      }
    });
    
    const daysAttended = daysAttendedSet.size;
    const monthlyAttendancePercentage =
      daysInMonth > 0 ? Math.round((daysAttended / daysInMonth) * 100) : 0;

    return NextResponse.json({
      student: {
        id: student[0].id,
        firstName: student[0].firstName,
        lastName: student[0].lastName,
        class: student[0].class,
      },
      statistics: {
        overallAttendance,
        totalClasses,
        classesAttended: presentCount,
        currentStreak,
        daysAttended,
        daysInMonth,
        monthlyAttendancePercentage,
      },
      attendanceBySubject,
      attendanceByMonth,
      recentRecords: attendanceRecords.slice(0, 10),
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}