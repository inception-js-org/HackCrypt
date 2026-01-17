import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { faculty } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    console.log("📥 [API] GET /api/faculty - Fetching all faculty");
    
    const allFaculty = await db
      .select()
      .from(faculty)
      .orderBy(desc(faculty.createdAt));

    console.log(`✅ [API] Found ${allFaculty.length} faculty members`);

    return NextResponse.json({
      success: true,
      faculty: allFaculty,
    });
  } catch (error) {
    console.error("❌ [API] Error fetching faculty:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch faculty" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("📥 [API] POST /api/faculty - Creating new faculty");
    
    const body = await request.json();
    console.log("📦 [API] Request body:", body);
    
    const { firstName, lastName, email, phone, department, designation, assignedClasses } = body;

    // Validation
    if (!firstName || !lastName || !email || !phone || !department) {
      console.error("❌ [API] Missing required fields");
      return NextResponse.json(
        { success: false, error: "First name, last name, email, phone, and department are required" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingFaculty = await db
      .select()
      .from(faculty)
      .where(eq(faculty.email, email))
      .limit(1);

    if (existingFaculty.length > 0) {
      console.error("❌ [API] Email already exists:", email);
      return NextResponse.json(
        { success: false, error: "A faculty member with this email already exists" },
        { status: 409 }
      );
    }

    // Generate employee ID (TCH-YYYY-XXX format)
    const year = new Date().getFullYear();
    const countResult = await db.select().from(faculty);
    const count = countResult.length + 1;
    const employeeId = `TCH-${year}-${count.toString().padStart(3, "0")}`;

    console.log("🔧 [API] Generated employee ID:", employeeId);

    // Insert new faculty
    const newFaculty = await db
      .insert(faculty)
      .values({
        firstName,
        lastName,
        email,
        phone,
        department,
        designation: designation || null,
        employeeId,
        assignedClasses: assignedClasses || [],
        invitationSent: false,
      })
      .returning();

    console.log("✅ [API] Faculty created:", newFaculty[0]);

    return NextResponse.json({
      success: true,
      faculty: newFaculty[0],
    }, { status: 201 });
  } catch (error) {
    console.error("❌ [API] Error creating faculty:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create faculty" },
      { status: 500 }
    );
  }
}