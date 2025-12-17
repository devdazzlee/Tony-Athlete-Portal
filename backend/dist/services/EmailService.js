"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const crypto_1 = __importDefault(require("crypto"));
class EmailService {
    constructor() {
        this.transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: parseInt(process.env.SMTP_PORT || "587"),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    async sendEmail(options) {
        try {
            const mailOptions = {
                from: process.env.SMTP_FROM || '"Trackdesk" <noreply@trackdesk.com>',
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text || options.html.replace(/<[^>]*>/g, ""),
            };
            await this.transporter.sendMail(mailOptions);
            console.log(`Email sent successfully to ${options.to}`);
        }
        catch (error) {
            console.error("Error sending email:", error);
            throw new Error("Failed to send email");
        }
    }
    async sendVerificationEmail(email, firstName, verificationToken) {
        const verificationUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/verify-email?token=${verificationToken}`;
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email - Trackdesk</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #ffffff;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #3b82f6;
            }
            .content {
              margin-bottom: 30px;
            }
            .button {
              display: inline-block;
              padding: 14px 28px;
              background-color: #3b82f6;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              text-align: center;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #2563eb;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 14px;
              color: #6b7280;
              text-align: center;
            }
            .warning {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 12px;
              margin: 20px 0;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎯 Trackdesk</div>
            </div>
            
            <div class="content">
              <h2>Welcome to Trackdesk, ${firstName}!</h2>
              
              <p>Thank you for signing up. To complete your registration and start using Trackdesk, please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #3b82f6;">${verificationUrl}</p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> This verification link will expire in 24 hours. If you didn't create an account with Trackdesk, please ignore this email.
              </div>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} Trackdesk. All rights reserved.</p>
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;
        const text = `
Welcome to Trackdesk, ${firstName}!

Thank you for signing up. To complete your registration and start using Trackdesk, please verify your email address by clicking the link below:

${verificationUrl}

This verification link will expire in 24 hours. If you didn't create an account with Trackdesk, please ignore this email.

© ${new Date().getFullYear()} Trackdesk. All rights reserved.
    `.trim();
        await this.sendEmail({
            to: email,
            subject: "Verify Your Email - Trackdesk",
            html,
            text,
        });
    }
    async sendWelcomeEmail(email, firstName) {
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Trackdesk!</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #ffffff;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #3b82f6;
              margin-bottom: 10px;
            }
            h1 {
              color: #1e40af;
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
            }
            .features {
              background-color: #f8fafc;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .feature-item {
              margin: 10px 0;
              padding-left: 25px;
              position: relative;
            }
            .feature-item:before {
              content: "✓";
              position: absolute;
              left: 0;
              color: #10b981;
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 14px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Trackdesk</div>
              <h1>Welcome to Trackdesk, ${firstName}! 🎉</h1>
            </div>
            
            <p>We're excited to have you on board! Your affiliate account has been successfully created and verified.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/login" class="button">
                Get Started
              </a>
            </div>
            
            <div class="features">
              <h3 style="margin-top: 0;">What you can do with Trackdesk:</h3>
              <div class="feature-item">Generate unique affiliate links</div>
              <div class="feature-item">Track clicks and conversions in real-time</div>
              <div class="feature-item">Monitor your earnings and commissions</div>
              <div class="feature-item">Access detailed analytics and reports</div>
              <div class="feature-item">Manage your referrals efficiently</div>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Log in to your dashboard</li>
              <li>Complete your profile information</li>
              <li>Create your first affiliate link</li>
              <li>Start promoting and earning!</li>
            </ol>
            
            <p>If you have any questions or need assistance, our support team is here to help.</p>
            
            <div class="footer">
              <p>Happy tracking! 🚀</p>
              <p>The Trackdesk Team</p>
              <p style="font-size: 12px; color: #9ca3af; margin-top: 10px;">
                This email was sent to ${email}. If you didn't create this account, please ignore this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
        const text = `
      Welcome to Trackdesk, ${firstName}!
      
      We're excited to have you on board! Your affiliate account has been successfully created and verified.
      
      What you can do with Trackdesk:
      - Generate unique affiliate links
      - Track clicks and conversions in real-time
      - Monitor your earnings and commissions
      - Access detailed analytics and reports
      - Manage your referrals efficiently
      
      Next Steps:
      1. Log in to your dashboard
      2. Complete your profile information
      3. Create your first affiliate link
      4. Start promoting and earning!
      
      Get Started: ${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/login
      
      Happy tracking!
      The Trackdesk Team
    `.trim();
        await this.sendEmail({
            to: email,
            subject: "Welcome to Trackdesk - Let's Get Started! 🚀",
            html,
            text,
        });
    }
    async sendPasswordResetEmail(email, firstName, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/reset-password?token=${resetToken}`;
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password - Trackdesk</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #fff; text-decoration: none; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Password Reset Request</h2>
            <p>Hi ${firstName},</p>
            <p>We received a request to reset your password. Click the button below to reset it:</p>
            <p><a href="${resetUrl}" class="button">Reset Password</a></p>
            <p>Or copy this link: ${resetUrl}</p>
            <p>This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
          </div>
        </body>
      </html>
    `;
        await this.sendEmail({
            to: email,
            subject: "Reset Your Password - Trackdesk",
            html,
        });
    }
    async sendCommissionPaidEmail(email, firstName, commissionDetails) {
        const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/commissions`;
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Commission Payment Received - Trackdesk</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f3f4f6;
            }
            .container {
              background-color: #ffffff;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #f0fdf4;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #3b82f6;
              margin-bottom: 10px;
            }
            .success-icon {
              font-size: 64px;
              margin: 20px 0;
            }
            h1 {
              color: #10b981;
              margin: 20px 0 10px 0;
              font-size: 28px;
            }
            .subtitle {
              color: #6b7280;
              font-size: 16px;
              margin-bottom: 30px;
            }
            .amount-box {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 30px;
              border-radius: 10px;
              text-align: center;
              margin: 30px 0;
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            }
            .amount-label {
              font-size: 14px;
              opacity: 0.9;
              margin-bottom: 5px;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .amount {
              font-size: 48px;
              font-weight: bold;
              margin: 10px 0;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .payment-status {
              font-size: 14px;
              opacity: 0.95;
              margin-top: 10px;
              padding: 8px 16px;
              background-color: rgba(255, 255, 255, 0.2);
              border-radius: 20px;
              display: inline-block;
            }
            .details-section {
              background-color: #f9fafb;
              border-radius: 8px;
              padding: 25px;
              margin: 25px 0;
            }
            .details-title {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
            }
            .details-title:before {
              content: "📊";
              margin-right: 10px;
              font-size: 22px;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 12px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              color: #6b7280;
              font-weight: 500;
            }
            .detail-value {
              color: #1f2937;
              font-weight: 600;
              text-align: right;
            }
            .button {
              display: inline-block;
              padding: 14px 32px;
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              text-align: center;
              margin: 25px 0;
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
              transition: transform 0.2s;
            }
            .button:hover {
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
              transform: translateY(-2px);
            }
            .info-box {
              background-color: #eff6ff;
              border-left: 4px solid #3b82f6;
              padding: 16px;
              margin: 25px 0;
              border-radius: 6px;
            }
            .info-box-title {
              font-weight: 600;
              color: #1e40af;
              margin-bottom: 8px;
              display: flex;
              align-items: center;
            }
            .info-box-title:before {
              content: "ℹ️";
              margin-right: 8px;
            }
            .info-box-content {
              color: #1e40af;
              font-size: 14px;
              line-height: 1.6;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
            }
            .footer-text {
              font-size: 14px;
              color: #6b7280;
              margin: 10px 0;
            }
            .social-links {
              margin: 20px 0;
            }
            .social-links a {
              color: #3b82f6;
              text-decoration: none;
              margin: 0 10px;
              font-weight: 500;
            }
            .highlight {
              background-color: #fef3c7;
              padding: 2px 6px;
              border-radius: 3px;
              font-weight: 600;
              color: #92400e;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎯 Trackdesk</div>
              <div class="success-icon">💰</div>
              <h1>Payment Processed!</h1>
              <p class="subtitle">Your commission has been successfully paid</p>
            </div>
            
            <p style="font-size: 16px; color: #374151;">
              Hi <strong>${firstName}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #374151;">
              Great news! Your commission has been marked as <span class="highlight">PAID</span> and the payment has been processed to your account.
            </p>
            
            <div class="amount-box">
              <div class="amount-label">Commission Amount</div>
              <div class="amount">$${commissionDetails.amount.toFixed(2)}</div>
              <div class="payment-status">✓ Payment Processed</div>
            </div>
            
            <div class="details-section">
              <div class="details-title">Payment Details</div>
              
              <div class="detail-row">
                <span class="detail-label">Commission ID</span>
                <span class="detail-value">#${commissionDetails.commissionId.substring(0, 8).toUpperCase()}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Referral Code</span>
                <span class="detail-value">${commissionDetails.referralCode}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Order Value</span>
                <span class="detail-value">$${commissionDetails.orderValue.toFixed(2)}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Commission Rate</span>
                <span class="detail-value">${commissionDetails.commissionRate}%</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Payment Method</span>
                <span class="detail-value">${commissionDetails.paymentMethod || "Default Method"}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Payment Date</span>
                <span class="detail-value">${commissionDetails.paidDate}</span>
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="${dashboardUrl}" class="button">
                View Commission History →
              </a>
            </div>
            
            <div class="info-box">
              <div class="info-box-title">What's Next?</div>
              <div class="info-box-content">
                • The payment should reflect in your account within 2-5 business days<br>
                • You can view your complete commission history in your dashboard<br>
                • Keep promoting to earn more commissions!<br>
                • Check your pending commissions for upcoming payments
              </div>
            </div>
            
            <p style="font-size: 16px; color: #374151; margin-top: 30px;">
              <strong>Thank you for being a valued affiliate partner!</strong>
            </p>
            
            <p style="font-size: 14px; color: #6b7280;">
              If you have any questions about this payment or need assistance, please don't hesitate to contact our support team.
            </p>
            
            <div class="footer">
              <p class="footer-text">
                <strong>Keep up the great work! 🚀</strong>
              </p>
              <p class="footer-text">
                The Trackdesk Team
              </p>
              <div class="social-links">
                <a href="#">Help Center</a> • 
                <a href="#">Contact Support</a> • 
                <a href="#">Dashboard</a>
              </div>
              <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
                This email was sent to <strong>${email}</strong> regarding your affiliate account.<br>
                © ${new Date().getFullYear()} Trackdesk. All rights reserved.
              </p>
              <p style="font-size: 11px; color: #d1d5db; margin-top: 10px;">
                This is an automated email notification. Please do not reply to this message.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
        const text = `
Commission Payment Processed - Trackdesk

Hi ${firstName},

Great news! Your commission has been marked as PAID and the payment has been processed to your account.

COMMISSION AMOUNT: $${commissionDetails.amount.toFixed(2)}

Payment Details:
- Commission ID: #${commissionDetails.commissionId.substring(0, 8).toUpperCase()}
- Referral Code: ${commissionDetails.referralCode}
- Order Value: $${commissionDetails.orderValue.toFixed(2)}
- Commission Rate: ${commissionDetails.commissionRate}%
- Payment Method: ${commissionDetails.paymentMethod || "Default Method"}
- Payment Date: ${commissionDetails.paidDate}

What's Next?
• The payment should reflect in your account within 2-5 business days
• You can view your complete commission history in your dashboard
• Keep promoting to earn more commissions!

View your commission history: ${dashboardUrl}

Thank you for being a valued affiliate partner!

The Trackdesk Team
    `.trim();
        await this.sendEmail({
            to: email,
            subject: `💰 Commission Payment Processed - $${commissionDetails.amount.toFixed(2)}`,
            html,
            text,
        });
    }
    async sendOfferCreatedEmail(email, firstName, offerDetails) {
        const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/links`;
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Offer Available - Trackdesk</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #374151;
              background-color: #f9fafb;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .offer-icon {
              font-size: 48px;
              margin-bottom: 15px;
            }
            h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .subtitle {
              margin: 10px 0 0 0;
              opacity: 0.9;
              font-size: 16px;
            }
            .content {
              padding: 30px 20px;
            }
            .offer-box {
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              border: 2px solid #0ea5e9;
              border-radius: 12px;
              padding: 25px;
              margin: 25px 0;
              text-align: center;
            }
            .offer-name {
              font-size: 24px;
              font-weight: bold;
              color: #0c4a6e;
              margin-bottom: 10px;
            }
            .commission-rate {
              font-size: 32px;
              font-weight: bold;
              color: #059669;
              margin: 15px 0;
            }
            .referral-code {
              background: #1f2937;
              color: white;
              padding: 12px 20px;
              border-radius: 8px;
              font-family: 'Courier New', monospace;
              font-size: 18px;
              font-weight: bold;
              margin: 15px 0;
              display: inline-block;
            }
            .details-section {
              background: #f8fafc;
              border-radius: 8px;
              padding: 20px;
              margin: 25px 0;
            }
            .details-title {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 15px;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 8px;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              margin: 12px 0;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-weight: 600;
              color: #374151;
            }
            .detail-value {
              color: #6b7280;
              text-align: right;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              margin: 20px 0;
              transition: transform 0.2s;
            }
            .button:hover {
              transform: translateY(-2px);
            }
            .info-box {
              background: #fef3c7;
              border: 1px solid #f59e0b;
              border-radius: 8px;
              padding: 20px;
              margin: 25px 0;
            }
            .info-box-title {
              font-weight: 600;
              color: #92400e;
              margin-bottom: 10px;
              font-size: 16px;
            }
            .info-box-content {
              color: #92400e;
              line-height: 1.6;
            }
            .footer {
              background: #f8fafc;
              padding: 20px;
              text-align: center;
              border-top: 1px solid #e5e7eb;
            }
            .footer-text {
              margin: 8px 0;
              color: #6b7280;
            }
            .social-links {
              margin: 15px 0;
            }
            .social-links a {
              color: #667eea;
              text-decoration: none;
              margin: 0 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎯 Trackdesk</div>
              <div class="offer-icon">🎁</div>
              <h1>New Offer Available!</h1>
              <p class="subtitle">You've been assigned a new promotional offer</p>
            </div>
            
            <div class="content">
              <p style="font-size: 16px; color: #374151;">
                Hi <strong>${firstName}</strong>,
              </p>
              
              <p style="font-size: 16px; color: #374151;">
                Great news! We've created a new promotional offer specifically for you. This offer is now available in your dashboard and ready to start promoting.
              </p>
              
              <div class="offer-box">
                <div class="offer-name">${offerDetails.offerName}</div>
                <div class="commission-rate">${offerDetails.commissionRate}% Commission</div>
                ${offerDetails.referralCodes.length > 0
            ? `
                  <div style="margin: 15px 0;">
                    <p style="color: #0c4a6e; font-size: 14px; margin-bottom: 10px;">
                      Your Referral Codes:
                    </p>
                    ${offerDetails.referralCodes
                .map((code) => `
                      <div class="referral-code" style="margin: 8px 0;">${code}</div>
                    `)
                .join("")}
                    <p style="margin: 15px 0 0 0; color: #0c4a6e; font-size: 14px;">
                      Use these referral codes when promoting this offer
                    </p>
                  </div>
                `
            : `
                  <div class="referral-code">No referral codes assigned</div>
                  <p style="margin: 15px 0 0 0; color: #0c4a6e; font-size: 14px;">
                    Contact support to get referral codes for this offer
                  </p>
                `}
              </div>
              
              <div class="details-section">
                <div class="details-title">Offer Details</div>
                
                <div class="detail-row">
                  <span class="detail-label">Offer Name</span>
                  <span class="detail-value">${offerDetails.offerName}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Commission Rate</span>
                  <span class="detail-value">${offerDetails.commissionRate}%</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Start Date</span>
                  <span class="detail-value">${offerDetails.startDate}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">End Date</span>
                  <span class="detail-value">${offerDetails.endDate}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Your Referral Codes</span>
                  <span class="detail-value" style="font-family: 'Courier New', monospace; font-weight: bold;">
                    ${offerDetails.referralCodes.length > 0 ? offerDetails.referralCodes.join(", ") : "None assigned"}
                  </span>
                </div>
              </div>
              
              <div style="text-align: center;">
                <a href="${dashboardUrl}" class="button">
                  View Offer in Dashboard →
                </a>
              </div>
              
              <p style="font-size: 16px; color: #374151; margin-top: 30px;">
                <strong>Ready to start earning?</strong> Log into your dashboard to access all promotional materials, track your performance, and start promoting this offer to your audience.
              </p>
              
              <p style="font-size: 14px; color: #6b7280;">
                If you have any questions about this offer or need assistance, please don't hesitate to contact our support team.
              </p>
              
              <div class="footer">
                <p class="footer-text">
                  <strong>Happy promoting! 🚀</strong>
                </p>
                <p class="footer-text">
                  The Trackdesk Team
                </p>
                <div class="social-links">
                  <a href="#">Help Center</a> • 
                  <a href="#">Contact Support</a> • 
                  <a href="#">Dashboard</a>
                </div>
                <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
                  This email was sent to <strong>${email}</strong> regarding your affiliate account.<br>
                  © ${new Date().getFullYear()} Trackdesk. All rights reserved.
                </p>
                <p style="font-size: 11px; color: #d1d5db; margin-top: 10px;">
                  This is an automated email notification. Please do not reply to this message.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
        const text = `
      New Offer Available - Trackdesk

      Hi ${firstName},

      Great news! We've created a new promotional offer specifically for you. This offer is now available in your dashboard and ready to start promoting.

      OFFER DETAILS:
      - Offer Name: ${offerDetails.offerName}
      - Commission Rate: ${offerDetails.commissionRate}%
      - Start Date: ${offerDetails.startDate}
      - End Date: ${offerDetails.endDate}
      - Your Referral Codes: ${offerDetails.referralCodes.length > 0 ? offerDetails.referralCodes.join(", ") : "None assigned"}

      Ready to start earning? Log into your dashboard to access all promotional materials, track your performance, and start promoting this offer to your audience.

      View your dashboard: ${dashboardUrl}

      If you have any questions about this offer or need assistance, please don't hesitate to contact our support team.

      Happy promoting! 🚀

      The Trackdesk Team
    `.trim();
        await this.sendEmail({
            to: email,
            subject: `🎁 New Offer Available: ${offerDetails.offerName} - ${offerDetails.commissionRate}% Commission`,
            html,
            text,
        });
    }
    static generateToken() {
        return crypto_1.default.randomBytes(32).toString("hex");
    }
    static generateTokenExpiry() {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 24);
        return expiry;
    }
}
exports.EmailService = EmailService;
const emailService = new EmailService();
exports.default = emailService;
//# sourceMappingURL=EmailService.js.map