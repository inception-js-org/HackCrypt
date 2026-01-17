import { NextRequest, NextResponse } from 'next/server'
import db from '@/db'
import { students } from '@/db/schema'
import { desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    // Fetch last 5 students, ordered by creation date
    const recentStudents = await db
      .select()
      .from(students)
      .orderBy(desc(students.createdAt))
      .limit(5)

    return NextResponse.json({
      success: true,
      students: recentStudents,
    })
  } catch (error: any) {
    console.error('❌ Error fetching recent students:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent students', details: error.message },
      { status: 500 }
    )
  }
}