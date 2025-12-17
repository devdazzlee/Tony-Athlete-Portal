"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class AuthorizationModel {
    static async createRole(data) {
        return (await prisma.role.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                permissions: (data.permissions || []),
            },
        }));
    }
    static async findRoleById(id) {
        return (await prisma.role.findUnique({
            where: { id },
        }));
    }
    static async findRoleByName(accountId, name) {
        return (await prisma.role.findFirst({
            where: {
                accountId,
                name,
            },
        }));
    }
    static async updateRole(id, data) {
        return (await prisma.role.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteRole(id) {
        await prisma.role.delete({
            where: { id },
        });
    }
    static async listRoles(accountId, filters = {}) {
        const where = { accountId };
        if (filters.status)
            where.status = filters.status;
        if (filters.isSystem !== undefined)
            where.isSystem = filters.isSystem;
        if (filters.isDefault !== undefined)
            where.isDefault = filters.isDefault;
        return (await prisma.role.findMany({
            where,
            orderBy: { name: "asc" },
        }));
    }
    static async assignRole(userId, roleId, accountId, grantedBy, expiresAt) {
        return (await prisma.userRoleAssignment.create({
            data: {
                userId,
                roleId,
                accountId,
                assignedAt: new Date(),
            },
        }));
    }
    static async revokeRole(userRoleId) {
        await prisma.userRoleAssignment.update({
            where: { id: userRoleId },
            data: {},
        });
    }
    static async getUserRoles(userId, accountId) {
        return (await prisma.userRoleAssignment.findMany({
            where: {
                userId,
                accountId,
            },
        }));
    }
    static async checkPermission(userId, accountId, resource, action, resourceId, context) {
        const userRoles = await this.getUserRoles(userId, accountId);
        for (const userRole of userRoles) {
            const role = userRole.role || {};
            for (const permission of role.permissions) {
                if (permission.resource === resource &&
                    permission.action === action &&
                    permission.granted) {
                    if (this.evaluatePermissionConditions(permission.conditions || [], context, resourceId)) {
                        return true;
                    }
                }
            }
        }
        const accessControls = await this.getAccessControls(userId, accountId, resource, resourceId);
        for (const accessControl of accessControls) {
            if (accessControl.permissions.includes(action)) {
                if (this.evaluateAccessConditions(accessControl.conditions, context, resourceId)) {
                    return true;
                }
            }
        }
        return false;
    }
    static evaluatePermissionConditions(conditions, context, resourceId) {
        if (conditions.length === 0)
            return true;
        for (const condition of conditions) {
            if (!this.evaluateCondition(condition, context, resourceId)) {
                return false;
            }
        }
        return true;
    }
    static evaluateAccessConditions(conditions, context, resourceId) {
        if (conditions.length === 0)
            return true;
        let result = true;
        let logic = "AND";
        for (const condition of conditions) {
            const conditionResult = this.evaluateCondition(condition, context, resourceId);
            if (logic === "AND") {
                result = result && conditionResult;
            }
            else {
                result = result || conditionResult;
            }
            logic = condition.logic;
        }
        return result;
    }
    static evaluateCondition(condition, context, resourceId) {
        let value;
        switch (condition.operator) {
            case "OWNER":
                return context?.userId === context?.ownerId;
            case "SAME_ACCOUNT":
                return context?.accountId === context?.resourceAccountId;
            default:
                value = this.getFieldValue(context, condition.field);
                break;
        }
        switch (condition.operator) {
            case "EQUALS":
                return value === condition.value;
            case "NOT_EQUALS":
                return value !== condition.value;
            case "CONTAINS":
                return String(value).includes(String(condition.value));
            case "IN":
                return (Array.isArray(condition.value) && condition.value.includes(value));
            case "NOT_IN":
                return (Array.isArray(condition.value) && !condition.value.includes(value));
            default:
                return false;
        }
    }
    static getFieldValue(data, field) {
        const fields = field.split(".");
        let value = data;
        for (const f of fields) {
            value = value?.[f];
        }
        return value;
    }
    static async createAccessControl(data) {
        return (await prisma.accessControl.create({
            data: {
                accountId: data.accountId,
                resource: data.resource,
                userId: data.userId,
                roleId: data.roleId,
                permissions: data.permissions || [],
                conditions: data.conditions || [],
                status: data.status || "ACTIVE",
            },
        }));
    }
    static async getAccessControls(userId, accountId, resource, resourceId) {
        const where = {
            accountId,
            resource,
            status: "ACTIVE",
        };
        if (resourceId) {
            where.resourceId = resourceId;
        }
        where.OR = [
            { userId },
            { roleId: { in: await this.getUserRoleIds(userId, accountId) } },
        ];
        return (await prisma.accessControl.findMany({
            where,
        }));
    }
    static async getUserRoleIds(userId, accountId) {
        const userRoles = await this.getUserRoles(userId, accountId);
        return userRoles.map((ur) => ur.roleId);
    }
    static async createAuditLog(data) {
        return (await prisma.auditLog.create({
            data: {
                accountId: data.accountId,
                userId: data.userId,
                action: data.action,
                resource: data.resource,
                resourceId: data.resourceId,
                details: data.details || {},
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                timestamp: data.timestamp || new Date(),
            },
        }));
    }
    static async getAuditLogs(accountId, filters = {}, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const where = { accountId };
        if (filters.userId)
            where.userId = filters.userId;
        if (filters.action)
            where.action = filters.action;
        if (filters.resource)
            where.resource = filters.resource;
        if (filters.resourceId)
            where.resourceId = filters.resourceId;
        if (filters.startDate && filters.endDate) {
            where.timestamp = {
                gte: filters.startDate,
                lte: filters.endDate,
            };
        }
        return (await prisma.auditLog.findMany({
            where,
            skip,
            take: limit,
            orderBy: { timestamp: "desc" },
        }));
    }
    static async createSession(data) {
        return (await prisma.session.create({
            data: {
                userId: data.userId,
                token: data.token,
                refreshToken: data.refreshToken,
                expiresAt: data.expiresAt,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
            },
        }));
    }
    static async findSessionByToken(token) {
        return (await prisma.session.findFirst({
            where: {
                token,
                expiresAt: { gt: new Date() },
            },
        }));
    }
    static async updateSessionActivity(sessionId) {
        return (await prisma.session.update({
            where: { id: sessionId },
            data: {},
        }));
    }
    static async revokeSession(sessionId) {
        await prisma.session.update({
            where: { id: sessionId },
            data: {},
        });
    }
    static async revokeAllUserSessions(userId, accountId) {
        await prisma.session.updateMany({
            where: {
                userId,
            },
            data: {},
        });
    }
    static async createTwoFactorAuth(data) {
        return (await prisma.twoFactorAuth.create({
            data: {
                userId: data.userId,
                method: data.method,
                secret: data.secret,
                backupCodes: data.backupCodes || [],
                isEnabled: data.isEnabled || false,
            },
        }));
    }
    static async findTwoFactorAuthByUser(userId, accountId) {
        return (await prisma.twoFactorAuth.findFirst({
            where: {
                userId,
            },
        }));
    }
    static async updateTwoFactorAuth(id, data) {
        return (await prisma.twoFactorAuth.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteTwoFactorAuth(id) {
        await prisma.twoFactorAuth.delete({
            where: { id },
        });
    }
    static async generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < 10; i++) {
            codes.push(Math.random().toString(36).substring(2, 8).toUpperCase());
        }
        return codes;
    }
    static async verifyTwoFactorCode(userId, accountId, code) {
        const twoFactor = await this.findTwoFactorAuthByUser(userId, accountId);
        if (!twoFactor || !twoFactor.isEnabled) {
            return false;
        }
        if (twoFactor.backupCodes.includes(code)) {
            const updatedCodes = twoFactor.backupCodes.filter((c) => c !== code);
            await this.updateTwoFactorAuth(twoFactor.id, {
                backupCodes: updatedCodes,
                lastUsed: new Date(),
            });
            return true;
        }
        if (twoFactor.method === "TOTP" && twoFactor.secret) {
            const isValid = this.verifyTOTPCode(twoFactor.secret, code);
            if (isValid) {
                await this.updateTwoFactorAuth(twoFactor.id, {
                    lastUsed: new Date(),
                });
            }
            return isValid;
        }
        return false;
    }
    static verifyTOTPCode(secret, code) {
        const crypto = require("crypto");
        const time = Math.floor(Date.now() / 1000 / 30);
        const key = Buffer.from(secret, "base64");
        for (let i = -1; i <= 1; i++) {
            const timeStep = time + i;
            const hmac = crypto.createHmac("sha1", key);
            hmac.update(Buffer.from(timeStep.toString(16).padStart(16, "0"), "hex"));
            const hash = hmac.digest();
            const offset = hash[hash.length - 1] & 0xf;
            const binary = ((hash[offset] & 0x7f) << 24) |
                ((hash[offset + 1] & 0xff) << 16) |
                ((hash[offset + 2] & 0xff) << 8) |
                (hash[offset + 3] & 0xff);
            const totp = (binary % 1000000).toString().padStart(6, "0");
            if (totp === code) {
                return true;
            }
        }
        return false;
    }
    static async getAuthorizationStats(accountId) {
        const roles = await this.listRoles(accountId);
        const userRoles = await prisma.userRoleAssignment.count({
            where: { accountId },
        });
        const sessions = await prisma.session.count({
            where: {},
        });
        const twoFactorUsers = await prisma.twoFactorAuth.count({
            where: { isEnabled: true },
        });
        const stats = {
            totalRoles: roles.length,
            activeRoles: roles.filter((r) => r.status === "ACTIVE").length,
            totalUserRoles: userRoles,
            activeSessions: sessions,
            twoFactorUsers,
            byRole: {},
            byPermission: {},
        };
        for (const role of roles) {
            const count = await prisma.userRoleAssignment.count({
                where: { roleId: role.id },
            });
            stats.byRole[role.name] = count;
        }
        for (const role of roles) {
            for (const permission of role.permissions) {
                const key = `${permission.resource}:${permission.action}`;
                stats.byPermission[key] = (stats.byPermission[key] || 0) + 1;
            }
        }
        return stats;
    }
    static async createDefaultRoles(accountId) {
        const defaultRoles = [
            {
                name: "Super Admin",
                description: "Full system access",
                permissions: [{ id: "all", resource: "*", action: "*", granted: true }],
                isSystem: true,
                isDefault: true,
            },
            {
                name: "Admin",
                description: "Account administration",
                permissions: [
                    {
                        id: "affiliates_manage",
                        resource: "affiliates",
                        action: "manage",
                        granted: true,
                    },
                    {
                        id: "offers_manage",
                        resource: "offers",
                        action: "manage",
                        granted: true,
                    },
                    {
                        id: "reports_view",
                        resource: "reports",
                        action: "view",
                        granted: true,
                    },
                    {
                        id: "settings_manage",
                        resource: "settings",
                        action: "manage",
                        granted: true,
                    },
                ],
                isSystem: false,
                isDefault: true,
            },
            {
                name: "Affiliate Manager",
                description: "Affiliate management",
                permissions: [
                    {
                        id: "affiliates_view",
                        resource: "affiliates",
                        action: "view",
                        granted: true,
                    },
                    {
                        id: "affiliates_edit",
                        resource: "affiliates",
                        action: "edit",
                        granted: true,
                    },
                    {
                        id: "offers_view",
                        resource: "offers",
                        action: "view",
                        granted: true,
                    },
                    {
                        id: "reports_view",
                        resource: "reports",
                        action: "view",
                        granted: true,
                    },
                ],
                isSystem: false,
                isDefault: true,
            },
            {
                name: "Affiliate",
                description: "Affiliate partner",
                permissions: [
                    {
                        id: "dashboard_view",
                        resource: "dashboard",
                        action: "view",
                        granted: true,
                    },
                    {
                        id: "links_manage",
                        resource: "links",
                        action: "manage",
                        granted: true,
                    },
                    {
                        id: "reports_view_own",
                        resource: "reports",
                        action: "view",
                        conditions: [
                            { field: "affiliateId", operator: "OWNER", value: null },
                        ],
                        granted: true,
                    },
                ],
                isSystem: false,
                isDefault: true,
            },
        ];
        const createdRoles = [];
        for (const roleData of defaultRoles) {
            const role = await this.createRole({
                accountId,
                ...roleData,
            });
            createdRoles.push(role);
        }
        return createdRoles;
    }
    static async getAuthorizationDashboard(accountId) {
        const roles = await this.listRoles(accountId);
        const stats = await this.getAuthorizationStats(accountId);
        return {
            roles,
            stats,
        };
    }
}
exports.AuthorizationModel = AuthorizationModel;
//# sourceMappingURL=Authorization.js.map