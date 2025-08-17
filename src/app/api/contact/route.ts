import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: Request) {
  try {
    const { name, email, message, subject } = await request.json();

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Send email using Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        await resend.emails.send({
          from: 'contact@jacobchaffin.io', // Must be verified domain
          to: ['jchaffin57@gmail.com'],
          subject: subject || `Contact form: Message from ${name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
                New Contact Form Submission
              </h2>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${name}</p>
                <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${subject || 'No subject'}</p>
              </div>
              <div style="margin: 20px 0;">
                <h3 style="color: #333;">Message:</h3>
                <div style="background: white; padding: 15px; border: 1px solid #ddd; border-radius: 4px;">
                  ${message.replace(/\n/g, '<br>')}
                </div>
              </div>
              <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f1f5f9; border-radius: 8px;">
                <p style="margin: 0; color: #64748b; font-size: 14px;">
                  Sent from jacobchaffin.io contact form
                </p>
              </div>
            </div>
          `,
        });
        
        console.log('✅ Email sent successfully via Resend');
      } catch (emailError) {
        console.error('❌ Resend email error:', emailError);
        // Continue execution - don't fail the form submission
      }
    } else {
      console.warn('⚠️ RESEND_API_KEY not configured - emails will not be sent');
    }

    return NextResponse.json({ success: true, message: 'Contact form submitted successfully' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}