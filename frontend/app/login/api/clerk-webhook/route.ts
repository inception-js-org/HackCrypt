import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { headers } from "next/headers";
import {
  syncUserToDatabase,
  deleteUserFromDatabase,
  UserRole,
} from "@/lib/sync-user";

type ClerkWebhookEvent = {
  type: "user.created" | "user.updated" | "user.deleted";
  data: {
    id: string;
    email_addresses: Array<{ email_address: string }>;
    first_name?: string | null;
    last_name?: string | null;
    public_metadata?: {
      role?: UserRole;
    };
    private_metadata?: {
      role?: UserRole;
    };
    unsafe_metadata?: {
      role?: UserRole;
    };
  };
};

export async function POST(req: NextRequest) {
  const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!SIGNING_SECRET) {
    console.error("❌ [Webhook] CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("❌ [Webhook] Missing svix headers");
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify webhook
  const wh = new Webhook(SIGNING_SECRET);
  let evt: ClerkWebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("❌ [Webhook] Verification failed:", err);
    return NextResponse.json(
      { error: "Webhook verification failed" },
      { status: 400 }
    );
  }

  const { type, data } = evt;
  console.log(`📨 [Webhook] Received event: ${type}`);
  console.log(`👤 [Webhook] User ID: ${data.id}`);

  try {
    switch (type) {
      case "user.created":
      case "user.updated": {
        // Extract user data
        const clerkUserId = data.id;
        const email = data.email_addresses?.[0]?.email_address;
        const firstName = data.first_name;
        const lastName = data.last_name;
        
        // Get role from metadata (prefer unsafe > private > public)
        const role =
          (data.unsafe_metadata?.role as UserRole) ||
          (data.private_metadata?.role as UserRole) ||
          (data.public_metadata?.role as UserRole) ||
          "STUDENT";

        if (!email) {
          console.error("❌ [Webhook] No email found for user");
          return NextResponse.json(
            { error: "No email found" },
            { status: 400 }
          );
        }

        console.log(`🔄 [Webhook] Syncing user: ${email} with role: ${role}`);

        // Sync to database
        await syncUserToDatabase({
          clerkUserId,
          email,
          role,
          firstName,
          lastName,
        });

        console.log("✅ [Webhook] User synced successfully");
        break;
      }

      case "user.deleted": {
        console.log(`🗑️ [Webhook] Deleting user: ${data.id}`);
        await deleteUserFromDatabase(data.id);
        console.log("✅ [Webhook] User deleted successfully");
        break;
      }

      default:
        console.log(`ℹ️ [Webhook] Unhandled event type: ${type}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ [Webhook] Error processing event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
