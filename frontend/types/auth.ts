/**
 * Type definitions for the authentication system
 */

export type UserRole = "STUDENT" | "FACULTY" | "FACULTY_PENDING" | "ADMIN";

export interface UserMetadata {
  role?: UserRole;
}

export interface UserData {
  id: string;
  clerkUserId: string;
  role: UserRole;
  createdAt: Date | null;
}

/**
 * Clerk user metadata extension
 */
declare module "@clerk/nextjs" {
  interface UserPublicMetadata extends UserMetadata {}
  interface UserUnsafeMetadata extends UserMetadata {}
}
