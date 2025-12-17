"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraudPreventionModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class FraudPreventionModel {
    static async createRule(data) {
        const result = await prisma.fraudRule.create({
            data: {
                name: data.name,
                description: data.description || "",
                type: data.type,
                conditions: (data.conditions || []),
                actions: (data.actions || []),
                severity: data.severity || "MEDIUM",
                status: data.status || "ACTIVE",
            },
        });
        return result;
    }
    static async findRuleById(id) {
        const result = await prisma.fraudRule.findUnique({
            where: { id },
        });
        return result;
    }
    static async updateRule(id, data) {
        const result = await prisma.fraudRule.update({
            where: { id },
            data: {
                ...data,
                conditions: data.conditions,
                actions: data.actions,
            },
        });
        return result;
    }
    static async deleteRule(id) {
        await prisma.fraudRule.delete({
            where: { id },
        });
    }
    static async listRules(filters = {}) {
        const where = {};
        if (filters.status)
            where.status = filters.status;
        if (filters.type)
            where.type = filters.type;
        if (filters.severity)
            where.severity = filters.severity;
        const results = await prisma.fraudRule.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });
        return results;
    }
    static async detectFraud(data, ipAddress, userAgent, affiliateId, clickId, conversionId) {
        const activeRules = await this.listRules({ status: "ACTIVE" });
        const fraudEvents = [];
        for (const rule of activeRules) {
            const score = this.calculateFraudScore(rule, data);
            if (score > 0) {
                const fraudEvent = (await prisma.fraudEvent.create({
                    data: {
                        ruleId: rule.id,
                        type: rule.type,
                        severity: rule.severity,
                        data: data,
                        score,
                        status: "DETECTED",
                        action: this.executeFraudActions(rule.actions, data),
                        ipAddress,
                        userAgent,
                        affiliateId,
                        clickId,
                        conversionId,
                    },
                }));
                fraudEvents.push(fraudEvent);
            }
        }
        return fraudEvents;
    }
    static calculateFraudScore(rule, data) {
        let totalScore = 0;
        let totalWeight = 0;
        for (const condition of rule.conditions) {
            const conditionScore = this.evaluateCondition(condition, data);
            totalScore += conditionScore * condition.weight;
            totalWeight += condition.weight;
        }
        return totalWeight > 0 ? totalScore / totalWeight : 0;
    }
    static evaluateCondition(condition, data) {
        const fieldValue = this.getFieldValue(data, condition.field);
        switch (condition.operator) {
            case "EQUALS":
                return fieldValue === condition.value ? 1 : 0;
            case "NOT_EQUALS":
                return fieldValue !== condition.value ? 1 : 0;
            case "CONTAINS":
                return String(fieldValue).includes(String(condition.value)) ? 1 : 0;
            case "NOT_CONTAINS":
                return !String(fieldValue).includes(String(condition.value)) ? 1 : 0;
            case "GREATER_THAN":
                return Number(fieldValue) > Number(condition.value) ? 1 : 0;
            case "LESS_THAN":
                return Number(fieldValue) < Number(condition.value) ? 1 : 0;
            case "IN":
                return Array.isArray(condition.value) &&
                    condition.value.includes(fieldValue)
                    ? 1
                    : 0;
            case "NOT_IN":
                return Array.isArray(condition.value) &&
                    !condition.value.includes(fieldValue)
                    ? 1
                    : 0;
            default:
                return 0;
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
    static executeFraudActions(actions, data) {
        const executedActions = [];
        for (const action of actions) {
            switch (action.type) {
                case "BLOCK":
                    executedActions.push("BLOCKED");
                    break;
                case "FLAG":
                    executedActions.push("FLAGGED");
                    break;
                case "REDIRECT":
                    executedActions.push("REDIRECTED");
                    break;
                case "NOTIFY":
                    executedActions.push("NOTIFIED");
                    break;
                case "PAUSE_AFFILIATE":
                    executedActions.push("AFFILIATE_PAUSED");
                    break;
                case "REJECT_CONVERSION":
                    executedActions.push("CONVERSION_REJECTED");
                    break;
            }
        }
        return executedActions.join(", ");
    }
    static async getFraudEvents(filters = {}, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const where = {};
        if (filters.status)
            where.status = filters.status;
        if (filters.type)
            where.type = filters.type;
        if (filters.severity)
            where.severity = filters.severity;
        if (filters.affiliateId)
            where.affiliateId = filters.affiliateId;
        if (filters.startDate && filters.endDate) {
            where.createdAt = {
                gte: filters.startDate,
                lte: filters.endDate,
            };
        }
        const results = await prisma.fraudEvent.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        });
        return results;
    }
    static async updateFraudEventStatus(id, status) {
        const updateData = { status };
        if (status === "REVIEWED") {
            updateData.reviewedAt = new Date();
        }
        else if (status === "RESOLVED") {
            updateData.resolvedAt = new Date();
        }
        const result = await prisma.fraudEvent.update({
            where: { id },
            data: updateData,
        });
        return result;
    }
    static async getFraudStats(startDate, endDate) {
        const where = {};
        if (startDate && endDate) {
            where.createdAt = {
                gte: startDate,
                lte: endDate,
            };
        }
        const events = await prisma.fraudEvent.findMany({
            where,
            include: {
                affiliate: {
                    include: {
                        user: true,
                    },
                },
            },
        });
        const stats = {
            totalEvents: events.length,
            eventsByType: {},
            eventsBySeverity: {},
            eventsByStatus: {},
            topAffiliates: [],
            topIPs: [],
            topCountries: [],
        };
        events.forEach((event) => {
            stats.eventsByType[event.type] =
                (stats.eventsByType[event.type] || 0) + 1;
            stats.eventsBySeverity[event.severity] =
                (stats.eventsBySeverity[event.severity] || 0) + 1;
            stats.eventsByStatus[event.status] =
                (stats.eventsByStatus[event.status] || 0) + 1;
        });
        const affiliateCounts = {};
        events.forEach((event) => {
            if (event.affiliateId) {
                if (!affiliateCounts[event.affiliateId]) {
                    affiliateCounts[event.affiliateId] = {
                        count: 0,
                        name: event.affiliate?.user
                            ? `${event.affiliate.user.firstName} ${event.affiliate.user.lastName}`
                            : "Unknown",
                    };
                }
                affiliateCounts[event.affiliateId].count++;
            }
        });
        stats.topAffiliates = Object.entries(affiliateCounts)
            .map(([affiliateId, data]) => ({ affiliateId, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        const ipCounts = {};
        events.forEach((event) => {
            ipCounts[event.ipAddress] = (ipCounts[event.ipAddress] || 0) + 1;
        });
        stats.topIPs = Object.entries(ipCounts)
            .map(([ip, count]) => ({ ip, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        const countryCounts = {};
        events.forEach((event) => {
            const eventData = event.data;
            const country = eventData?.country || "Unknown";
            countryCounts[country] = (countryCounts[country] || 0) + 1;
        });
        stats.topCountries = Object.entries(countryCounts)
            .map(([country, count]) => ({ country, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        return stats;
    }
    static async createDefaultRules() {
        const defaultRules = [
            {
                name: "High Click Rate Detection",
                description: "Detects unusually high click rates from single IP",
                type: "CLICK_FRAUD",
                conditions: [
                    {
                        field: "clicks_per_hour",
                        operator: "GREATER_THAN",
                        value: 100,
                        weight: 1,
                    },
                    {
                        field: "ip_address",
                        operator: "EQUALS",
                        value: "same",
                        weight: 1,
                    },
                ],
                actions: [{ type: "FLAG", parameters: {} }],
                severity: "HIGH",
            },
            {
                name: "Suspicious User Agent",
                description: "Detects suspicious or bot user agents",
                type: "TRAFFIC_QUALITY",
                conditions: [
                    {
                        field: "user_agent",
                        operator: "CONTAINS",
                        value: "bot",
                        weight: 1,
                    },
                    {
                        field: "user_agent",
                        operator: "EQUALS",
                        value: "",
                        weight: 1,
                    },
                ],
                actions: [{ type: "BLOCK", parameters: {} }],
                severity: "MEDIUM",
            },
            {
                name: "Geo Blocking",
                description: "Blocks traffic from specific countries",
                type: "GEO_BLOCKING",
                conditions: [
                    {
                        field: "country",
                        operator: "IN",
                        value: ["CN", "RU", "KP"],
                        weight: 1,
                    },
                ],
                actions: [{ type: "BLOCK", parameters: {} }],
                severity: "HIGH",
            },
        ];
        const createdRules = [];
        for (const ruleData of defaultRules) {
            const rule = await this.createRule(ruleData);
            createdRules.push(rule);
        }
        return createdRules;
    }
}
exports.FraudPreventionModel = FraudPreventionModel;
//# sourceMappingURL=FraudPrevention.js.map