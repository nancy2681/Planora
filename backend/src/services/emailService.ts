import nodemailer from 'nodemailer';

export const sendResetEmail = async (to: string, resetUrl: string): Promise<boolean> => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.FROM_EMAIL || 'Planora <no-reply@planora.com>';

  // Check if SMTP is configured
  if (!host || !user || !pass) {
    console.warn('\n⚠️  SMTP is not configured in backend/.env. To receive emails in your inbox, configure:\n' +
      'SMTP_HOST=...\n' +
      'SMTP_PORT=...\n' +
      'SMTP_USER=...\n' +
      'SMTP_PASS=...\n' +
      'FROM_EMAIL=...\n'
    );
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    const mailOptions = {
      from,
      to,
      subject: 'Planora - Reset Your Password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #6366f1; text-align: center;">Planora</h2>
          <p>Hello,</p>
          <p>You requested to reset your password for your Planora account. Please click the button below to reset it:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p>This reset link will expire in 1 hour.</p>
          <p>If you did not request a password reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #64748b; text-align: center;">Planora Project Management SaaS</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send email via SMTP:', error);
    throw error;
  }
};
