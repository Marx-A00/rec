export function getPasswordResetEmailHtml(resetUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #18181b; border: 1px solid #3f3f46; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #ffffff;">Reset your password</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                We received a request to reset the password for your rec account. Click the button below to choose a new password.
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                This link will expire in <strong style="color: #ffffff;">1 hour</strong>.
              </p>
              <!-- Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background-color: #fff8e7; color: #000000; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                      Reset password
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 32px; border-top: 1px solid #27272a;">
              <p style="margin: 0 0 8px; font-size: 12px; line-height: 1.5; color: #71717a;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #52525b;">
                If the button doesn't work, copy and paste this URL into your browser:
              </p>
              <p style="margin: 8px 0 0; font-size: 11px; line-height: 1.5; color: #52525b; word-break: break-all;">
                ${resetUrl}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function getPasswordResetEmailText(resetUrl: string): string {
  return `Reset your password

We received a request to reset the password for your rec account.

Click the link below to choose a new password (expires in 1 hour):

${resetUrl}

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.`;
}
