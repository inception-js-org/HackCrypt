import { NextRequest, NextResponse } from 'next/server'
import db from '@/db'
import { students } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { studentDbId, email, firstName, lastName } = await request.json()

    console.log('Sending invitation to:', email)

    // Step 1: Check if user already exists in Clerk
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
          isActive: true,
          invitationSent: true,
          updatedAt: new Date(),
        })
        .where(eq(students.id, parseInt(studentDbId)))

      return NextResponse.json({
        success: true,
        message: 'User already registered. Student record updated.',
        existingUser: true,
        clerkUserId: existingUsers[0].id,
      })
    }

    // Step 2: Check for existing pending invitations
    const checkInvitationsResponse = await fetch(`https://api.clerk.com/v1/invitations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (checkInvitationsResponse.ok) {
      const invitations = await checkInvitationsResponse.json()
      const existingInvitation = invitations.data?.find(
        (inv: any) => inv.email_address === email && inv.status === 'pending'
      )

      if (existingInvitation) {
        console.log('Found existing invitation:', existingInvitation.id)
        
        // Revoke the old invitation
        const revokeResponse = await fetch(`https://api.clerk.com/v1/invitations/${existingInvitation.id}/revoke`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        })

        if (revokeResponse.ok) {
          console.log('Old invitation revoked successfully')
        } else {
          console.error('Failed to revoke old invitation')
        }
      }
    }

    // Step 3: Create new Clerk invitation
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
          firstName: firstName,
          lastName: lastName,
        },
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/login/sign-up`,
      }),
    })

    if (!clerkResponse.ok) {
      const errorData = await clerkResponse.json()
      console.error('Clerk error:', errorData)
      throw new Error(`Clerk invitation failed: ${errorData.errors?.[0]?.long_message || JSON.stringify(errorData)}`)
    }

    const invitation = await clerkResponse.json()
    console.log('Clerk invitation created:', invitation.id)

    // Step 4: Update student record
    await db
      .update(students)
      .set({ 
        invitationSent: true,
        updatedAt: new Date(),
      })
      .where(eq(students.id, parseInt(studentDbId)))

    // Step 5: Send custom email with invitation link
    try {
      await resend.emails.send({
        from: 'School System <onboarding@resend.dev>',
        to: email,
        subject: 'Welcome to School Portal - Complete Your Registration',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9f9f9; }
                .button { display: inline-block; padding: 12px 24px; background: #10B981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to School Portal!</h1>
                </div>
                <div class="content">
                  <h2>Hello ${firstName} ${lastName},</h2>
                  <p>Your student account has been created successfully.</p>
                  <p><strong>Student ID:</strong> STU-${studentDbId}</p>
                  <p>Please click the button below to complete your registration:</p>
                  <a href="${invitation.url}" class="button">Complete Registration</a>
                  <p>If the button doesn't work, copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; color: #3B82F6;">${invitation.url}</p>
                </div>
                <div class="footer">
                  <p>This invitation will expire in 7 days.</p>
                  <p>If you didn't expect this email, please ignore it.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      })
      console.log('Email sent successfully to:', email)
    } catch (emailError) {
      console.error('Email sending failed:', emailError)
      // Don't fail the whole process if email fails
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