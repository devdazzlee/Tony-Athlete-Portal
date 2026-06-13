import nodemailer from "nodemailer";
import crypto from "crypto";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();

// Hardcoded SMTP configuration (production integration — not read from env)
const SMTP_CONFIG = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  user: "cs@tc-nutrition.com",
  pass: "xznlxwzlrqovrvcb", // normalized app password (spaces removed)
  from: '"TC Nutrition Athlete Portal" <cs@tc-nutrition.com>',
} as const;

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: nodemailer.SendMailOptions["attachments"];
}

interface EmailHealthResult {
  enabled: boolean;
  verified: boolean;
  config: {
    host: string;
    port: number;
    secure: boolean;
    userConfigured: boolean;
    passConfigured: boolean;
    fromConfigured: boolean;
  };
  error?: string;
}

interface AffiliateDiscountCodeInfo {
  code: string;
  discountText?: string;
  allowanceAmount?: number;
  freeShipping?: boolean;
  expiresAt?: Date | string | null;
  description?: string | null;
}

class EmailService {
  private transporter: nodemailer.Transporter | null;
  private emailEnabled: boolean;
  private strictMode: boolean;

  constructor() {
    this.strictMode = process.env.EMAIL_STRICT === "true";
    const smtpUser = SMTP_CONFIG.user;
    const smtpPass = SMTP_CONFIG.pass;
    this.emailEnabled = Boolean(smtpUser && smtpPass);

    if (!this.emailEnabled) {
      this.transporter = null;
      console.warn(
        "[EmailService] SMTP credentials are missing. Email sending is disabled.",
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    console.log(
      `[EmailService] SMTP configured (${SMTP_CONFIG.host}:${SMTP_CONFIG.port}, user: ${smtpUser})`,
    );
  }

  isEmailEnabled(): boolean {
    return this.emailEnabled;
  }

  private getTcLogoEmailBranding(): {
    logoHtml: string;
    attachments: nodemailer.SendMailOptions["attachments"];
  } {
    const candidatePaths = [
      path.join(__dirname, "../../public/images/TC_Logo.png"),
      path.join(process.cwd(), "public/images/TC_Logo.png"),
      path.join(process.cwd(), "backend/public/images/TC_Logo.png"),
    ];
    const logoPath = candidatePaths.find((candidate) =>
      fs.existsSync(candidate),
    );

    if (!logoPath) {
      console.warn(
        "[EmailService] TC logo not found — sending email without image attachment.",
        { checked: candidatePaths },
      );
      return {
        logoHtml: `<div class="logo" style="text-align:center;margin-bottom:24px;font-size:24px;font-weight:bold;color:#dc2626;">TC Nutrition</div>`,
        attachments: undefined,
      };
    }

    return {
      logoHtml: `<div class="logo"><img src="cid:tc-logo" alt="TC Nutrition" style="max-width: 220px; height: auto; display: block; margin: 0 auto;" /></div>`,
      attachments: [
        {
          filename: "TC_Logo.png",
          path: logoPath,
          cid: "tc-logo",
        },
      ],
    };
  }

  async verifyConnection(): Promise<EmailHealthResult> {
    const config = {
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure,
      userConfigured: Boolean(SMTP_CONFIG.user),
      passConfigured: Boolean(SMTP_CONFIG.pass),
      fromConfigured: Boolean(SMTP_CONFIG.from),
    };

    if (!this.emailEnabled || !this.transporter) {
      return {
        enabled: false,
        verified: false,
        config,
        error: "SMTP credentials are missing.",
      };
    }

    try {
      await this.transporter.verify();
      return {
        enabled: true,
        verified: true,
        config,
      };
    } catch (error: any) {
      return {
        enabled: true,
        verified: false,
        config,
        error: error?.message || "SMTP verification failed",
      };
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.emailEnabled || !this.transporter) {
      // Avoid runtime failures when SMTP is not configured in local/dev environments.
      return false;
    }

    try {
      const mailOptions = {
        from: SMTP_CONFIG.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
        ...(options.attachments?.length ? { attachments: options.attachments } : {}),
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      if (this.strictMode) {
        throw new Error("Failed to send email");
      }
      return false;
    }
  }

  async sendVerificationEmail(
    email: string,
    firstName: string,
    verificationToken: string,
  ): Promise<void> {
    const verificationUrl = `${"https://www.tcathlete.com"}/auth/verify-email?token=${verificationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email - TC Nutrition Athlete Portal</title>
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
              <div class="logo">🎯 TC Nutrition</div>
            </div>
            
            <div class="content">
              <h2>Welcome to TC Nutrition Athlete Portal, ${firstName}!</h2>
              
              <p>Thank you for signing up. To complete your registration and start using TC Nutrition Athlete Portal, please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #3b82f6;">${verificationUrl}</p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> This verification link will expire in 24 hours. If you didn't create an account with TC Nutrition Athlete Portal, please ignore this email.
              </div>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} TC Nutrition. All rights reserved.</p>
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Welcome to TC Nutrition Athlete Portal, ${firstName}!

Thank you for signing up. To complete your registration and start using TC Nutrition Athlete Portal, please verify your email address by clicking the link below:

${verificationUrl}

This verification link will expire in 24 hours. If you didn't create an account with TC Nutrition Athlete Portal, please ignore this email.

© ${new Date().getFullYear()} TC Nutrition. All rights reserved.
    `.trim();

    await this.sendEmail({
      to: email,
      subject: "Verify Your Email - TC Nutrition Athlete Portal",
      html,
      text,
    });
  }

  private async getAdminNotificationEmails(): Promise<string[]> {
    const fromEnv = (process.env.ADMIN_NOTIFICATION_EMAILS || "dylan@tc-nutrition.com")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    return fromEnv.length > 0 ? fromEnv : ["dylan@tc-nutrition.com"];
  }

  async sendAffiliateApplicationReceivedEmail(
    email: string,
    firstName: string,
  ): Promise<boolean> {
    const { logoHtml, attachments } = this.getTcLogoEmailBranding();

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Application Received - TC Nutrition</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: #fff; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .logo { text-align: center; margin-bottom: 24px; }
            .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
            .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            ${logoHtml}
            <p>Hi <strong>${firstName}</strong>,</p>
            <p>Thank you for applying to the TC Nutrition affiliate program!</p>
            <p><span class="badge">Pending Review</span></p>
            <p>We've received your application and our team is reviewing it. You'll receive another email once your account has been approved so you can log in and complete your setup.</p>
            <p>No action is needed right now — we'll be in touch soon.</p>
            <div class="footer">
              <p>© ${new Date().getFullYear()} TC Nutrition. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `Hi ${firstName},\n\nThank you for applying to the TC Nutrition affiliate program!\n\nYour application is pending review. You'll receive another email once your account has been approved.\n\n© ${new Date().getFullYear()} TC Nutrition`;

    return this.sendEmail({
      to: email,
      subject: "Application Received - TC Nutrition",
      html,
      text,
      attachments,
    });
  }

  async sendNewAffiliateApplicationAdminEmail(applicant: {
    firstName: string;
    lastName: string;
    email: string;
  }): Promise<boolean> {
    const adminEmails = await this.getAdminNotificationEmails();
    if (adminEmails.length === 0) {
      console.warn("[EmailService] No admin notification emails configured");
      return false;
    }

    const approvalUrl = `${"https://www.tcathlete.com"}/manager/affiliates/approval`;
    const fullName = `${applicant.firstName} ${applicant.lastName}`.trim();

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: #fff; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: #fff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
            .detail { background: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>New Affiliate Application</h2>
            <p>A new affiliate has signed up and needs your approval:</p>
            <div class="detail">
              <p><strong>Name:</strong> ${fullName}</p>
              <p><strong>Email:</strong> ${applicant.email}</p>
            </div>
            <a href="${approvalUrl}" class="button">Review Pending Applications</a>
            <p style="font-size: 13px; color: #6b7280;">Or copy this link: ${approvalUrl}</p>
          </div>
        </body>
      </html>
    `;

    const text = `New affiliate application\n\nName: ${fullName}\nEmail: ${applicant.email}\n\nReview: ${approvalUrl}`;

    let sent = false;
    for (const adminEmail of adminEmails) {
      const result = await this.sendEmail({
        to: adminEmail,
        subject: `New affiliate application: ${fullName}`,
        html,
        text,
      });
      if (result) sent = true;
    }
    return sent;
  }

  async sendAffiliateApprovedEmail(
    email: string,
    firstName: string,
  ): Promise<boolean> {
    const loginUrl = `${"https://www.tcathlete.com"}/auth/login`;
    const { logoHtml, attachments } = this.getTcLogoEmailBranding();

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You're Approved! - TC Nutrition</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: #fff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .logo { text-align: center; margin-bottom: 20px; }
            h1 { color: #10b981; text-align: center; }
            .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #fff !important; text-decoration: none; border-radius: 6px; font-weight: 600; }
            .features { background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 30px; text-align: center; font-size: 14px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            ${logoHtml}
            <h1>You're Approved, ${firstName}! 🎉</h1>
            <p style="text-align: center;">Great news — your affiliate application has been approved. You can now log in and start using the Athlete Portal.</p>
            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">Log In & Get Started</a>
            </div>
            <div class="features">
              <h3 style="margin-top: 0;">What's next:</h3>
              <ol>
                <li>Log in with the email and password you registered with</li>
                <li>Complete your profile</li>
                <li>Start promoting and earning!</li>
              </ol>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} TC Nutrition. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `You're Approved, ${firstName}!\n\nYour affiliate application has been approved. Log in here: ${loginUrl}\n\n© ${new Date().getFullYear()} TC Nutrition. All rights reserved.`;

    return this.sendEmail({
      to: email,
      subject: "You're Approved! Complete Your TC Nutrition Setup 🚀",
      html,
      text,
      attachments,
    });
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to TC Nutrition Athlete Portal!</title>
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
              <div class="logo">TC Nutrition</div>
              <h1>Welcome to TC Nutrition Athlete Portal, ${firstName}! 🎉</h1>
            </div>
            
            <p>We're excited to have you on board! Your affiliate account has been successfully created and verified.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/login" class="button">
                Get Started
              </a>
            </div>
            
            <div class="features">
              <h3 style="margin-top: 0;">What you can do with TC Nutrition Athlete Portal:</h3>
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
              <p>The TC Nutrition Team</p>
              <p style="font-size: 12px; color: #9ca3af; margin-top: 10px;">
                This email was sent to ${email}. If you didn't create this account, please ignore this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Welcome to TC Nutrition Athlete Portal, ${firstName}!
      
      We're excited to have you on board! Your affiliate account has been successfully created and verified.
      
      What you can do with TC Nutrition Athlete Portal:
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
      
      Get Started: ${"https://www.tcathlete.com"}/auth/login
      
      Happy tracking!
      The TC Nutrition Team
    `.trim();

    await this.sendEmail({
      to: email,
      subject: "Welcome to TC Nutrition Athlete Portal - Let's Get Started! 🚀",
      html,
      text,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string,
  ): Promise<void> {
    const resetUrl = `${"https://www.tcathlete.com"}/auth/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password - TC Nutrition Athlete Portal</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
            .container { max-width: 640px; margin: 0 auto; padding: 32px 24px; }
            .panel { background: #ffffff; border-radius: 12px; padding: 32px 28px; box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
            h2 { margin: 0 0 12px; color: #111827; }
            p { color: #374151; margin: 0 0 14px; }
            .button { display: inline-block; padding: 14px 26px; background-color: #ef4444; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700; letter-spacing: 0.2px; border: 2px solid #ef4444; }
            .button:hover { background: #dc2626; border-color: #dc2626; }
            .link { color: #1f2937; word-break: break-all; }
            .footer { margin-top: 18px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="panel">
              <h2>Password Reset Request</h2>
              <p>Hi ${firstName},</p>
              <p>We received a request to reset your password. Click the red button below to reset it:</p>
              <p style="text-align:center; margin: 18px 0;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <p>Or copy this link:</p>
              <p class="link">${resetUrl}</p>
              <p class="footer">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: "Reset Your Password - TC Nutrition Athlete Portal",
      html,
    });
  }

  async sendCommissionPaidEmail(
    email: string,
    firstName: string,
    commissionDetails: {
      commissionId: string;
      amount: number;
      commissionRate: number;
      orderValue: number;
      referralCode: string;
      paidDate: string;
      paymentMethod: string;
    },
  ): Promise<void> {
    const dashboardUrl = `${"https://www.tcathlete.com"}/dashboard/commissions`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Commission Payment Received - TC Nutrition Athlete Portal</title>
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
              <div class="logo">🎯 TC Nutrition</div>
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
                The TC Nutrition Team
              </p>
              <div class="social-links">
                <a href="#">Help Center</a> • 
                <a href="#">Contact Support</a> • 
                <a href="#">Dashboard</a>
              </div>
              <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
                This email was sent to <strong>${email}</strong> regarding your affiliate account.<br>
                © ${new Date().getFullYear()} TC Nutrition. All rights reserved.
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
Commission Payment Processed - TC Nutrition Athlete Portal

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

The TC Nutrition Team
    `.trim();

    await this.sendEmail({
      to: email,
      subject: `💰 Commission Payment Processed - $${commissionDetails.amount.toFixed(2)}`,
      html,
      text,
    });
  }

  // Send offer creation email to affiliate
  async sendOfferCreatedEmail(
    email: string,
    firstName: string,
    offerDetails: {
      offerName: string;
      offerDescription: string;
      commissionRate: number;
      startDate: string;
      endDate: string;
      referralCodes: string[];
    },
  ): Promise<void> {
    // CTA should land on main dashboard
    const dashboardUrl = `${"https://www.tcathlete.com"}/dashboard`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Offer Available - TC Nutrition Athlete Portal</title>
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
              <div class="logo">🎯 TC Nutrition</div>
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
                ${
                  offerDetails.referralCodes.length > 0
                    ? `
                  <div style="margin: 15px 0;">
                    <p style="color: #0c4a6e; font-size: 14px; margin-bottom: 10px;">
                      Your Referral Codes:
                    </p>
                    ${offerDetails.referralCodes
                      .map(
                        (code) => `
                      <div class="referral-code" style="margin: 8px 0;">${code}</div>
                    `,
                      )
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
                `
                }
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
                  The TC Nutrition Team
                </p>
                <div class="social-links">
                  <a href="#">Help Center</a> • 
                  <a href="#">Contact Support</a> • 
                  <a href="#">Dashboard</a>
                </div>
                <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
                  This email was sent to <strong>${email}</strong> regarding your affiliate account.<br>
                  © ${new Date().getFullYear()} TC Nutrition. All rights reserved.
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
      New Offer Available - TC Nutrition Athlete Portal

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

      The TC Nutrition Team
    `.trim();

    await this.sendEmail({
      to: email,
      subject: `🎁 New Offer Available: ${offerDetails.offerName} - ${offerDetails.commissionRate}% Commission`,
      html,
      text,
    });
  }

  // Notify affiliate when new discount/allowance codes are added to their account
  async sendAffiliateDiscountAssignedEmail(
    email: string,
    firstName: string,
    codes: AffiliateDiscountCodeInfo[],
  ): Promise<void> {
    // Avoid nodemailer EENVELOPE errors when email is blank/undefined
    if (!email || !email.trim()) {
      console.warn(
        "sendAffiliateDiscountAssignedEmail skipped: missing recipient email",
      );
      return;
    }
    if (!codes || codes.length === 0) return;

    const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`;

    const formatDate = (date?: Date | string | null) => {
      if (!date) return "No expiry";
      const parsed = typeof date === "string" ? new Date(date) : date;
      return isNaN(parsed.getTime())
        ? "No expiry"
        : parsed.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
    };

    const codeRowsHtml = codes
      .map((code) => {
        const allowanceText =
          typeof code.allowanceAmount === "number"
            ? `$${code.allowanceAmount.toFixed(0)} monthly allowance`
            : "";

        const perks = [
          code.discountText || "Custom discount",
          code.freeShipping ? "Free shipping" : "",
          allowanceText,
        ]
          .filter(Boolean)
          .join(" • ");

        return `
          <div class="code-row">
            <div class="code-left">
              <div class="code">${code.code}</div>
              <div class="perks">${perks || "Discount code"}</div>
              ${code.description ? `<div class="note">${code.description}</div>` : ""}
            </div>
            <div class="code-right">
              <div class="label">Expires</div>
              <div class="value">${formatDate(code.expiresAt)}</div>
            </div>
          </div>
        `;
      })
      .join("");

    const textList = codes
      .map((code) => {
        const parts = [
          code.discountText || "Discount code",
          code.freeShipping ? "Free shipping" : "",
          typeof code.allowanceAmount === "number"
            ? `$${code.allowanceAmount.toFixed(0)} allowance`
            : "",
        ].filter(Boolean);

        return `- ${code.code}: ${parts.join(" | ") || "Discount code"} (Expires: ${formatDate(
          code.expiresAt,
        )})`;
      })
      .join("\n");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>New Discount Codes Added</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 0; color: #0f172a; }
            .container { max-width: 640px; margin: 0 auto; padding: 28px 22px; }
            .card { background: #ffffff; border-radius: 12px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); padding: 28px; }
            h1 { margin: 0 0 10px 0; font-size: 24px; color: #0f172a; }
            p { color: #334155; line-height: 1.6; margin: 0 0 14px 0; }
            .code-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid #e2e8f0; }
            .code-row:last-child { border-bottom: none; }
            .code-left { max-width: 70%; }
            .code { font-family: 'Courier New', monospace; font-weight: 700; background: #0f172a; color: #fff; display: inline-block; padding: 8px 12px; border-radius: 8px; letter-spacing: 0.5px; }
            .perks { margin-top: 8px; color: #0ea5e9; font-weight: 600; }
            .note { margin-top: 6px; color: #64748b; font-size: 13px; }
            .code-right { text-align: right; }
            .label { color: #94a3b8; font-size: 12px; letter-spacing: 0.4px; text-transform: uppercase; }
            .value { font-weight: 700; color: #0f172a; margin-top: 4px; }
            .cta { text-align: center; margin-top: 24px; }
            .button { display: inline-block; padding: 14px 22px; background: #E43133; color: #fff !important; text-decoration: none; border-radius: 10px; font-weight: 700; box-shadow: 0 8px 18px rgba(228, 49, 51, 0.25); }
            .footer { margin-top: 22px; color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <h1>New discount codes added 🎉</h1>
              <p>Hi <strong>${firstName}</strong>,</p>
              <p>We just added new discount code${codes.length > 1 ? "s" : ""} to your affiliate account. You can start using them right away.</p>
              ${codeRowsHtml}
              <div class="cta">
                <a href="${dashboardUrl}" class="button">View my codes</a>
              </div>
            </div>
            <div class="footer">
              <div>TC Nutrition Athlete Portal</div>
              <div>This is an automated message. No reply needed.</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `Hi ${firstName},\n\nNew discount code${codes.length > 1 ? "s" : ""} have been added to your account:\n${textList}\n\nView your codes: ${dashboardUrl}\n\nTC Nutrition`;

    await this.sendEmail({
      to: email,
      subject:
        codes.length > 1
          ? `New discount codes added to your account`
          : `Your new discount code: ${codes[0].code}`,
      html,
      text,
    });
  }

  async sendDeliverableReviewEmail(
    email: string,
    firstName: string,
    status: "APPROVED" | "REJECTED",
    adminComment?: string | null,
  ): Promise<boolean> {
    const dashboardUrl = `${"https://www.tcathlete.com"}/dashboard/deliverables`;
    const isApproved = status === "APPROVED";
    const subject = isApproved
      ? "Deliverable approved - TC Nutrition Athlete Portal"
      : "Deliverable needs updates - TC Nutrition Athlete Portal";
    const accent = isApproved ? "#16a34a" : "#dc2626";
    const statusLabel = isApproved ? "Approved" : "Needs Updates";
    const intro = isApproved
      ? "Great news! Your deliverable submission has been approved."
      : "Your deliverable submission was reviewed and needs a few updates.";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${subject}</title>
          <style>
            body { margin: 0; padding: 0; background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }
            .container { max-width: 680px; margin: 0 auto; padding: 28px 18px; }
            .card { background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 24px rgba(15,23,42,0.06); }
            .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px; text-align: center; color: #fff; }
            .brand { font-size: 26px; font-weight: 800; letter-spacing: 0.2px; }
            .brand-sub { margin-top: 6px; font-size: 13px; color: #cbd5e1; }
            .content { padding: 26px 24px; }
            .badge { display: inline-block; padding: 7px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; color: #fff; background: ${accent}; }
            h2 { margin: 14px 0 8px; font-size: 24px; line-height: 1.25; }
            p { margin: 0 0 14px; color: #334155; line-height: 1.7; font-size: 15px; }
            .comment { margin: 14px 0 18px; border: 1px solid #e2e8f0; border-left: 4px solid ${accent}; border-radius: 10px; background: #f8fafc; padding: 14px; }
            .comment-title { margin: 0 0 6px; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase; color: #64748b; font-weight: 700; }
            .button { display: inline-block; padding: 13px 22px; border-radius: 10px; background: #E43133; color: #fff !important; text-decoration: none; font-weight: 700; box-shadow: 0 8px 18px rgba(228,49,51,0.25); }
            .footer { padding: 18px 24px 24px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.7; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <div class="brand">🎯 TC Nutrition</div>
                <div class="brand-sub">Athlete Portal</div>
              </div>
              <div class="content">
                <span class="badge">${statusLabel}</span>
                <h2>Hello ${firstName || "Athlete"},</h2>
                <p>${intro}</p>
                ${
                  adminComment
                    ? `<div class="comment"><p class="comment-title">Admin Comment</p><p>${adminComment}</p></div>`
                    : ""
                }
                <p>You can review your deliverables and submission history in your dashboard.</p>
                <a href="${dashboardUrl}" class="button">View Deliverables</a>
              </div>
              <div class="footer">
                <div>TC Nutrition Athlete Portal</div>
                <div>© ${new Date().getFullYear()} TC Nutrition. All rights reserved.</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `Hi ${firstName || "Athlete"},\n\n${intro}\n${
      adminComment ? `\nAdmin comment: ${adminComment}\n` : "\n"
    }\nView deliverables: ${dashboardUrl}\n\nTC Nutrition Athlete Portal`;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  // Generate a secure random token
  static generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  // Generate token expiry (24 hours from now)
  static generateTokenExpiry(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);
    return expiry;
  }
}

const emailService = new EmailService();
export { EmailService };
export default emailService;
