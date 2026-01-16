import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrateDatabase() {
  console.log("🔄 Migrating database schema...\n");

  try {
    // Drop existing table if it exists
    console.log("1️⃣ Dropping existing users table (if exists)...");
    await sql`DROP TABLE IF EXISTS users CASCADE`;
    console.log("✅ Table dropped\n");

    // Create new table with correct schema
    console.log("2️⃣ Creating users table with Neon-compatible schema...");
    await sql`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        clerk_user_id TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'STUDENT',
        first_name TEXT,
        last_name TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log("✅ Users table created\n");

    // Create index on clerk_user_id for faster lookups
    console.log("3️⃣ Creating index on clerk_user_id...");
    await sql`CREATE INDEX idx_users_clerk_user_id ON users(clerk_user_id)`;
    console.log("✅ Index created\n");

    console.log("✅ Migration complete! Database is ready.\n");
    console.log("Next steps:");
    console.log("  1. Run: npm run dev");
    console.log("  2. Sign up a new user");
    console.log("  3. Run: npm run check-users");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateDatabase();
