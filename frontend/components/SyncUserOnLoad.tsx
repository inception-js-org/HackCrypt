"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function SyncUserOnLoad() {
  const { user, isLoaded } = useUser();
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (isLoaded && user && !synced) {
      syncUser();
    }
  }, [isLoaded, user, synced]);

  const syncUser = async () => {
    if (!user) return;

    try {
      // Get role from sessionStorage (set during role selection)
      const selectedRole = sessionStorage.getItem("selectedRole");
      const currentRole = user.unsafeMetadata?.role as string;

      // If there's a selected role different from current, update it
      if (selectedRole && selectedRole !== currentRole) {
        console.log("🔄 Updating role to:", selectedRole);
        
        await user.update({
          unsafeMetadata: { role: selectedRole },
        });
        
        sessionStorage.removeItem("selectedRole");
      }

      // Sync to database
      const roleToSync = selectedRole || currentRole || "STUDENT";
      
      await fetch("/login/api/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkUserId: user.id,
          email: user.emailAddresses[0].emailAddress,
          role: roleToSync,
          firstName: user.firstName,
          lastName: user.lastName,
        }),
      });

      console.log("✅ User synced to database");
      setSynced(true);
    } catch (error) {
      console.error("❌ Failed to sync user:", error);
    }
  };

  return null; // This component doesn't render anything
}
