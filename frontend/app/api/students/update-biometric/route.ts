import { NextRequest, NextResponse } from 'next/server'
import db from '@/db'
import { students } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const { studentDbId, faceId, fingerprintId } = await request.json()

    console.log('📝 Updating biometric data:', { studentDbId, faceId, fingerprintId })

    // ✅ Validate studentDbId
    const studentId = parseInt(studentDbId)
    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: 'Invalid student ID' },
        { status: 400 }
      )
    }

    // ✅ Build update object only with provided values
    const updateData: any = {
      updatedAt: new Date()
    }
    
    if (faceId !== undefined && faceId !== null) {
      updateData.faceId = String(faceId)
    }
    
    if (fingerprintId !== undefined && fingerprintId !== null) {
      updateData.fingerprintId = String(fingerprintId)
    }

    console.log('✅ Update data prepared:', updateData)

    const result = await db
      .update(students)
      .set(updateData)
      .where(eq(students.id, studentId))
      .returning()

    console.log('✅ Biometric data updated:', result)

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

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