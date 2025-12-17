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
exports.PersonalTokenModel = void 0;
const client_1 = require("@prisma/client");
const crypto = __importStar(require("crypto"));
const prisma = new client_1.PrismaClient();
class PersonalTokenModel {
    static async create(data) {
        const token = this.generateToken();
        return (await prisma.personalToken.create({
            data: {
                userId: data.userId,
                name: data.name,
                token,
                permissions: data.permissions || [],
                expiresAt: data.expiresAt,
                status: "ACTIVE",
            },
        }));
    }
    static async findById(id) {
        return (await prisma.personalToken.findUnique({
            where: { id },
        }));
    }
    static async findByToken(token) {
        return (await prisma.personalToken.findUnique({
            where: { token },
        }));
    }
    static async findByUserId(userId) {
        return (await prisma.personalToken.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        }));
    }
    static async update(id, data) {
        return (await prisma.personalToken.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async delete(id) {
        await prisma.personalToken.delete({
            where: { id },
        });
    }
    static async revoke(id) {
        return await this.update(id, { status: "INACTIVE" });
    }
    static async regenerate(id) {
        const newToken = this.generateToken();
        return await this.update(id, {
            token: newToken,
            lastUsedAt: null,
            status: "ACTIVE",
        });
    }
    static async validateToken(token) {
        const personalToken = await this.findByToken(token);
        if (!personalToken) {
            return { valid: false, error: "Token not found" };
        }
        if (personalToken.status !== "ACTIVE") {
            return { valid: false, error: "Token is inactive" };
        }
        if (personalToken.expiresAt && new Date() > personalToken.expiresAt) {
            await this.update(personalToken.id, { status: "EXPIRED" });
            return { valid: false, error: "Token has expired" };
        }
        return { valid: true, token: personalToken };
    }
    static async checkPermission(token, permission) {
        const validation = await this.validateToken(token);
        if (!validation.valid || !validation.token) {
            return false;
        }
        return (validation.token.permissions.includes(permission) ||
            validation.token.permissions.includes("*"));
    }
    static async recordUsage(tokenId, endpoint, method, ipAddress, userAgent, responseStatus, responseTime) {
        await this.update(tokenId, { lastUsedAt: new Date() });
        return (await prisma.tokenUsage.create({
            data: {
                tokenId,
                endpoint,
                ipAddress,
                userAgent,
            },
        }));
    }
    static async getTokenUsage(tokenId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        return (await prisma.tokenUsage.findMany({
            where: { tokenId },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async getTokenStats(tokenId, startDate, endDate) {
        const where = { tokenId };
        if (startDate && endDate) {
            where.createdAt = {
                gte: startDate,
                lte: endDate,
            };
        }
        const usage = await prisma.tokenUsage.findMany({
            where,
        });
        const stats = {
            totalRequests: usage.length,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            byEndpoint: {},
            byMethod: {},
            byHour: {},
            byDay: {},
        };
        let totalResponseTime = 0;
        usage.forEach((record) => {
            stats.successfulRequests++;
            if (!stats.byEndpoint[record.endpoint]) {
                stats.byEndpoint[record.endpoint] = {
                    total: 0,
                    success: 0,
                    failed: 0,
                    avgTime: 0,
                };
            }
            stats.byEndpoint[record.endpoint].total++;
            stats.byEndpoint[record.endpoint].success++;
            const hour = record.createdAt.getHours();
            stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
            const day = record.createdAt.toISOString().split("T")[0];
            stats.byDay[day] = (stats.byDay[day] || 0) + 1;
        });
        stats.averageResponseTime =
            usage.length > 0 ? totalResponseTime / usage.length : 0;
        Object.keys(stats.byEndpoint).forEach((endpoint) => {
            stats.byEndpoint[endpoint].avgTime = 0;
        });
        return stats;
    }
    static async getAvailablePermissions() {
        return [
            "affiliates:read",
            "affiliates:write",
            "affiliates:delete",
            "offers:read",
            "offers:write",
            "offers:delete",
            "conversions:read",
            "conversions:write",
            "clicks:read",
            "payouts:read",
            "payouts:write",
            "reports:read",
            "analytics:read",
            "webhooks:read",
            "webhooks:write",
            "webhooks:delete",
            "settings:read",
            "settings:write",
            "users:read",
            "users:write",
            "users:delete",
            "*",
        ];
    }
    static async createDefaultTokens(userId) {
        const defaultTokens = [
            {
                name: "Full Access Token",
                permissions: ["*"],
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
            {
                name: "Read Only Token",
                permissions: [
                    "affiliates:read",
                    "offers:read",
                    "conversions:read",
                    "clicks:read",
                    "payouts:read",
                    "reports:read",
                    "analytics:read",
                ],
                expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            },
            {
                name: "Affiliate Management Token",
                permissions: [
                    "affiliates:read",
                    "affiliates:write",
                    "conversions:read",
                    "payouts:read",
                    "reports:read",
                ],
                expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
            },
        ];
        const createdTokens = [];
        for (const tokenData of defaultTokens) {
            const token = await this.create({
                userId,
                ...tokenData,
            });
            createdTokens.push(token);
        }
        return createdTokens;
    }
    static generateToken() {
        return `td_${crypto.randomBytes(32).toString("hex")}`;
    }
    static async cleanupExpiredTokens() {
        const expiredTokens = await prisma.personalToken.findMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
                status: "ACTIVE",
            },
        });
        for (const token of expiredTokens) {
            await this.update(token.id, { status: "EXPIRED" });
        }
        return expiredTokens.length;
    }
    static async getTokenHealth() {
        const totalTokens = await prisma.personalToken.count();
        const activeTokens = await prisma.personalToken.count({
            where: { status: "ACTIVE" },
        });
        const expiredTokens = await prisma.personalToken.count({
            where: { status: "EXPIRED" },
        });
        const inactiveTokens = await prisma.personalToken.count({
            where: { status: "INACTIVE" },
        });
        const recentlyUsed = await prisma.personalToken.count({
            where: {
                lastUsedAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                },
            },
        });
        return {
            total: totalTokens,
            active: activeTokens,
            expired: expiredTokens,
            inactive: inactiveTokens,
            recentlyUsed,
            healthPercentage: totalTokens > 0 ? (activeTokens / totalTokens) * 100 : 0,
        };
    }
}
exports.PersonalTokenModel = PersonalTokenModel;
//# sourceMappingURL=PersonalToken.js.map