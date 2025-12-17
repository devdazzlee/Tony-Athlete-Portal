"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataVisibilityModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class DataVisibilityModel {
    static async createRule(data) {
        return (await prisma.dataVisibilityRule.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                type: data.type,
                scope: data.scope,
                conditions: data.conditions || [],
                permissions: data.permissions || {
                    view: true,
                    edit: false,
                    delete: false,
                    export: false,
                    share: false,
                    restrictedFields: [],
                    allowedRoles: [],
                    allowedUsers: [],
                    allowedAffiliates: [],
                },
                status: data.status || "ACTIVE",
            },
        }));
    }
    static async findById(id) {
        return (await prisma.dataVisibilityRule.findUnique({
            where: { id },
        }));
    }
    static async update(id, data) {
        return (await prisma.dataVisibilityRule.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async delete(id) {
        await prisma.dataVisibilityRule.delete({
            where: { id },
        });
    }
    static async list(accountId, filters = {}) {
        const where = { accountId };
        if (filters.type)
            where.type = filters.type;
        if (filters.scope)
            where.scope = filters.scope;
        if (filters.status)
            where.status = filters.status;
        return (await prisma.dataVisibilityRule.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async checkAccess(userId, resourceType, resourceId, action, userRole, affiliateId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return { allowed: false, reason: "User not found" };
        }
        const rules = await prisma.dataVisibilityRule.findMany({
            where: {
                accountId: user.id,
                status: "ACTIVE",
            },
        });
        let allowed = false;
        let reason = "No matching rules found";
        const maskedFields = [];
        for (const rule of rules) {
            if (rule.type !== resourceType.toUpperCase() && rule.type !== "GLOBAL") {
                continue;
            }
            if (rule.scope === "ROLE_BASED") {
                if (!rule.permissions.allowedRoles.includes(userRole)) {
                    continue;
                }
            }
            else if (rule.scope === "USER_BASED") {
                if (!rule.permissions.allowedUsers.includes(userId)) {
                    continue;
                }
            }
            else if (rule.scope === "AFFILIATE_BASED" && affiliateId) {
                if (!rule.permissions.allowedAffiliates.includes(affiliateId)) {
                    continue;
                }
            }
            const conditionsMet = await this.evaluateConditions(rule.conditions, resourceType, resourceId);
            if (!conditionsMet) {
                continue;
            }
            const permissions = rule.permissions;
            switch (action.toUpperCase()) {
                case "VIEW":
                    if (permissions.view) {
                        allowed = true;
                        reason = "Access granted by rule";
                    }
                    break;
                case "EDIT":
                    if (permissions.edit) {
                        allowed = true;
                        reason = "Edit access granted by rule";
                    }
                    break;
                case "DELETE":
                    if (permissions.delete) {
                        allowed = true;
                        reason = "Delete access granted by rule";
                    }
                    break;
                case "EXPORT":
                    if (permissions.export) {
                        allowed = true;
                        reason = "Export access granted by rule";
                    }
                    break;
                case "SHARE":
                    if (permissions.share) {
                        allowed = true;
                        reason = "Share access granted by rule";
                    }
                    break;
            }
            if (allowed && permissions.restrictedFields) {
                maskedFields.push(...permissions.restrictedFields);
            }
        }
        await this.logAccess(userId, resourceType, resourceId, action, "127.0.0.1", "System", allowed, reason);
        return { allowed, reason, maskedFields };
    }
    static async evaluateConditions(conditions, resourceType, resourceId) {
        if (conditions.length === 0) {
            return true;
        }
        let result = true;
        let logic = "AND";
        for (const condition of conditions) {
            const conditionResult = await this.evaluateCondition(condition, resourceType, resourceId);
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
    static async evaluateCondition(condition, resourceType, resourceId) {
        return true;
    }
    static async logAccess(userId, resourceType, resourceId, action, ipAddress, userAgent, success, reason) {
        return (await prisma.dataAccessLog.create({
            data: {
                userId,
                resourceType,
                resourceId,
                action: action,
                ipAddress,
                userAgent,
                timestamp: new Date(),
                success,
                reason,
            },
        }));
    }
    static async getAccessLogs(filters = {}, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const where = {};
        if (filters.userId)
            where.userId = filters.userId;
        if (filters.resourceType)
            where.resourceType = filters.resourceType;
        if (filters.action)
            where.action = filters.action;
        if (filters.success !== undefined)
            where.success = filters.success;
        if (filters.startDate && filters.endDate) {
            where.timestamp = {
                gte: filters.startDate,
                lte: filters.endDate,
            };
        }
        return (await prisma.dataAccessLog.findMany({
            where,
            skip,
            take: limit,
            orderBy: { timestamp: "desc" },
        }));
    }
    static async createMaskingRule(data) {
        return (await prisma.dataMaskingRule.create({
            data: {
                accountId: data.accountId,
                field: data.field,
                type: data.type,
                pattern: data.pattern || "",
                replacement: data.replacement || "***",
                conditions: data.conditions || [],
                status: data.status || "ACTIVE",
            },
        }));
    }
    static async findMaskingRuleById(id) {
        return (await prisma.dataMaskingRule.findUnique({
            where: { id },
        }));
    }
    static async updateMaskingRule(id, data) {
        return (await prisma.dataMaskingRule.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteMaskingRule(id) {
        await prisma.dataMaskingRule.delete({
            where: { id },
        });
    }
    static async listMaskingRules(accountId, filters = {}) {
        const where = { accountId };
        if (filters.field)
            where.field = filters.field;
        if (filters.type)
            where.type = filters.type;
        if (filters.status)
            where.status = filters.status;
        return (await prisma.dataMaskingRule.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async applyMasking(data, userId, userRole) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return data;
        }
        const maskingRules = await prisma.dataMaskingRule.findMany({
            where: {
                accountId: user.id,
                status: "ACTIVE",
            },
        });
        const maskedData = { ...data };
        for (const rule of maskingRules) {
            if (maskedData[rule.field]) {
                maskedData[rule.field] = this.maskValue(maskedData[rule.field], rule);
            }
        }
        return maskedData;
    }
    static maskValue(value, rule) {
        const stringValue = String(value);
        switch (rule.type) {
            case "PARTIAL":
                if (stringValue.length <= 4) {
                    return rule.replacement;
                }
                return (stringValue.substring(0, 2) +
                    rule.replacement +
                    stringValue.substring(stringValue.length - 2));
            case "FULL":
                return rule.replacement;
            case "HASH":
                const crypto = require("crypto");
                return crypto
                    .createHash("sha256")
                    .update(stringValue)
                    .digest("hex")
                    .substring(0, 8);
            case "ENCRYPT":
                return "ENCRYPTED_" + stringValue.substring(0, 4);
            case "REDACT":
                return stringValue.replace(new RegExp(rule.pattern, "g"), rule.replacement);
            default:
                return stringValue;
        }
    }
    static async getDataVisibilityStats(accountId, startDate, endDate) {
        const where = {};
        if (startDate && endDate) {
            where.timestamp = {
                gte: startDate,
                lte: endDate,
            };
        }
        const accessLogs = await prisma.dataAccessLog.findMany({
            where,
        });
        const stats = {
            totalAccessAttempts: accessLogs.length,
            successfulAccess: accessLogs.filter((log) => log.success).length,
            failedAccess: accessLogs.filter((log) => !log.success).length,
            byAction: {},
            byResourceType: {},
            byUser: {},
            topUsers: [],
            topResources: [],
        };
        accessLogs.forEach((log) => {
            stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
            stats.byResourceType[log.resourceType] =
                (stats.byResourceType[log.resourceType] || 0) + 1;
            stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;
        });
        stats.topUsers = Object.entries(stats.byUser)
            .map(([userId, count]) => ({ userId, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        stats.topResources = Object.entries(stats.byResourceType)
            .map(([resourceType, count]) => ({ resourceType, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        return stats;
    }
    static async createDefaultRules(accountId) {
        const defaultRules = [
            {
                name: "Admin Full Access",
                description: "Administrators have full access to all data",
                type: "SYSTEM_DATA",
                scope: "ROLE_BASED",
                conditions: [],
                permissions: {
                    view: true,
                    edit: true,
                    delete: true,
                    export: true,
                    share: true,
                    restrictedFields: [],
                    allowedRoles: ["ADMIN"],
                    allowedUsers: [],
                    allowedAffiliates: [],
                },
            },
            {
                name: "Manager Limited Access",
                description: "Managers have limited access to affiliate data",
                type: "AFFILIATE_DATA",
                scope: "ROLE_BASED",
                conditions: [],
                permissions: {
                    view: true,
                    edit: true,
                    delete: false,
                    export: true,
                    share: false,
                    restrictedFields: ["ssn", "bankAccount", "taxId"],
                    allowedRoles: ["MANAGER"],
                    allowedUsers: [],
                    allowedAffiliates: [],
                },
            },
            {
                name: "Affiliate Own Data",
                description: "Affiliates can only view their own data",
                type: "AFFILIATE_DATA",
                scope: "USER_BASED",
                conditions: [],
                permissions: {
                    view: true,
                    edit: true,
                    delete: false,
                    export: false,
                    share: false,
                    restrictedFields: ["ssn", "bankAccount"],
                    allowedRoles: ["AFFILIATE"],
                    allowedUsers: [],
                    allowedAffiliates: [],
                },
            },
        ];
        const createdRules = [];
        for (const ruleData of defaultRules) {
            const rule = await this.createRule({
                accountId,
                ...ruleData,
            });
            createdRules.push(rule);
        }
        return createdRules;
    }
    static async createDefaultMaskingRules(accountId) {
        const defaultRules = [
            {
                field: "ssn",
                type: "PARTIAL",
                pattern: "",
                replacement: "***-**-****",
                conditions: [],
            },
            {
                field: "bankAccount",
                type: "PARTIAL",
                pattern: "",
                replacement: "****",
                conditions: [],
            },
            {
                field: "taxId",
                type: "PARTIAL",
                pattern: "",
                replacement: "***-**-****",
                conditions: [],
            },
            {
                field: "phone",
                type: "PARTIAL",
                pattern: "",
                replacement: "***-***-****",
                conditions: [],
            },
        ];
        const createdRules = [];
        for (const ruleData of defaultRules) {
            const rule = await this.createMaskingRule({
                accountId,
                ...ruleData,
            });
            createdRules.push(rule);
        }
        return createdRules;
    }
    static async exportDataVisibilityConfig(accountId) {
        const rules = await this.list(accountId);
        const maskingRules = await this.listMaskingRules(accountId);
        return {
            rules,
            maskingRules,
            exportedAt: new Date().toISOString(),
        };
    }
    static async importDataVisibilityConfig(accountId, config) {
        if (config.rules) {
            for (const ruleData of config.rules) {
                await this.createRule({
                    accountId,
                    ...ruleData,
                });
            }
        }
        if (config.maskingRules) {
            for (const maskingRuleData of config.maskingRules) {
                await this.createMaskingRule({
                    accountId,
                    ...maskingRuleData,
                });
            }
        }
    }
}
exports.DataVisibilityModel = DataVisibilityModel;
//# sourceMappingURL=DataVisibility.js.map