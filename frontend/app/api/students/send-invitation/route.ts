import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { students } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { studentDbId, email, firstName, lastName } = await request.json()

    console.log('Sending invitation to:', email)

    // Check if user already exists in Clerk
    const checkUserResponse = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    const existingUsers = await checkUserResponse.json()
    
    if (existingUsers.length > 0) {
      console.log('User already exists in Clerk:', existingUsers[0].id)
      
      // Update student record with existing Clerk user ID
      await db
        .update(students)
        .set({ 
          clerkUserId: existingUsers[0].id,
          invitationSent: true,
          updatedAt: new Date(),
        })
        .where(eq(students.id, parseInt(studentDbId)))

      return NextResponse.json({
        success: true,
        message: 'User already exists. Student record updated with existing Clerk user.',
        existingUser: true,
        clerkUserId: existingUsers[0].id,
      })
    }

    // Create Clerk invitation
    const clerkResponse = await fetch('https://api.clerk.com/v1/invitations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: email,
        public_metadata: {
          role: 'STUDENT',
          studentDbId: studentDbId,
        },
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/login/sign-up`,
      }),
    })

    if (!clerkResponse.ok) {
      const errorData = await clerkResponse.json()
      console.error('Clerk error:', errorData)
      throw new Error(`Clerk invitation failed: ${JSON.stringify(errorData)}`)
    }

    const invitation = await clerkResponse.json()
    console.log('Clerk invitation created:', invitation.id)

    // Update student record
    await db
      .update(students)
      .set({ 
        invitationSent: true,
        updatedAt: new Date(),
      })
      .where(eq(students.id, parseInt(studentDbId)))

    // Send custom email with invitation link
    try {
      await resend.emails.send({
        from: 'School System <onboarding@resend.dev>',
        to: email,
        subject: 'Welcome to School Portal - Complete Your Registration',
        html: `
          <!DOCTYPE html>
          <html>
            <body>
              <h1>Welcome ${firstName} ${lastName}!</h1>
              <p>Your student account has been created.</p>
              <p>Student ID: ${studentDbId}</p>
              <p><a href="${invitation.url}">Complete Registration</a></p>
            </body>
          </html>
        `,
      })
      console.log('Email sent successfully')
    } catch (emailError) {
      console.error('Email sending failed:', emailError)
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      invitationId: invitation.id,
    })

  } catch (error: any) {
    console.error('Error sending invitation:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to send invitation' 
      },
      { status: 500 }
    )
  }
}