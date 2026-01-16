import { NextRequest, NextResponse } from 'next/server'
import db from '@/db'
import { students } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const { studentDbId, faceId, fingerprintId } = await request.json()

    const updateData: any = {}
    if (faceId) updateData.faceId = faceId
    if (fingerprintId) updateData.fingerprintId = fingerprintId
    updateData.updatedAt = new Date()

    await db
      .update(students)
      .set(updateData)
      .where(eq(students.id, parseInt(studentDbId)))

    return NextResponse.json({ 
      success: true,
      message: 'Biometric data updated successfully' 
    })
  } catch (error: any) {
    console.error('Error updating biometric data:', error)
    return NextResponse.json(
      { error: 'Failed to update biometric data', details: error.message },
      { status: 500 }
    )
  }
}
