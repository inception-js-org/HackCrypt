import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { adminUsers } from "../db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seedAdminUser() {
  try {
    console.log("🌱 Seeding admin user...");

    // Check if admin already exists
    const existingAdmin = await db.select().from(adminUsers).where({
      username: "admin"
    } as any);

    if (existingAdmin.length > 0) {
      console.log("✅ Admin user already exists");
      return;
    }

    // Insert admin user
    await db.insert(adminUsers).values({
      username: "admin",
      password: "admin#@786", // In production, this should be hashed
      email: "admin@system.com",
      role: "ADMIN",
      firstName: "Admin",
      lastName: "User",
    });

    console.log("✅ Admin user created successfully");
    console.log("   Username: admin");
    console.log("   Password: admin");
  } catch (error) {
    console.error("❌ Error seeding admin user:", error);
    throw error;
  }
}

seedAdminUser()
  .then(() => {
    console.log("✅ Seeding complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
