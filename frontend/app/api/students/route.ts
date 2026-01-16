import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { students } from '@/db/schema'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, phone, class: className } = body

    console.log('Creating student:', { firstName, lastName, email })

    const result = await db.insert(students).values({
      firstName,
      lastName,
      email,
      phone,
      class: className,
    }).returning()

    console.log('Student created with ID:', result[0].id)

    return NextResponse.json({ 
      id: result[0].id,
      message: 'Student created successfully' 
    })
  } catch (error: any) {
    console.error('Error creating student:', error)
    return NextResponse.json(
      { error: 'Failed to create student', details: error.message },
      { status: 500 }
    )
  }
}