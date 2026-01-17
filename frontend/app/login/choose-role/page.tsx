"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ChooseRolePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRoleSelection = (role: "STUDENT" | "FACULTY" | "ADMIN") => {
    setLoading(true);
    
    // Admin has separate login page
    if (role === "ADMIN") {
      router.push("/login/admin");
      return;
    }
    
    // Store role in sessionStorage to use after authentication
    sessionStorage.setItem("selectedRole", role);
    
    // Redirect to sign-in
    router.push(`/login/sign-in?role=${role}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="max-w-6xl w-full mx-4">
        <div className="text-left mb-8">
          <button
            onClick={() => router.push("/")}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Back to Home
          </button>
        </div>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Role</h1>
          <p className="text-lg text-gray-600">Select your role to continue</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Student Card */}
          <div className="bg-white rounded-2xl shadow-xl p-10 hover:shadow-2xl transition-all border-2 border-blue-200">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">I&apos;m a Student</h2>
              <p className="text-gray-600 mb-6">Mark your attendance and track your classes</p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => handleRoleSelection("STUDENT")}
                disabled={loading}
                className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
              > 
                Sign In as Student
              </button>
            </div>
          </div>

          {/* Faculty Card */}
          <div className="bg-white rounded-2xl shadow-xl p-10 hover:shadow-2xl transition-all border-2 border-blue-200">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">I&apos;m Faculty</h2>
              <p className="text-gray-600 mb-6">Manage classes and track student attendance</p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => handleRoleSelection("FACULTY")}
                disabled={loading}
                className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
              >
                Sign In as Faculty
              </button>
            </div>
          </div>

          {/* Admin Card */}
          <div className="bg-white rounded-2xl shadow-xl p-10 hover:shadow-2xl transition-all border-2 border-blue-200">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">I&apos;m Admin</h2>
              <p className="text-gray-600 mb-6">Manage the entire system</p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => handleRoleSelection("ADMIN")}
                disabled={loading}
                className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
              >
                Admin Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
