"use client";

import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [dbUser, setDbUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      // Ensure user is synced to database
      syncUser();
    }
  }, [isLoaded, user]);

  const syncUser = async () => {
    if (!user) return;

    try {
      const response = await fetch("/login/api/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkUserId: user.id,
          email: user.emailAddresses[0].emailAddress,
          role: (user.unsafeMetadata?.role as any) || "STUDENT",
          firstName: user.firstName,
          lastName: user.lastName,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setDbUser(data.user);
      }
    } catch (error) {
      console.error("❌ Failed to sync user:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please sign in to access the dashboard.</p>
      </div>
    );
  }

  const role = dbUser?.role || user.unsafeMetadata?.role || "STUDENT";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">
            Welcome, {user.firstName || user.emailAddresses[0].emailAddress}!
          </h2>
          <p className="text-gray-600">
            Role: <span className="font-medium text-blue-600">{role}</span>
          </p>
          {dbUser && (
            <p className="text-sm text-gray-500 mt-2">
              Database ID: {dbUser.id} | Synced ✅
            </p>
          )}
        </div>

        {/* Role-Specific Content */}
        {role === "STUDENT" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-3">My Attendance</h3>
              <p className="text-gray-600">
                View your attendance records and face verification history.
              </p>
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                View Attendance
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-3">My Classes</h3>
              <p className="text-gray-600">
                Check your enrolled classes and upcoming sessions.
              </p>
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                View Classes
              </button>
            </div>
          </div>
        )}

        {role === "FACULTY_PENDING" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              Pending Faculty Verification
            </h3>
            <p className="text-yellow-700">
              Your faculty account is pending approval. You will need to complete
              face verification before accessing faculty features.
            </p>
            <button className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
              Complete Verification
            </button>
          </div>
        )}

        {role === "FACULTY" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-3">My Classes</h3>
              <p className="text-gray-600">
                Manage your classes and start attendance sessions.
              </p>
              <button className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                Manage Classes
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-3">Attendance Reports</h3>
              <p className="text-gray-600">
                View and export attendance reports for your classes.
              </p>
              <button className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                View Reports
              </button>
            </div>
          </div>
        )}

        {role === "ADMIN" && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-3">User Management</h3>
              <p className="text-gray-600">Manage users and approve faculty accounts.</p>
              <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                Manage Users
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-3">System Settings</h3>
              <p className="text-gray-600">Configure system-wide settings.</p>
              <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                Settings
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-3">Analytics</h3>
              <p className="text-gray-600">View system analytics and reports.</p>
              <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                View Analytics
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
