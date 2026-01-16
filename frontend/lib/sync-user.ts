import db from "../db/index";
import { users, students } from "@/db/schema";
import { eq } from "drizzle-orm";

export type UserRole = "STUDENT" | "FACULTY" | "FACULTY_PENDING" | "ADMIN";

/**
 * Syncs a Clerk user to the database using an upsert pattern.
 * Creates a new user if they don't exist, or updates their information if they do.
 * For STUDENT role, also updates the students table with clerkUserId.
 */
export async function syncUserToDatabase({
  clerkUserId,
  email,
  role,
  firstName,
  lastName,
}: {
  clerkUserId: string;
  email: string;
  role: UserRole;
  firstName?: string | null;
  lastName?: string | null;
}) {
  console.log("🔄 [DB] Syncing user:", clerkUserId, "role:", role);

  try {
    // If this is a student, check if they were invited by admin
    if (role === "STUDENT") {
      const existingStudent = await db
        .select()
        .from(students)
        .where(eq(students.email, email))
        .limit(1);

      if (existingStudent.length > 0) {
        console.log("✅ [DB] Found pre-created student, linking Clerk user...");
        
        await db
          .update(students)
          .set({
            clerkUserId,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(students.id, existingStudent[0].id));

        console.log("✅ [DB] Student record updated with Clerk user ID");
      }
    }

    // Sync to users table (for all roles)
    const [user] = await db
      .insert(users)
      .values({
        clerkUserId,
        email,
        role,
        firstName: firstName || null,
        lastName: lastName || null,
      })
      .onConflictDoUpdate({
        target: users.clerkUserId,
        set: {
          email,
          role,
          firstName: firstName || null,
          lastName: lastName || null,
        },
      })
      .returning();

    console.log("✅ [DB] User synced:", user.id);
    return user;
  } catch (error) {
    console.error("❌ [DB] User sync failed:", error);
    throw error;
  }
}

/**
 * Legacy function for backward compatibility.
 * Fetches email from Clerk if not provided.
 */
export async function syncUserToDatabaseLegacy(
  clerkUserId: string,
  role: UserRole
) {
  console.log("🔄 [DB] Legacy sync for:", clerkUserId, "role:", role);

  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    if (existing.length === 0) {
      console.log("➕ [DB] Creating new user");

      const [createdUser] = await db
        .insert(users)
        .values({
          clerkUserId,
          email: "pending@clerk.dev", // Temporary email
          role,
        })
        .returning();

      console.log("✅ [DB] User created:", createdUser.id);
      return createdUser;
    }

    const dbUser = existing[0];

    if (dbUser.role !== role) {
      console.log(`🔄 [DB] Updating role: ${dbUser.role} → ${role}`);

      const [updatedUser] = await db
        .update(users)
        .set({ role })
        .where(eq(users.id, dbUser.id))
        .returning();

      return updatedUser;
    }

    console.log("ℹ️ [DB] User already synced");
    return dbUser;
  } catch (error) {
    console.error("❌ [DB] User sync failed:", error);
    throw error;
  }
}

/**
 * Deletes a user from the database when they're deleted in Clerk.
 */
export async function deleteUserFromDatabase(clerkUserId: string) {
  console.log("🗑️ [DB] Deleting user:", clerkUserId);

  try {
    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .returning();

    if (deletedUser) {
      console.log("✅ [DB] User deleted:", deletedUser.id);
      return deletedUser;
    }

    console.log("ℹ️ [DB] User not found for deletion");
    return null;
  } catch (error) {
    console.error("❌ [DB] User deletion failed:", error);
    throw error;
  }
}
