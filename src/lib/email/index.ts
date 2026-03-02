import { Resend } from 'resend';

import {
  getPasswordResetEmailHtml,
  getPasswordResetEmailText,
} from './templates/password-reset';

let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@rec-music.org';

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getResendClient().emails.send({
      from: `rec <${FROM_EMAIL}>`,
      to: email,
      subject: 'Reset your password',
      html: getPasswordResetEmailHtml(resetUrl),
      text: getPasswordResetEmailText(resetUrl),
    });

    if (error) {
      console.error('[email] Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[email] Unexpected error sending email:', err);
    return { success: false, error: 'Failed to send email' };
  }
}
