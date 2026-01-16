import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students, classes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return NextResponse.json(
        { error: "Class ID is required" },
        { status: 400 }
      );
    }

    // Get class details
    const classDetails = await db
      .select()
      .from(classes)
      .where(eq(classes.id, parseInt(classId)));

    if (classDetails.length === 0) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const classInfo = classDetails[0];
    const classString = `${classInfo.grade}-${classInfo.section}`;

    // Get students in this class
    const classStudents = await db
      .select({
        id: students.id,
        firstName: students.firstName,
        lastName: students.lastName,
        email: students.email,
        faceId: students.faceId,
        fingerprintId: students.fingerprintId,
      })
      .from(students)
      .where(eq(students.class, classString));

    return NextResponse.json({
      class: classInfo,
      students: classStudents,
      totalStudents: classStudents.length,
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}