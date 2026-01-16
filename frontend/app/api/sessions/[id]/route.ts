import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionId = parseInt(id);
    
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (session.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(session[0]);
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionId = parseInt(id);
    const body = await request.json();
    const { action } = body;

    if (action === "start") {
      const updated = await db
        .update(sessions)
        .set({
          status: "ACTIVE",
          actualStartTime: new Date(),
        })
        .where(eq(sessions.id, sessionId))
        .returning();

      return NextResponse.json(updated[0]);
    }

    if (action === "end") {
      const updated = await db
        .update(sessions)
        .set({
          status: "CLOSED",
          actualEndTime: new Date(),
        })
        .where(eq(sessions.id, sessionId))
        .returning();

      return NextResponse.json(updated[0]);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating session:", error);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}