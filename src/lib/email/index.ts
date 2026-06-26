import { Resend } from 'resend';

import { logger } from '@/lib/logger';

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
      logger.error({ module: 'email', err: error.message }, 'Failed to send password reset email');
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    logger.error({ module: 'email', err: err instanceof Error ? err.message : String(err) }, 'Unexpected error sending email');
    return { success: false, error: 'Failed to send email' };
  }
}
