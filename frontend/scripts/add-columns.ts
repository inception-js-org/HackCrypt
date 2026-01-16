import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function addMissingColumns() {
  try {
    console.log('Adding missing columns to students table...');
    
    await sql`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "face_id" text`;
    console.log('✓ Added face_id column');
    
    await sql`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "fingerprint_id" text`;
    console.log('✓ Added fingerprint_id column');
    
    await sql`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "invitation_sent" boolean DEFAULT false`;
    console.log('✓ Added invitation_sent column');
    
    await sql`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT false`;
    console.log('✓ Added is_active column');
    
    console.log('\n✅ All columns added successfully!');
  } catch (error) {
    console.error('❌ Error adding columns:', error);
    process.exit(1);
  }
}

addMissingColumns();
