import { NextRequest, NextResponse } from "next/server";
import  db  from "@/db";
import { classes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allClasses = await db.select().from(classes);
    return NextResponse.json(allClasses);
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json(
      { error: "Failed to fetch classes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { grade, section, roomNumber, maxCapacity, teacherId, subjects } = body;

    if (!grade || !section || !maxCapacity) {
      return NextResponse.json(
        { error: "Grade, section, and max capacity are required" },
        { status: 400 }
      );
    }

    const newClass = await db
      .insert(classes)
      .values({
        grade,
        section,
        roomNumber,
        maxCapacity,
        teacherId,
        subjects: subjects || [],
      })
      .returning();

    return NextResponse.json(newClass[0], { status: 201 });
  } catch (error) {
    console.error("Error creating class:", error);
    return NextResponse.json(
      { error: "Failed to create class" },
      { status: 500 }
    );
  }
}