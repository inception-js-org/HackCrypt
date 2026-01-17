import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  faculty,
  sessions,
  attendance,
  students,
  classes,
  ambiguousAttendance,
  users,
} from "@/db/schema";
import { eq, inArray, desc } from "drizzle-orm";

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

    // Try to find faculty by clerkUserId first
    let teacherData = await db
      .select()
      .from(faculty)
      .where(eq(faculty.clerkUserId, clerkUserId))
      .limit(1);

    // If not found by clerkUserId, try to find user and match by email
    if (!teacherData || teacherData.length === 0) {
      const userData = await db
        .select()
        .from(users)
        .where(eq(users.clerkUserId, clerkUserId))
        .limit(1);

      if (userData && userData.length > 0) {
        // Found user, now find faculty by email
        teacherData = await db
          .select()
          .from(faculty)
          .where(eq(faculty.email, userData[0].email))
          .limit(1);
      }
    }

    if (!teacherData || teacherData.length === 0) {
      return NextResponse.json(
        { error: "Teacher not found" },
        { status: 404 }
      );
    }

    const teacher = teacherData[0];
    const teacherId = teacher.id;

    // Get all sessions taught by this teacher
    const teacherSessions = await db
      .select({
        id: sessions.id,
        classId: sessions.classId,
        subject: sessions.subject,
        scheduledStartTime: sessions.scheduledStartTime,
        status: sessions.status,
      })
      .from(sessions)
      .where(eq(sessions.facultyId, teacherId))
      .orderBy(desc(sessions.scheduledStartTime));

    if (teacherSessions.length === 0) {
      return NextResponse.json({
        teacher: {
          id: teacher.id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          department: teacher.department,
        },
        statistics: {
          totalClasses: 0,
          totalStudents: 0,
          averageAttendance: 0,
          anomaliesDetected: 0,
        },
        classPerformance: [],
        recentAnomalies: [],
      });
    }

    const sessionIds = teacherSessions.map((s) => s.id);
    const classIds = teacherSessions.map((s) => s.classId);

    // Get all classes data
    const classesData = await db
      .select()
      .from(classes)
      .where(inArray(classes.id, classIds));

    // Get unique class-wise student count
    const classStudents = await Promise.all(
      classesData.map(async (cls) => {
        const classKey = `${cls.grade}-${cls.section}`
        const classStudentList = await db
          .select({ id: students.id })
          .from(students)
          .where(eq(students.class, classKey))
        return { classId: cls.id, classKey, count: classStudentList.length }
      })
    );

    const totalStudents = classStudents.reduce((sum, cs) => sum + cs.count, 0);

    // Get attendance records for all sessions
    const attendanceRecords = await db
      .select({
        id: attendance.id,
        status: attendance.status,
        studentId: attendance.studentId,
        sessionId: attendance.sessionId,
        student: {
          firstName: students.firstName,
          lastName: students.lastName,
        },
        session: {
          id: sessions.id,
          subject: sessions.subject,
          classId: sessions.classId,
        },
      })
      .from(attendance)
      .innerJoin(sessions, eq(attendance.sessionId, sessions.id))
      .innerJoin(students, eq(attendance.studentId, students.id))
      .where(inArray(attendance.sessionId, sessionIds));

    // Get anomalies
    const anomalies = await db
      .select()
      .from(ambiguousAttendance)
      .where(inArray(ambiguousAttendance.sessionId, sessionIds))
      .orderBy(desc(ambiguousAttendance.createdAt))
      .limit(10);

    // Calculate statistics
    const totalClasses = teacherSessions.length;
    const presentCount = attendanceRecords.filter(
      (r) =>
        r.status === "PRESENT" ||
        r.status === "FACE_ONLY" ||
        r.status === "FINGERPRINT_ONLY"
    ).length;
    const totalAttendanceRecords = attendanceRecords.length;
    const averageAttendance =
      totalAttendanceRecords > 0
        ? Math.round((presentCount / totalAttendanceRecords) * 100)
        : 0;
    const anomaliesDetected = anomalies.length;

    // Calculate class-wise performance
    const classPerformanceMap = new Map<
      string,
      { className: string; attendance: number; students: number; present: number; total: number }
    >();

    classesData.forEach((cls) => {
      const classKey = `${cls.grade}-${cls.section}`;
      const classSessionIds = teacherSessions
        .filter((s) => s.classId === cls.id)
        .map((s) => s.id);

      const classAttendance = attendanceRecords.filter((r) =>
        classSessionIds.includes(r.sessionId)
      );

      const classPresent = classAttendance.filter(
        (r) =>
          r.status === "PRESENT" ||
          r.status === "FACE_ONLY" ||
          r.status === "FINGERPRINT_ONLY"
      ).length;

      const classTotal = classAttendance.length;
      const classAttendancePercentage =
        classTotal > 0 ? Math.round((classPresent / classTotal) * 100) : 0;

      const studentCountForClass = classStudents.find(
        (cs) => cs.classId === cls.id
      )?.count || 0;

      classPerformanceMap.set(classKey, {
        className: classKey,
        attendance: classAttendancePercentage,
        students: studentCountForClass,
        present: classPresent,
        total: classTotal,
      });
    });

    const classPerformance = Array.from(classPerformanceMap.values()).sort(
      (a, b) => b.attendance - a.attendance
    );

    // Format anomalies for display
    const recentAnomalies = anomalies.slice(0, 5).map((anomaly) => ({
      id: anomaly.id,
      reason: anomaly.reason,
      resolved: anomaly.resolved,
      createdAt: anomaly.createdAt,
    }));

    // Get all unique subjects taught by this teacher
    const uniqueSubjects = Array.from(new Set(teacherSessions.map((s) => s.subject.trim()))).sort();

    // Calculate attendance by date for each subject
    const subjectAttendanceData: Record<
      string,
      Array<{ date: string; originalDate: string; studentsPresent: number }>
    > = {};
    const subjectDateRanges: Record<string, string> = {};

    uniqueSubjects.forEach((subject) => {
      const subjectSessions = teacherSessions.filter(
        (s) => s.subject.trim() === subject
      );
      const subjectSessionIds = subjectSessions.map((s) => s.id);

      const subjectAttendanceByDate = new Map<
        string,
        { date: string; studentsPresent: number }
      >();

      // Initialize all sessions dates with 0 attendance
      subjectSessions.forEach((session) => {
        const dateStr = new Date(session.scheduledStartTime)
          .toISOString()
          .split("T")[0];

        if (!subjectAttendanceByDate.has(dateStr)) {
          subjectAttendanceByDate.set(dateStr, { date: dateStr, studentsPresent: 0 });
        }
      });

      const subjectAttendance = attendanceRecords.filter((r) =>
        subjectSessionIds.includes(r.sessionId)
      );

      subjectAttendance.forEach((record) => {
        const sessionDate = subjectSessions.find((s) => s.id === record.sessionId);
        if (sessionDate) {
          const dateStr = new Date(sessionDate.scheduledStartTime)
            .toISOString()
            .split("T")[0];

          const isPresent =
            record.status === "PRESENT" ||
            record.status === "FACE_ONLY" ||
            record.status === "FINGERPRINT_ONLY";

          if (isPresent) {
            const entry = subjectAttendanceByDate.get(dateStr)!;
            entry.studentsPresent++;
          }
        }
      });

      const formattedData = Array.from(subjectAttendanceByDate.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((item) => ({
          date: new Date(item.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          originalDate: item.date,
          studentsPresent: item.studentsPresent,
        }));

      subjectAttendanceData[subject] = formattedData;

      // Get date range for subject
      if (formattedData.length > 0) {
        const firstDate = new Date(formattedData[0].originalDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const lastDate = new Date(formattedData[formattedData.length - 1].originalDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        subjectDateRanges[subject] = `${firstDate} to ${lastDate}`;
      }
    });
    return NextResponse.json({
      teacher: {
        id: teacher.id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        department: teacher.department,
      },
      statistics: {
        totalClasses,
        totalStudents,
        averageAttendance,
        anomaliesDetected,
      },
      classPerformance,
      recentAnomalies,
      subjects: uniqueSubjects,
      subjectAttendanceData,
      subjectDateRanges,
    });
  } catch (error) {
    console.error("Error fetching teacher analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data", details: String(error) },
      { status: 500 }
    );
  }
}