import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import emailService, { EmailService } from "./EmailService";
import crypto from "crypto";
import { SystemSettingsService } from "./SystemSettingsService";

const prisma = new PrismaClient();

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: "ADMIN" | "AFFILIATE" | "MANAGER";
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  timezone?: string;
  language?: string;
}

export class AuthService {
  private getAccessTokenExpiresIn(): string {
    return (
      process.env.ACCESS_TOKEN_EXPIRES_IN ||
      process.env.JWT_EXPIRES_IN ||
      "15m"
    );
  }

  private getRefreshTokenExpiresInMs(): number {
    return this.parseDurationMs(process.env.REFRESH_TOKEN_EXPIRES_IN || "30d");
  }

  private parseDurationMs(input: string): number {
    const trimmed = String(input || "").trim();
    const match = trimmed.match(/^(\d+)\s*(ms|s|m|h|d)$/i);
    if (!match) {
      return 30 * 24 * 60 * 60 * 1000;
    }
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    switch (unit) {
      case "ms":
        return value;
      case "s":
        return value * 1000;
      case "m":
        return value * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      case "d":
        return value * 24 * 60 * 60 * 1000;
      default:
        return 30 * 24 * 60 * 60 * 1000;
    }
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(48).toString("hex");
  }

  async register(data: RegisterData) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      data.password,
      parseInt(process.env.BCRYPT_ROUNDS || "12")
    );

    // Generate verification token
    const verificationToken = EmailService.generateToken();

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || "AFFILIATE",
      },
    });

    // Create profile based on role
    if (data.role === "AFFILIATE" || !data.role) {
      const defaultCommissionRate =
        await SystemSettingsService.getDefaultCommissionRate();
      await prisma.affiliateProfile.create({
        data: {
          userId: user.id,
          paymentMethod: "BANK_TRANSFER",
          commissionRate: defaultCommissionRate,
        },
      });
    } else if (data.role === "ADMIN") {
      await prisma.adminProfile.create({
        data: {
          userId: user.id,
          permissions: ["all"],
        },
      });
    }

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        action: "user_registered",
        resource: "User Account",
        details: `User registered with role: ${user.role}`,
        ipAddress: "127.0.0.1", // This should be passed from the controller
        userAgent: "Trackdesk API",
      },
    });

    // Send verification email
    try {
      await emailService.sendVerificationEmail(
        user.email,
        user.firstName,
        verificationToken
      );
      console.log(`Verification email sent to ${user.email}`);
    } catch (error) {
      console.error("Failed to send verification email:", error);
      // Don't fail registration if email fails, but log it
    }

    return {
      message:
        "Registration successful! Please check your email to verify your account.",
    };
  }

  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
    if (!refreshToken) {
      throw new Error("Refresh token required");
    }

    const session = await prisma.session.findFirst({
      where: {
        refreshToken,
        isActive: true,
        refreshExpiresAt: { gt: new Date() },
      } as any,
    } as any);

    if (!session) {
      const error = new Error("Invalid or expired refresh token");
      (error as any).code = "TOKEN_EXPIRED";
      throw error;
    }

    const user = await prisma.user.findUnique({
      where: { id: (session as any).userId },
      include: {
        affiliateProfile: true,
        adminProfile: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const accessTokenExpiresIn = this.getAccessTokenExpiresIn();
    const now = new Date();

    const newAccessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: accessTokenExpiresIn } as any
    );

    const newRefreshToken = this.generateRefreshToken();
    const accessExpiresAt = new Date(now.getTime() + this.parseDurationMs(accessTokenExpiresIn));
    const refreshExpiresAt = new Date(now.getTime() + this.getRefreshTokenExpiresInMs());

    await prisma.session.update({
      where: { id: (session as any).id },
      data: {
        token: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: accessExpiresAt,
        refreshExpiresAt,
        ipAddress: ipAddress || (session as any).ipAddress || null,
        userAgent: userAgent || (session as any).userAgent || null,
        lastActivity: now,
        isActive: true,
      } as any,
    } as any);

    return {
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar || null,
        affiliateProfile: user.affiliateProfile,
        adminProfile: user.adminProfile,
      },
    };
  }

  async login(data: LoginData, ipAddress?: string, userAgent?: string) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        affiliateProfile: true,
        adminProfile: true,
      },
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Check password
    const validPassword = await bcrypt.compare(data.password, user.password);
    if (!validPassword) {
      throw new Error("Invalid credentials");
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessTokenExpiresIn = this.getAccessTokenExpiresIn();

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: accessTokenExpiresIn } as any
    );

    const refreshToken = this.generateRefreshToken();
    const now = new Date();
    const accessExpiresAt = new Date(
      now.getTime() + this.parseDurationMs(accessTokenExpiresIn)
    );
    const refreshExpiresAt = new Date(
      now.getTime() + this.getRefreshTokenExpiresInMs()
    );

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        refreshToken,
        expiresAt: accessExpiresAt,
        refreshExpiresAt,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        isActive: true,
        lastActivity: now,
      } as any,
    } as any);

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        action: "user_login",
        resource: "User Account",
        details: "Successful login",
        ipAddress: ipAddress || "127.0.0.1",
        userAgent: userAgent || "TC Nutrition Athlete Portal API",
      },
    });

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar || null,
        affiliateProfile: user.affiliateProfile,
        adminProfile: user.adminProfile,
      },
    };
  }

  async verifyEmail(token: string) {
    // This is a placeholder for email verification
    // In a production system, you would store and verify tokens

    return {
      message:
        "Email verification is not fully implemented. You can log in without verification.",
    };
  }

  async resendVerificationEmail(email: string) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Email verification is not fully implemented
    return {
      message:
        "Email verification is not fully implemented. You can log in without verification.",
    };
  }

  async logout(userId: string) {
    await prisma.session.updateMany({
      where: { userId } as any,
      data: { isActive: false } as any,
    } as any);

    // Log activity
    await prisma.activity.create({
      data: {
        userId,
        action: "user_logout",
        resource: "User Account",
        details: "User logged out",
      },
    });
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        affiliateProfile: true,
        adminProfile: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    console.log("🔍 AuthService.getProfile - Raw user from DB:", {
      id: user.id,
      email: user.email,
      avatar: user.avatar,
    });

    const response = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      avatar: user.avatar || null, // Ensure avatar field is always present
      phone: user.phone,
      timezone: user.timezone,
      language: user.language,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      affiliateProfile: user.affiliateProfile,
      adminProfile: user.adminProfile,
    };

    console.log("📤 AuthService.getProfile - Response being sent:", {
      id: response.id,
      email: response.email,
      avatar: response.avatar,
    });

    return response;
  }

  async updateProfile(userId: string, data: UpdateProfileData) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        timezone: data.timezone,
        language: data.language,
      },
      include: {
        affiliateProfile: true,
        adminProfile: true,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId,
        action: "profile_updated",
        resource: "User Profile",
        details: "Profile information updated",
      },
    });

    return user;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(
      newPassword,
      parseInt(process.env.BCRYPT_ROUNDS || "12")
    );

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId,
        action: "password_changed",
        resource: "User Account",
        details: "Password changed successfully",
      },
    });
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists or not
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Store reset token in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpires: expiresAt,
      },
    });

    // Send reset email
    await emailService.sendPasswordResetEmail(
      email,
      user.firstName,
      resetToken
    );
  }

  async resetPassword(token: string, newPassword: string) {
    // Find user with matching reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date(), // Token must not be expired
        },
      },
    });

    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(
      newPassword,
      parseInt(process.env.BCRYPT_ROUNDS || "12")
    );

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });
  }

  async enable2FA(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId,
        action: "2fa_enabled",
        resource: "Security",
        details: "Two-factor authentication enabled",
      },
    });
  }

  async disable2FA(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId,
        action: "2fa_disabled",
        resource: "Security",
        details: "Two-factor authentication disabled",
      },
    });
  }

  async generateBackupCodes(userId: string) {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString("hex").toUpperCase());
    }

    // Store backup codes (you might want to create a separate table for this)
    // For now, we'll return them

    // Log activity
    await prisma.activity.create({
      data: {
        userId,
        action: "backup_codes_generated",
        resource: "Security",
        details: "New backup codes generated",
      },
    });

    return codes;
  }
}
