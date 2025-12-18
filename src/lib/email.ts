import { Resend } from 'resend';
import { render } from '@react-email/render';
import { InvitationEmail } from '@/emails/invitation-email';

// Lazy-load Resend to avoid build-time errors
let resend: Resend | null = null;

function getResendClient() {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export interface SendInvitationEmailParams {
  to: string;
  organizationName: string;
  inviterName: string;
  inviterEmail: string;
  role: string;
  inviteLink: string;
  expiresAt: Date;
}

export async function sendInvitationEmail({
  to,
  organizationName,
  inviterName,
  inviterEmail,
  role,
  inviteLink,
  expiresAt,
}: SendInvitationEmailParams) {
  try {
    const emailHtml = await render(
      InvitationEmail({
        organizationName,
        inviterName,
        inviterEmail,
        role,
        inviteLink,
        expiresAt,
      })
    );

    const resendClient = getResendClient();
    const { data, error } = await resendClient.emails.send({
      from: 'Advisor GPT <onboarding@resend.dev>',
      to: [to],
      subject: `You're invited to join ${organizationName}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Error sending invitation email:', error);
      throw new Error(`Failed to send invitation email: ${error.message}`);
    }

    console.log('Invitation email sent successfully:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('Failed to send invitation email:', error);
    throw error;
  }
}
