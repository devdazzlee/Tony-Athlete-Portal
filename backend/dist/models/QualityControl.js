"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QualityControlModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class QualityControlModel {
    static async createRule(data) {
        return (await prisma.qualityRule.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                conditions: (data.conditions || []),
                actions: (data.actions || []),
                status: data.status || "ACTIVE",
            },
        }));
    }
    static async findRuleById(id) {
        return (await prisma.qualityRule.findUnique({
            where: { id },
        }));
    }
    static async updateRule(id, data) {
        return (await prisma.qualityRule.update({
            where: { id },
            data: {
                ...data,
                conditions: data.conditions,
                actions: data.actions,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteRule(id) {
        await prisma.qualityRule.delete({
            where: { id },
        });
    }
    static async listRules(filters = {}) {
        const where = {};
        if (filters.status)
            where.status = filters.status;
        if (filters.accountId)
            where.accountId = filters.accountId;
        return (await prisma.qualityRule.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async performQualityCheck(data, type, affiliateId, clickId, conversionId, offerId) {
        const activeRules = await this.listRules({ status: "ACTIVE" });
        const qualityChecks = [];
        for (const rule of activeRules) {
            const score = this.calculateQualityScore(rule, data);
            const status = this.determineQualityStatus(score, rule);
            const action = this.executeQualityActions(rule.actions, data);
            const qualityCheck = (await prisma.qualityCheck.create({
                data: {
                    ruleId: rule.id,
                    affiliateId: affiliateId || "",
                    result: status,
                    data: data,
                },
            }));
            qualityChecks.push(qualityCheck);
        }
        return qualityChecks;
    }
    static calculateQualityScore(rule, data) {
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
            case "GREATER_THAN":
                return Number(fieldValue) > Number(condition.value) ? 1 : 0;
            case "LESS_THAN":
                return Number(fieldValue) < Number(condition.value) ? 1 : 0;
            case "BETWEEN":
                const [min, max] = Array.isArray(condition.value)
                    ? condition.value
                    : [0, 0];
                return Number(fieldValue) >= min && Number(fieldValue) <= max ? 1 : 0;
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
    static determineQualityStatus(score, rule) {
        if (score >= 0.8)
            return "PASSED";
        if (score >= 0.5)
            return "REVIEW_REQUIRED";
        return "FAILED";
    }
    static executeQualityActions(actions, data) {
        const executedActions = [];
        for (const action of actions) {
            switch (action.type) {
                case "APPROVE":
                    executedActions.push("APPROVED");
                    break;
                case "REJECT":
                    executedActions.push("REJECTED");
                    break;
                case "FLAG":
                    executedActions.push("FLAGGED");
                    break;
                case "REQUIRE_REVIEW":
                    executedActions.push("REVIEW_REQUIRED");
                    break;
                case "PAUSE_AFFILIATE":
                    executedActions.push("AFFILIATE_PAUSED");
                    break;
                case "SEND_NOTIFICATION":
                    executedActions.push("NOTIFICATION_SENT");
                    break;
            }
        }
        return executedActions.join(", ");
    }
    static async getQualityChecks(filters = {}, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const where = {};
        if (filters.result)
            where.result = filters.result;
        if (filters.affiliateId)
            where.affiliateId = filters.affiliateId;
        if (filters.startDate && filters.endDate) {
            where.createdAt = {
                gte: filters.startDate,
                lte: filters.endDate,
            };
        }
        return (await prisma.qualityCheck.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async updateQualityCheckStatus(id, status, reviewedBy) {
        return (await prisma.qualityCheck.update({
            where: { id },
            data: {
                result: status,
                updatedAt: new Date(),
            },
        }));
    }
    static async getQualityMetrics(startDate, endDate) {
        const where = {};
        if (startDate && endDate) {
            where.createdAt = {
                gte: startDate,
                lte: endDate,
            };
        }
        const checks = await prisma.qualityCheck.findMany({
            where,
        });
        const metrics = {
            totalChecks: checks.length,
            passedChecks: 0,
            failedChecks: 0,
            reviewRequired: 0,
            passRate: 0,
            byType: {},
            byAffiliate: {},
            byOffer: {},
        };
        checks.forEach((check) => {
            switch (check.result) {
                case "PASSED":
                    metrics.passedChecks++;
                    break;
                case "FAILED":
                    metrics.failedChecks++;
                    break;
                case "REVIEW_REQUIRED":
                    metrics.reviewRequired++;
                    break;
            }
            if (check.affiliateId) {
                if (!metrics.byAffiliate[check.affiliateId]) {
                    metrics.byAffiliate[check.affiliateId] = {
                        total: 0,
                        passed: 0,
                        failed: 0,
                        review: 0,
                        name: "Unknown",
                    };
                }
                metrics.byAffiliate[check.affiliateId].total++;
                if (check.result === "PASSED")
                    metrics.byAffiliate[check.affiliateId].passed++;
                else if (check.result === "FAILED")
                    metrics.byAffiliate[check.affiliateId].failed++;
                else if (check.result === "REVIEW_REQUIRED")
                    metrics.byAffiliate[check.affiliateId].review++;
            }
        });
        metrics.passRate =
            metrics.totalChecks > 0
                ? (metrics.passedChecks / metrics.totalChecks) * 100
                : 0;
        return metrics;
    }
    static async createDefaultRules(accountId) {
        const defaultRules = [
            {
                accountId,
                name: "Traffic Quality Check",
                description: "Checks for high-quality traffic indicators",
                conditions: [
                    {
                        field: "bounce_rate",
                        operator: "LESS_THAN",
                        value: 0.7,
                        weight: 1,
                    },
                    {
                        field: "session_duration",
                        operator: "GREATER_THAN",
                        value: 30,
                        weight: 1,
                    },
                    {
                        field: "pages_per_session",
                        operator: "GREATER_THAN",
                        value: 2,
                        weight: 1,
                    },
                ],
                actions: [{ type: "APPROVE", parameters: {} }],
            },
            {
                accountId,
                name: "Conversion Quality Check",
                description: "Validates conversion quality and legitimacy",
                conditions: [
                    {
                        field: "conversion_time",
                        operator: "GREATER_THAN",
                        value: 60,
                        weight: 1,
                    },
                    {
                        field: "conversion_value",
                        operator: "GREATER_THAN",
                        value: 0,
                        weight: 1,
                    },
                    {
                        field: "customer_info_complete",
                        operator: "EQUALS",
                        value: true,
                        weight: 1,
                    },
                ],
                actions: [{ type: "APPROVE", parameters: {} }],
            },
            {
                accountId,
                name: "Affiliate Quality Check",
                description: "Monitors affiliate performance and compliance",
                conditions: [
                    {
                        field: "conversion_rate",
                        operator: "GREATER_THAN",
                        value: 0.01,
                        weight: 1,
                    },
                    {
                        field: "complaint_count",
                        operator: "LESS_THAN",
                        value: 5,
                        weight: 1,
                    },
                    {
                        field: "compliance_score",
                        operator: "GREATER_THAN",
                        value: 0.8,
                        weight: 1,
                    },
                ],
                actions: [{ type: "APPROVE", parameters: {} }],
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
exports.QualityControlModel = QualityControlModel;
//# sourceMappingURL=QualityControl.js.map