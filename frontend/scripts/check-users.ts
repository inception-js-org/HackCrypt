import "dotenv/config";
import db from "../db/index";
import { users } from "../db/schema";

async function checkUsers() {
  try {
    console.log("🔍 Fetching all users from database...\n");
    
    const allUsers = await db.select().from(users);
    
    if (allUsers.length === 0) {
      console.log("❌ No users found in database");
      console.log("\nℹ️  This could mean:");
      console.log("  1. No users have signed up yet");
      console.log("  2. Database connection is incorrect");
      console.log("  3. Database schema hasn't been pushed (run: npm run db:push)");
      return;
    }
    
    console.log(`✅ Found ${allUsers.length} user(s) in database\n`);
    console.log("=".repeat(80));
    
    allUsers.forEach((user, index) => {
      console.log(`\nUser #${index + 1}:`);
      console.log(`  Database ID: ${user.id}`);
      console.log(`  Clerk User ID: ${user.clerkUserId}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A');
      console.log(`  Role: ${user.role}`);
      console.log(`  Created At: ${user.createdAt}`);
      console.log(`  Updated At: ${user.updatedAt}`);
      console.log("-".repeat(80));
    });
    
    // Count by role
    const roleCounts = allUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log("\n📊 Users by Role:");
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`);
    });
    
    console.log("\n" + "=".repeat(80));
    console.log("✅ Database verification complete!");
    
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    console.log("\nℹ️  Troubleshooting:");
    console.log("  1. Check your DATABASE_URL in .env.local");
    console.log("  2. Ensure PostgreSQL is running");
    console.log("  3. Verify the users table exists (run: npm run db:push)");
  } finally {
    process.exit(0);
  }
}

console.log("🚀 Starting database verification...\n");
checkUsers();
