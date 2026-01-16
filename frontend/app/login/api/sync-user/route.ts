import { NextRequest, NextResponse } from "next/server";
import { syncUserToDatabase, syncUserToDatabaseLegacy, UserRole } from "@/lib/sync-user";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    console.log("🔄 [API] Sync user request received");
    
    // Verify the user is authenticated
    const { userId } = await auth();
    
    console.log("🔐 [API] Auth user ID:", userId);
    
    if (!userId) {
      console.error("❌ [API] Unauthorized - no userId");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { clerkUserId, role, email, firstName, lastName } = body;

    console.log("📦 [API] Request body:", { clerkUserId, role });

    // Ensure the authenticated user is syncing their own account
    if (userId !== clerkUserId) {
      console.error("❌ [API] Forbidden - user mismatch:", { userId, clerkUserId });
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Validate role if provided
    const validRoles: UserRole[] = ["STUDENT", "FACULTY", "FACULTY_PENDING", "ADMIN"];
    if (role && !validRoles.includes(role)) {
      console.error("❌ [API] Invalid role:", role);
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    console.log("🔄 [API] Calling syncUserToDatabase...");
    
    // Fetch current user data from Clerk if needed
    let userData = { email, role, firstName, lastName };
    
    if (!email || !role) {
      const user = await currentUser();
      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      
      userData = {
        email: email || user.emailAddresses[0]?.emailAddress || "unknown@clerk.dev",
        role: role || (user.unsafeMetadata?.role as UserRole) || "STUDENT",
        firstName: firstName || user.firstName || null,
        lastName: lastName || user.lastName || null,
      };
    }

    // Sync to database with upsert
    const dbUser = await syncUserToDatabase({
      clerkUserId,
      email: userData.email,
      role: userData.role,
      firstName: userData.firstName,
      lastName: userData.lastName,
    });

    console.log("✅ [API] User synced successfully:", dbUser.id);

    return NextResponse.json({ success: true, user: dbUser });
  } catch (error) {
    console.error("❌ [API] Sync user error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
