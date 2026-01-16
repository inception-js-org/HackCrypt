/**
 * Test Database Connection Script
 * 
 * This script tests the PostgreSQL connection using Drizzle ORM
 * Run with: npx tsx scripts/test-db-connection.ts
 */

import db from "../db/index";
import { users } from "@/db/schema";

async function testConnection() {
  console.log("🔍 Testing PostgreSQL connection...\n");

  try {
    // Test 1: Simple query
    console.log("Test 1: Fetching all users...");
    const allUsers = await db.select().from(users);
    console.log(`✅ Success! Found ${allUsers.length} users in the database.`);
    
    if (allUsers.length > 0) {
      console.log("\nSample user:");
      console.log(JSON.stringify(allUsers[0], null, 2));
    }

    // Test 2: Check database URL
    console.log("\n✅ Database connection successful!");
    console.log(`📊 Database URL: ${process.env.DATABASE_URL?.split("@")[1] || "Not found"}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Database connection failed!");
    console.error("Error:", error);
    
    if (!process.env.DATABASE_URL) {
      console.error("\n⚠️  DATABASE_URL is not defined in .env file");
    } else {
      console.error("\n⚠️  DATABASE_URL is set but connection failed");
      console.error("Please check:");
      console.error("  1. PostgreSQL server is running");
      console.error("  2. Database credentials are correct");
      console.error("  3. Network/firewall allows connection");
    }
    
    process.exit(1);
  }
}

testConnection();
