"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SetRole() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function setRoleAndSync() {
      if (!isLoaded || !user) return;

      try {
        // Get the role from sessionStorage or use default
        const storedRole = typeof window !== "undefined" ? sessionStorage.getItem("selectedRole") : null;
        const roleToAssign = storedRole || (role === "faculty" ? "FACULTY" : "STUDENT");

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
          "FACULTY": "/teacher/attendance",
          "ADMIN": "/admin/attendance"
        };

        const redirectTo = dashboardRoutes[roleToAssign as keyof typeof dashboardRoutes] || "/";
        console.log("🚀 Redirecting to:", redirectTo);
        router.push(redirectTo);
      } catch (err) {
        console.error("Error setting role:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    }

    setRoleAndSync();
  }, [isLoaded, user, role, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={() => router.push("/login/choose-role")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Setting up your account...</p>
      </div>
    </div>
  );
}