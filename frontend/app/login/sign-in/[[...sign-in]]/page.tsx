"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role");
  
  // Store role for after sign-in if provided
  if (role && typeof window !== "undefined") {
    sessionStorage.setItem("selectedRole", role);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl",
          },
        }}
        signUpUrl="/login/choose-role"
        afterSignInUrl="/"
      />
    </div>
  );
}
