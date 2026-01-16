import db from "@/db";
import { faculty } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, department, designation, assignedClasses } = body;

    // Generate employee ID (TCH-YYYY-XXX format)
    const year = new Date().getFullYear();
    const lastFaculty = await db.select().from(faculty).orderBy(desc(faculty.id)).limit(1);
    const nextId = lastFaculty.length > 0 ? lastFaculty[0].id + 1 : 1;
    const employeeId = `TCH-${year}-${String(nextId).padStart(3, '0')}`;

    // Insert faculty
    const newFaculty = await db.insert(faculty).values({
      firstName,
      lastName,
      email,
      phone,
      department,
      designation,
      employeeId,
      assignedClasses: assignedClasses || [],
    }).returning();

    return NextResponse.json({ 
      success: true, 
      faculty: newFaculty[0],
      message: "Faculty created successfully" 
    });
  } catch (error) {
    console.error("Error creating faculty:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create faculty" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const allFaculty = await db.select().from(faculty).orderBy(desc(faculty.createdAt));
    return NextResponse.json({ success: true, faculty: allFaculty });
  } catch (error) {
    console.error("Error fetching faculty:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch faculty" },
      { status: 500 }
    );
  }
}