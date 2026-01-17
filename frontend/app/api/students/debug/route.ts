import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";

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
      // Return debugging info
      return NextResponse.json({
        status: "not_found",
        clerkUserId,
        message: "Student record not found in database",
        hint: "Make sure the student has been created and their clerkUserId is set correctly",
      });
    }

    return NextResponse.json({
      status: "found",
      student: {
        id: student[0].id,
        clerkUserId: student[0].clerkUserId,
        firstName: student[0].firstName,
        lastName: student[0].lastName,
        email: student[0].email,
        class: student[0].class,
      },
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json(
      { error: "Failed to check student", details: String(error) },
      { status: 500 }
    );
  }
}