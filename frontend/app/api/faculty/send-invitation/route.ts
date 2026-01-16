import { NextRequest, NextResponse } from 'next/server'
import db from '@/db'
import { faculty } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { facultyDbId, email, firstName, lastName } = await request.json()

    console.log('Sending faculty invitation to:', email)

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
      
      // Update faculty record with existing Clerk user ID
      await db
        .update(faculty)
        .set({ 
          clerkUserId: existingUsers[0].id,
          invitationSent: true,
          updatedAt: new Date(),
        })
        .where(eq(faculty.id, parseInt(facultyDbId)))

      return NextResponse.json({
        success: true,
        message: 'User already registered. Faculty record updated.',
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
          role: 'FACULTY',
          facultyDbId: facultyDbId,
          firstName: firstName,
          lastName: lastName,
        },
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/login/sign-up?role=faculty`,
      }),
    })

    if (!clerkResponse.ok) {
      const errorData = await clerkResponse.json()
      console.error('Clerk error:', errorData)
      throw new Error(`Clerk invitation failed: ${errorData.errors?.[0]?.long_message || JSON.stringify(errorData)}`)
    }

    const invitation = await clerkResponse.json()
    console.log('Clerk invitation created:', invitation.id)

    // Step 4: Update faculty record
    await db
      .update(faculty)
      .set({ 
        invitationSent: true,
        updatedAt: new Date(),
      })
      .where(eq(faculty.id, parseInt(facultyDbId)))

    // Step 5: Send custom email with invitation link
    try {
      await resend.emails.send({
        from: 'School System <onboarding@resend.dev>',
        to: email,
        subject: 'Welcome to School Portal - Faculty Registration',
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
                .info-box { background: white; padding: 15px; border-left: 4px solid #3B82F6; margin: 15px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to School Portal!</h1>
                </div>
                <div class="content">
                  <h2>Hello ${firstName} ${lastName},</h2>
                  <p>Your faculty account has been created successfully. You have been registered as a teacher in our school management system.</p>
                  
                  <div class="info-box">
                    <p><strong>Faculty ID:</strong> TCH-${facultyDbId}</p>
                    <p><strong>Role:</strong> Faculty Member</p>
                  </div>

                  <p>Please click the button below to complete your registration and set up your account:</p>
                  <a href="${invitation.url}" class="button">Complete Registration</a>
                  
                  <p>If the button doesn't work, copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; color: #3B82F6;">${invitation.url}</p>

                  <div class="info-box">
                    <h3>What's Next?</h3>
                    <ul>
                      <li>Set up your password</li>
                      <li>Complete your profile information</li>
                      <li>Access your dashboard</li>
                      <li>View your assigned classes</li>
                      <li>Manage student attendance</li>
                    </ul>
                  </div>
                </div>
                <div class="footer">
                  <p>This invitation will expire in 7 days.</p>
                  <p>If you didn't expect this email or have any questions, please contact the school administrator.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      })
      console.log('Faculty invitation email sent successfully to:', email)
    } catch (emailError) {
      console.error('Email sending failed:', emailError)
      // Don't fail the whole process if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Faculty invitation sent successfully',
      invitationId: invitation.id,
    })

  } catch (error: any) {
    console.error('Error sending faculty invitation:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to send faculty invitation' 
      },
      { status: 500 }
    )
  }
}