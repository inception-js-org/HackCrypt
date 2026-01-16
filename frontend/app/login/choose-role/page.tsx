"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ChooseRolePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRoleSelection = (role: "STUDENT" | "FACULTY_PENDING", action: "signup" | "signin") => {
    setLoading(true);
    
    // Store role in sessionStorage to use after authentication
    sessionStorage.setItem("selectedRole", role);
    
    // Redirect to sign-up or sign-in
    if (action === "signup") {
      router.push(`/login/sign-up?role=${role}`);
    } else {
      router.push(`/login/sign-in?role=${role}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl w-full mx-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Role</h1>
          <p className="text-lg text-gray-600">Select your role to continue</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Student Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">I'm a Student</h2>
              <p className="text-gray-600 mb-6">Mark your attendance and track your classes</p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => handleRoleSelection("STUDENT", "signup")}
                disabled={loading}
                className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
              >
                Sign Up as Student
              </button>
              <button
                onClick={() => handleRoleSelection("STUDENT", "signin")}
                disabled={loading}
                className="w-full py-3 px-6 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-50 font-medium transition-colors"
              >
                Sign In as Student
              </button>
            </div>
          </div>

          {/* Faculty Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">I'm Faculty</h2>
              <p className="text-gray-600 mb-6">Manage classes and track student attendance</p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => handleRoleSelection("FACULTY_PENDING", "signup")}
                disabled={loading}
                className="w-full py-3 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
              >
                Sign Up as Faculty
              </button>
              <button
                onClick={() => handleRoleSelection("FACULTY_PENDING", "signin")}
                disabled={loading}
                className="w-full py-3 px-6 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 disabled:opacity-50 font-medium transition-colors"
              >
                Sign In as Faculty
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => router.push("/")}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
