"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role");
  
  // Store role for after sign-up if provided
  if (role && typeof window !== "undefined") {
    sessionStorage.setItem("selectedRole", role);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <SignUp 
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl",
            formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
          },
        }}
        afterSignUpUrl="/"
        signInUrl="/login/sign-in"
      />
    </div>
  );
}
