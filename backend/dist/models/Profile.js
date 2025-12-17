"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileModel = void 0;
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
class ProfileModel {
    static async createProfile(userId, data) {
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
                }),
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
                }),
            },
        }));
    }
    static async getProfile(userId) {
        return (await prisma.userProfile.findUnique({
            where: { userId },
        }));
    }
    static async updateProfile(userId, data) {
        return (await prisma.userProfile.update({
            where: { userId },
            data: {
                ...data,
                settings: data.settings,
                preferences: data.preferences,
                updatedAt: new Date(),
            },
        }));
    }
    static async updatePassword(userId, currentPassword, newPassword) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new Error("User not found");
        }
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new Error("Current password is incorrect");
        }
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword },
        });
        const profile = await this.getProfile(userId);
        if (profile) {
            const currentSettings = profile.settings || {};
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
    static async updateNotificationSettings(userId, settings) {
        const profile = await this.getProfile(userId);
        if (!profile) {
            throw new Error("Profile not found");
        }
        const currentSettings = profile.settings || {};
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
    static async updateSecuritySettings(userId, settings) {
        const profile = await this.getProfile(userId);
        if (!profile) {
            throw new Error("Profile not found");
        }
        const currentSettings = profile.settings || {};
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
    static async updatePreferences(userId, preferences) {
        const profile = await this.getProfile(userId);
        if (!profile) {
            throw new Error("Profile not found");
        }
        const currentPreferences = profile.preferences || {};
        const updatedPreferences = {
            ...currentPreferences,
            ...preferences,
        };
        return await this.updateProfile(userId, {
            preferences: updatedPreferences,
        });
    }
    static async uploadAvatar(userId, avatarUrl) {
        return await this.updateProfile(userId, { avatar: avatarUrl });
    }
    static async enableTwoFactor(userId, secret, backupCodes) {
        return await this.updateSecuritySettings(userId, {
            twoFactorEnabled: true,
            twoFactorSecret: secret,
            backupCodes,
        });
    }
    static async disableTwoFactor(userId) {
        return await this.updateSecuritySettings(userId, {
            twoFactorEnabled: false,
            twoFactorSecret: undefined,
            backupCodes: undefined,
        });
    }
    static async addAllowedIP(userId, ipAddress) {
        const profile = await this.getProfile(userId);
        if (!profile) {
            throw new Error("Profile not found");
        }
        const currentSettings = profile.settings || {};
        const currentSecurity = currentSettings.security || {};
        const allowedIPs = [...(currentSecurity.allowedIPs || []), ipAddress];
        return await this.updateSecuritySettings(userId, { allowedIPs });
    }
    static async removeAllowedIP(userId, ipAddress) {
        const profile = await this.getProfile(userId);
        if (!profile) {
            throw new Error("Profile not found");
        }
        const currentSettings = profile.settings || {};
        const currentSecurity = currentSettings.security || {};
        const allowedIPs = (currentSecurity.allowedIPs || []).filter((ip) => ip !== ipAddress);
        return await this.updateSecuritySettings(userId, { allowedIPs });
    }
    static async getPublicProfile(userId) {
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
        const settings = profile.settings || {};
        const preferences = profile.preferences || {};
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
    static async searchProfiles(query, filters = {}, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const where = {};
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
        }));
    }
    static async getProfileStats(userId) {
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
        const settings = profile.settings || {};
        const preferences = profile.preferences || {};
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
                    ? Math.floor((Date.now() - new Date(security.lastPasswordChange).getTime()) /
                        (1000 * 60 * 60 * 24))
                    : 0,
            },
            notifications,
            preferences,
        };
    }
    static async deleteProfile(userId) {
        await prisma.userProfile.delete({
            where: { userId },
        });
    }
    static async exportProfileData(userId) {
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
exports.ProfileModel = ProfileModel;
//# sourceMappingURL=Profile.js.map