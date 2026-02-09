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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const EmailService_1 = __importStar(require("./EmailService"));
const crypto_1 = __importDefault(require("crypto"));
const SystemSettingsService_1 = require("./SystemSettingsService");
const prisma = new client_1.PrismaClient();
class AuthService {
    getAccessTokenExpiresIn() {
        return (process.env.ACCESS_TOKEN_EXPIRES_IN ||
            process.env.JWT_EXPIRES_IN ||
            "15m");
    }
    getRefreshTokenExpiresInMs() {
        return this.parseDurationMs(process.env.REFRESH_TOKEN_EXPIRES_IN || "30d");
    }
    parseDurationMs(input) {
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
    generateRefreshToken() {
        return crypto_1.default.randomBytes(48).toString("hex");
    }
    async register(data) {
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });
        if (existingUser) {
            throw new Error("User already exists");
        }
        const hashedPassword = await bcryptjs_1.default.hash(data.password, parseInt(process.env.BCRYPT_ROUNDS || "12"));
        const verificationToken = EmailService_1.EmailService.generateToken();
        const user = await prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                firstName: data.firstName,
                lastName: data.lastName,
                role: data.role || "AFFILIATE",
            },
        });
        if (data.role === "AFFILIATE" || !data.role) {
            const defaultCommissionRate = await SystemSettingsService_1.SystemSettingsService.getDefaultCommissionRate();
            await prisma.affiliateProfile.create({
                data: {
                    userId: user.id,
                    paymentMethod: "BANK_TRANSFER",
                    commissionRate: defaultCommissionRate,
                },
            });
        }
        else if (data.role === "ADMIN") {
            await prisma.adminProfile.create({
                data: {
                    userId: user.id,
                    permissions: ["all"],
                },
            });
        }
        await prisma.activity.create({
            data: {
                userId: user.id,
                action: "user_registered",
                resource: "User Account",
                details: `User registered with role: ${user.role}`,
                ipAddress: "127.0.0.1",
                userAgent: "Trackdesk API",
            },
        });
        try {
            await EmailService_1.default.sendVerificationEmail(user.email, user.firstName, verificationToken);
            console.log(`Verification email sent to ${user.email}`);
        }
        catch (error) {
            console.error("Failed to send verification email:", error);
        }
        return {
            message: "Registration successful! Please check your email to verify your account.",
        };
    }
    async refresh(refreshToken, ipAddress, userAgent) {
        if (!refreshToken) {
            throw new Error("Refresh token required");
        }
        const session = await prisma.session.findFirst({
            where: {
                refreshToken,
                isActive: true,
                refreshExpiresAt: { gt: new Date() },
            },
        });
        if (!session) {
            const error = new Error("Invalid or expired refresh token");
            error.code = "TOKEN_EXPIRED";
            throw error;
        }
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
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
        const newAccessToken = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: accessTokenExpiresIn });
        const newRefreshToken = this.generateRefreshToken();
        const accessExpiresAt = new Date(now.getTime() + this.parseDurationMs(accessTokenExpiresIn));
        const refreshExpiresAt = new Date(now.getTime() + this.getRefreshTokenExpiresInMs());
        await prisma.session.update({
            where: { id: session.id },
            data: {
                token: newAccessToken,
                refreshToken: newRefreshToken,
                expiresAt: accessExpiresAt,
                refreshExpiresAt,
                ipAddress: ipAddress || session.ipAddress || null,
                userAgent: userAgent || session.userAgent || null,
                lastActivity: now,
                isActive: true,
            },
        });
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
    async login(data, ipAddress, userAgent) {
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
        const validPassword = await bcryptjs_1.default.compare(data.password, user.password);
        if (!validPassword) {
            throw new Error("Invalid credentials");
        }
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        const accessTokenExpiresIn = this.getAccessTokenExpiresIn();
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: accessTokenExpiresIn });
        const refreshToken = this.generateRefreshToken();
        const now = new Date();
        const accessExpiresAt = new Date(now.getTime() + this.parseDurationMs(accessTokenExpiresIn));
        const refreshExpiresAt = new Date(now.getTime() + this.getRefreshTokenExpiresInMs());
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
            },
        });
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
    async verifyEmail(token) {
        return {
            message: "Email verification is not fully implemented. You can log in without verification.",
        };
    }
    async resendVerificationEmail(email) {
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            throw new Error("User not found");
        }
        return {
            message: "Email verification is not fully implemented. You can log in without verification.",
        };
    }
    async logout(userId) {
        await prisma.session.updateMany({
            where: { userId },
            data: { isActive: false },
        });
        await prisma.activity.create({
            data: {
                userId,
                action: "user_logout",
                resource: "User Account",
                details: "User logged out",
            },
        });
    }
    async getProfile(userId) {
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
            avatar: user.avatar || null,
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
    async updateProfile(userId, data) {
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
    async changePassword(userId, currentPassword, newPassword) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new Error("User not found");
        }
        const validPassword = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!validPassword) {
            throw new Error("Current password is incorrect");
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS || "12"));
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        await prisma.activity.create({
            data: {
                userId,
                action: "password_changed",
                resource: "User Account",
                details: "Password changed successfully",
            },
        });
    }
    async forgotPassword(email) {
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return;
        }
        const resetToken = crypto_1.default.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 3600000);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpires: expiresAt,
            },
        });
        await EmailService_1.default.sendPasswordResetEmail(email, user.firstName, resetToken);
    }
    async resetPassword(token, newPassword) {
        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpires: {
                    gt: new Date(),
                },
            },
        });
        if (!user) {
            throw new Error("Invalid or expired reset token");
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS || "12"));
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpires: null,
            },
        });
    }
    async enable2FA(userId) {
        await prisma.user.update({
            where: { id: userId },
            data: { twoFactorEnabled: true },
        });
        await prisma.activity.create({
            data: {
                userId,
                action: "2fa_enabled",
                resource: "Security",
                details: "Two-factor authentication enabled",
            },
        });
    }
    async disable2FA(userId) {
        await prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
            },
        });
        await prisma.activity.create({
            data: {
                userId,
                action: "2fa_disabled",
                resource: "Security",
                details: "Two-factor authentication disabled",
            },
        });
    }
    async generateBackupCodes(userId) {
        const codes = [];
        for (let i = 0; i < 10; i++) {
            codes.push(crypto_1.default.randomBytes(4).toString("hex").toUpperCase());
        }
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
exports.AuthService = AuthService;
//# sourceMappingURL=AuthService.js.map