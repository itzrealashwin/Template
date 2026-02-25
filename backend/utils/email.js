import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: Number(process.env.EMAIL_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send an OTP verification email.
 * @param {string} to - recipient email
 * @param {string} otp - the plaintext OTP code
 * @param {'verify' | 'reset'} type - purpose of the OTP
 */
const sendOTPEmail = async (to, otp, type) => {
  const subject =
    type === 'verify'
      ? 'Verify Your Email Address'
      : 'Password Reset Request';

  const heading =
    type === 'verify'
      ? 'Email Verification'
      : 'Password Reset';

  const description =
    type === 'verify'
      ? 'Thank you for registering! Please use the following code to verify your email address.'
      : 'We received a request to reset your password. Use the code below to proceed.';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body { margin: 0; padding: 0; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .container { max-width: 520px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .header { background: #1a1a2e; padding: 28px 32px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; }
        .body { padding: 32px; }
        .body p { color: #51545e; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
        .otp-box { text-align: center; margin: 28px 0; }
        .otp-code { display: inline-block; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a2e; background: #f0f0f5; padding: 16px 32px; border-radius: 8px; }
        .expiry { text-align: center; color: #e63946; font-size: 13px; font-weight: 500; margin-top: 8px; }
        .divider { border: none; border-top: 1px solid #eaeaec; margin: 24px 0; }
        .disclaimer { font-size: 13px; color: #9a9ea6; line-height: 1.5; }
        .footer { background: #f4f4f7; padding: 20px 32px; text-align: center; }
        .footer p { color: #9a9ea6; font-size: 12px; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${heading}</h1>
        </div>
        <div class="body">
          <p>${description}</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <p class="expiry">This code expires in 5 minutes</p>
          </div>
          <hr class="divider" />
          <p class="disclaimer">
            If you did not request this code, please ignore this email and your account will remain secure.
            Do not share this code with anyone. Our team will never ask you for this code.
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Your App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
};

export { sendOTPEmail };
