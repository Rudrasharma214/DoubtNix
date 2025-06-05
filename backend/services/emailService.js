const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isInitialized = false;
    this.initPromise = this.initializeTransporter();
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initPromise;
    }
  }

  /**
   * Get the frontend URL based on environment
   */
  getFrontendUrl() {
    // Priority: Environment variable > Production default > Development default
    if (process.env.FRONTEND_URL) {
      return process.env.FRONTEND_URL;
    }

    if (process.env.NODE_ENV === 'production') {
      // Replace with your actual production domain when deploying
      return 'https://your-app-name.herokuapp.com'; // Update this!
    }

    return 'http://localhost:3000';
  }

  async initializeTransporter() {
    try {
      // Use Gmail configuration for real email sending
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'rudraspam90@gmail.com',
          pass: 'fjoncpwapvbyrkcc'
        }
      });

      // Test the connection
      await this.transporter.verify();
      // console.log('✅ Gmail email service connected successfully');

    } catch (error) {
      console.error('Failed to connect to Gmail:', error);

      // Fallback to console logging for development
      console.log('📧 Using console fallback for email delivery');
      this.transporter = null;
    }

    this.isInitialized = true;
  }

  async sendEmail({ to, subject, html, text }) {
    try {
      await this.ensureInitialized();

      // If no transporter available (development fallback), log to console
      if (!this.transporter) {
        console.log('\n📧 EMAIL SIMULATION (Development Mode)');
        console.log('=====================================');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Content: ${text}`);
        console.log('=====================================\n');
        return { messageId: 'simulated-' + Date.now() };
      }

      const mailOptions = {
        from: 'DoubtNix <rudraspam90@gmail.com>',
        to,
        subject,
        html,
        text
      };

      const result = await this.transporter.sendMail(mailOptions);

      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 Email sent successfully!');
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(result));
      }

      return result;
    } catch (error) {
      console.error('Email sending failed:', error);

      // In development, don't fail - just log the email content
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n📧 EMAIL FALLBACK (Development Mode)');
        console.log('====================================');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Content: ${text}`);
        console.log('====================================\n');
        return { messageId: 'fallback-' + Date.now() };
      }

      throw new Error('Failed to send email');
    }
  }

  async sendVerificationEmail(user, verificationToken) {
    const frontendUrl = this.getFrontendUrl();
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to AI Doubt Solver!</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.firstName},</h2>
            <p>Thank you for signing up for AI Doubt Solver! To complete your registration, please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${verificationUrl}">${verificationUrl}</a></p>
            <p>This verification link will expire in 24 hours.</p>
            <p>If you didn't create an account with us, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2024 AI Doubt Solver. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to DoubtNix!
      
      Hi ${user.firstName},
      
      Thank you for signing up! Please verify your email address by visiting:
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you didn't create an account with us, please ignore this email.
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Verify Your Email - AI Doubt Solver',
      html,
      text
    });
  }

  async sendPasswordResetEmail(user, resetToken) {
    const frontendUrl = this.getFrontendUrl();
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #EF4444; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.firstName},</h2>
            <p>We received a request to reset your password for your AI Doubt Solver account.</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>This reset link will expire in 1 hour.</p>
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>© 2024 AI Doubt Solver. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Password Reset Request
      
      Hi ${user.firstName},
      
      We received a request to reset your password. Click the link below to reset it:
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request this, please ignore this email.
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Reset Your Password - AI Doubt Solver',
      html,
      text
    });
  }

  async sendLoginOTP(user, otp) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Login Verification Code</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .otp-code { background: #f0f0f0; border: 2px dashed #3B82F6; padding: 20px; text-align: center; margin: 20px 0; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #3B82F6; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Login Verification</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.firstName},</h2>
            <p>We received a login request for your AI Doubt Solver account. Please use the verification code below to complete your login:</p>

            <div class="otp-code">${otp}</div>

            <p><strong>This code will expire in 10 minutes.</strong></p>

            <div class="warning">
              <strong>Security Notice:</strong> If you didn't attempt to log in, please ignore this email and consider changing your password.
            </div>

            <p>For your security, never share this code with anyone.</p>
          </div>
          <div class="footer">
            <p>© 2024 AI Doubt Solver. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Login Verification Code

      Hi ${user.firstName},

      We received a login request for your AI Doubt Solver account.

      Your verification code is: ${otp}

      This code will expire in 10 minutes.

      If you didn't attempt to log in, please ignore this email.

      For your security, never share this code with anyone.
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Login Verification Code - AI Doubt Solver',
      html,
      text
    });
  }

  async sendPasswordResetOTP(user, otp) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset Verification Code</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #EF4444; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .otp-code { background: #f0f0f0; border: 2px dashed #EF4444; padding: 20px; text-align: center; margin: 20px 0; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #EF4444; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Verification</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.firstName},</h2>
            <p>We received a request to reset your password for your AI Doubt Solver account. Please use the verification code below to proceed:</p>

            <div class="otp-code">${otp}</div>

            <p><strong>This code will expire in 10 minutes.</strong></p>

            <div class="warning">
              <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email and consider changing your password.
            </div>

            <p>For your security, never share this code with anyone.</p>
          </div>
          <div class="footer">
            <p>© 2024 AI Doubt Solver. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Password Reset Verification Code

      Hi ${user.firstName},

      We received a request to reset your password for your AI Doubt Solver account.

      Your verification code is: ${otp}

      This code will expire in 10 minutes.

      If you didn't request a password reset, please ignore this email.

      For your security, never share this code with anyone.
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Password Reset Verification Code - AI Doubt Solver',
      html,
      text
    });
  }

  async send2FASetupEmail(user) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Two-Factor Authentication Enabled</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Two-Factor Authentication Enabled</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.firstName},</h2>
            <p>Two-factor authentication has been successfully enabled on your AI Doubt Solver account.</p>
            <p>Your account is now more secure! You'll need to enter a verification code from your authenticator app each time you log in.</p>
            <p>If you didn't enable this feature, please contact our support team immediately.</p>
          </div>
          <div class="footer">
            <p>© 2024 AI Doubt Solver. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Two-Factor Authentication Enabled - AI Doubt Solver',
      html,
      text: `Hi ${user.firstName}, Two-factor authentication has been enabled on your account.`
    });
  }
}

module.exports = new EmailService();
