import { NextRequest, NextResponse } from 'next/server'
import db from '@/db'
import { students } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const { studentDbId, faceId, fingerprintId } = await request.json()

    console.log('📝 Updating biometric data:', { studentDbId, faceId, fingerprintId })

    const updateData: any = {}
    if (faceId) updateData.faceId = faceId
    if (fingerprintId) updateData.fingerprintId = fingerprintId
    updateData.updatedAt = new Date()

    const result = await db
      .update(students)
      .set(updateData)
      .where(eq(students.id, parseInt(studentDbId)))
      .returning()

    console.log('✅ Biometric data updated:', result)

    return NextResponse.json({ 
      success: true,
      message: 'Biometric data updated successfully',
      data: result[0]
    })
  } catch (error: any) {
    console.error('❌ Error updating biometric data:', error)
    return NextResponse.json(
      { error: 'Failed to update biometric data', details: error.message },
      { status: 500 }
    )
  }
}
