import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export interface UserProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  timezone: string;
  language: string;
  dateFormat: string;
  currency: string;
  notifications: NotificationSettings;
  security: SecuritySettings;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationSettings {
  email: {
    commissionEarned: boolean;
    payoutProcessed: boolean;
    accountUpdates: boolean;
    marketingEmails: boolean;
    systemAlerts: boolean;
  };
  push: {
    commissionEarned: boolean;
    payoutProcessed: boolean;
    accountUpdates: boolean;
    systemAlerts: boolean;
  };
  sms: {
    payoutProcessed: boolean;
    securityAlerts: boolean;
  };
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  backupCodes?: string[];
  loginAlerts: boolean;
  sessionTimeout: number;
  allowedIPs: string[];
  passwordLastChanged: Date;
  lastPasswordChange: Date;
}

export interface UserPreferences {
  dashboard: {
    defaultView: "OVERVIEW" | "DETAILED" | "CUSTOM";
    widgets: string[];
    refreshInterval: number;
  };
  reports: {
    defaultFormat: "PDF" | "CSV" | "EXCEL";
    includeCharts: boolean;
    autoSchedule: boolean;
  };
  affiliate: {
    showPersonalInfo: boolean;
    allowDirectContact: boolean;
    publicProfile: boolean;
  };
}

export class ProfileModel {
  static async createProfile(userId: string, data: any): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return (await prisma.userProfile.create({
      data: {
        userId,
        firstName: data.firstName || user.firstName,
        lastName: data.lastName || user.lastName,
        avatar: data.avatar,
        bio: data.bio || "",
        settings: (data.settings || {
          email: data.email || user.email,
          phone: data.phone,
          timezone: data.timezone || "UTC",
          language: data.language || "en",
          dateFormat: data.dateFormat || "MM/DD/YYYY",
          currency: data.currency || "USD",
          notifications: data.notifications || {
            email: {
              commissionEarned: true,
              payoutProcessed: true,
              accountUpdates: true,
              marketingEmails: false,
              systemAlerts: true,
            },
            push: {
              commissionEarned: true,
              payoutProcessed: true,
              accountUpdates: true,
              systemAlerts: true,
            },
            sms: {
              payoutProcessed: false,
              securityAlerts: true,
            },
          },
          security: data.security || {
            twoFactorEnabled: false,
            loginAlerts: true,
            sessionTimeout: 30,
            allowedIPs: [],
            passwordLastChanged: new Date(),
            lastPasswordChange: new Date(),
          },
        }) as any,
        preferences: (data.preferences || {
          dashboard: {
            defaultView: "OVERVIEW",
            widgets: ["earnings", "clicks", "conversions", "offers"],
            refreshInterval: 30,
          },
          reports: {
            defaultFormat: "PDF",
            includeCharts: true,
            autoSchedule: false,
          },
          affiliate: {
            showPersonalInfo: true,
            allowDirectContact: true,
            publicProfile: false,
          },
        }) as any,
      },
    })) as unknown as any;
  }

  static async getProfile(userId: string): Promise<any | null> {
    return (await prisma.userProfile.findUnique({
      where: { userId },
    })) as unknown as any | null;
  }

  static async updateProfile(userId: string, data: any): Promise<any> {
    return (await prisma.userProfile.update({
      where: { userId },
      data: {
        ...data,
        settings: data.settings as any,
        preferences: data.preferences as any,
        updatedAt: new Date(),
      },
    })) as unknown as any;
  }

  static async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    // Update profile security settings
    const profile = await this.getProfile(userId);
    if (profile) {
      const currentSettings = (profile.settings as any) || {};
      const updatedSettings = {
        ...currentSettings,
        security: {
          ...currentSettings.security,
          passwordLastChanged: new Date(),
          lastPasswordChange: new Date(),
        },
      };
      await this.updateProfile(userId, { settings: updatedSettings });
    }

    return true;
  }

  static async updateNotificationSettings(
    userId: string,
    settings: any
  ): Promise<any> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    const currentSettings = (profile.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      notifications: {
        ...currentSettings.notifications,
        ...settings,
      },
    };

    return await this.updateProfile(userId, {
      settings: updatedSettings,
    });
  }

  static async updateSecuritySettings(
    userId: string,
    settings: any
  ): Promise<any> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    const currentSettings = (profile.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      security: {
        ...currentSettings.security,
        ...settings,
      },
    };

    return await this.updateProfile(userId, {
      settings: updatedSettings,
    });
  }

  static async updatePreferences(
    userId: string,
    preferences: any
  ): Promise<any> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    const currentPreferences = (profile.preferences as any) || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences,
    };

    return await this.updateProfile(userId, {
      preferences: updatedPreferences,
    });
  }

  static async uploadAvatar(userId: string, avatarUrl: string): Promise<any> {
    return await this.updateProfile(userId, { avatar: avatarUrl });
  }

  static async enableTwoFactor(
    userId: string,
    secret: string,
    backupCodes: string[]
  ): Promise<any> {
    return await this.updateSecuritySettings(userId, {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      backupCodes,
    });
  }

  static async disableTwoFactor(userId: string): Promise<any> {
    return await this.updateSecuritySettings(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: undefined,
      backupCodes: undefined,
    });
  }

  static async addAllowedIP(userId: string, ipAddress: string): Promise<any> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    const currentSettings = (profile.settings as any) || {};
    const currentSecurity = currentSettings.security || {};
    const allowedIPs = [...(currentSecurity.allowedIPs || []), ipAddress];
    return await this.updateSecuritySettings(userId, { allowedIPs });
  }

  static async removeAllowedIP(
    userId: string,
    ipAddress: string
  ): Promise<any> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    const currentSettings = (profile.settings as any) || {};
    const currentSecurity = currentSettings.security || {};
    const allowedIPs = (currentSecurity.allowedIPs || []).filter(
      (ip: string) => ip !== ipAddress
    );
    return await this.updateSecuritySettings(userId, { allowedIPs });
  }

  static async getPublicProfile(userId: string): Promise<any> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      return null;
    }

    const affiliate = await prisma.affiliateProfile.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    });

    const settings = (profile.settings as any) || {};
    const preferences = (profile.preferences as any) || {};

    return {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatar: profile.avatar,
      timezone: settings.timezone,
      language: settings.language,
      currency: settings.currency,
      affiliate: affiliate
        ? {
            companyName: affiliate.companyName,
            website: affiliate.website,
            totalEarnings: affiliate.totalEarnings,
            totalClicks: affiliate.totalClicks,
            totalConversions: affiliate.totalConversions,
            tier: affiliate.tier,
          }
        : null,
      preferences: preferences.affiliate,
    };
  }

  static async searchProfiles(
    query: string,
    filters: any = {},
    page: number = 1,
    limit: number = 20
  ): Promise<any[]> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (query) {
      where.OR = [
        { firstName: { contains: query } },
        { lastName: { contains: query } },
      ];
    }

    return (await prisma.userProfile.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
    })) as unknown as any[];
  }

  static async getProfileStats(userId: string): Promise<any> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      return null;
    }

    const affiliate = await prisma.affiliateProfile.findUnique({
      where: { userId },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const settings = (profile.settings as any) || {};
    const preferences = (profile.preferences as any) || {};
    const security = settings.security || {};
    const notifications = settings.notifications || {};

    return {
      profile,
      affiliate,
      user: {
        id: user?.id,
        email: user?.email,
        role: user?.role,
        status: user?.status,
        createdAt: user?.createdAt,
        lastLoginAt: user?.lastLoginAt,
      },
      security: {
        twoFactorEnabled: security.twoFactorEnabled || false,
        loginAlerts: security.loginAlerts || false,
        allowedIPsCount: (security.allowedIPs || []).length,
        passwordAge: security.lastPasswordChange
          ? Math.floor(
              (Date.now() - new Date(security.lastPasswordChange).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0,
      },
      notifications,
      preferences,
    };
  }

  static async deleteProfile(userId: string): Promise<void> {
    await prisma.userProfile.delete({
      where: { userId },
    });
  }

  static async exportProfileData(userId: string): Promise<any> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      return null;
    }

    const affiliate = await prisma.affiliateProfile.findUnique({
      where: { userId },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    return {
      profile,
      affiliate,
      user: {
        id: user?.id,
        email: user?.email,
        role: user?.role,
        status: user?.status,
        createdAt: user?.createdAt,
        lastLoginAt: user?.lastLoginAt,
      },
      exportedAt: new Date().toISOString(),
    };
  }
}
