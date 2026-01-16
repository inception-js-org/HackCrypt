"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function SetRole() {
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const role = searchParams.get("role");

  useEffect(() => {
    async function setRoleAndSync() {
      if (!isLoaded || !user) return;

      try {
        // Get the role from sessionStorage or use default
        const storedRole = typeof window !== "undefined" ? sessionStorage.getItem("selectedRole") : null;
        const roleToAssign = storedRole || role === "faculty" ? "FACULTY_PENDING" : "STUDENT";

        console.log("🔄 Setting role:", roleToAssign, "for user:", user.id);

        // Update Clerk metadata
        await user.update({
          unsafeMetadata: {
            role: roleToAssign,
          },
        });

        console.log("✅ Clerk metadata updated");

        // Sync to database via API route
        console.log("🔄 Syncing to database...");
        const response = await fetch("/login/api/sync-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clerkUserId: user.id,
            email: user.emailAddresses[0]?.emailAddress,
            role: roleToAssign,
            firstName: user.firstName,
            lastName: user.lastName,
          }),
        });

        const data = await response.json();
        console.log("📡 API Response:", response.status, data);

        if (!response.ok) {
          throw new Error(data.error || "Failed to sync user to database");
        }

        console.log("✅ User synced to database successfully");

        // Clear sessionStorage
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("selectedRole");
        }

        // Redirect to role-specific dashboard
        const dashboardRoutes = {
          "STUDENT": "/student/timetable",
          "FACULTY_PENDING": "/teacher/attendance",
          "FACULTY": "/teacher/attendance",
          "ADMIN": "/admin/attendance"
        };

        const redirectTo = dashboardRoutes[roleToAssign as keyof typeof dashboardRoutes] || "/";
        router.push(redirectTo);
      } catch (err) {
        console.error("❌ Error setting role:", err);
        setError(`Failed to complete setup: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    setRoleAndSync();
  }, [isLoaded, user, role, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-fuchsia-600"></div>
        <p className="text-lg">Setting up your account…</p>
        <p className="text-sm text-muted">Please wait while we configure your profile</p>
      </div>
    </div>
  );
}