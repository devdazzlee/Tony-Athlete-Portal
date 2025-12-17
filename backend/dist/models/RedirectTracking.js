"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedirectTrackingModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class RedirectTrackingModel {
    static async createRule(data) {
        return (await prisma.redirectRule.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                sourceUrl: data.sourceUrl,
                targetUrl: data.targetUrl,
                type: data.type || "PERMANENT",
                status: data.status || "ACTIVE",
                conditions: (data.conditions || []),
                settings: (data.settings || {
                    preserveQueryParams: true,
                    preserveHash: true,
                    addTrackingParams: true,
                    trackingParams: {},
                    redirectDelay: 0,
                    redirectMethod: "IMMEDIATE",
                    customHeaders: {},
                    customScripts: [],
                    analytics: {
                        enabled: true,
                        trackClicks: true,
                        trackConversions: false,
                        trackBounceRate: true,
                        trackTimeOnPage: true,
                        customEvents: [],
                        goals: [],
                    },
                    seo: {
                        preserveTitle: true,
                        preserveDescription: true,
                        preserveKeywords: true,
                    },
                }),
                stats: {
                    totalRedirects: 0,
                    uniqueRedirects: 0,
                    conversions: 0,
                    revenue: 0,
                    bounceRate: 0,
                    averageTimeOnPage: 0,
                    byCountry: {},
                    byDevice: {},
                    bySource: {},
                    byHour: {},
                    byDay: {},
                    byRule: {},
                },
            },
        }));
    }
    static async findRuleById(id) {
        return (await prisma.redirectRule.findUnique({
            where: { id },
        }));
    }
    static async findRuleBySourceUrl(accountId, sourceUrl) {
        return (await prisma.redirectRule.findFirst({
            where: {
                accountId,
                sourceUrl,
                status: "ACTIVE",
            },
        }));
    }
    static async updateRule(id, data) {
        return (await prisma.redirectRule.update({
            where: { id },
            data: {
                ...data,
                conditions: data.conditions,
                settings: data.settings,
                stats: data.stats,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteRule(id) {
        await prisma.redirectRule.delete({
            where: { id },
        });
    }
    static async listRules(accountId, filters = {}) {
        const where = { accountId };
        if (filters.status)
            where.status = filters.status;
        if (filters.type)
            where.type = filters.type;
        return (await prisma.redirectRule.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async processRedirect(sourceUrl, requestData) {
        const rule = await this.findMatchingRule(sourceUrl, requestData);
        if (!rule) {
            return { redirect: false, reason: "No matching redirect rule found" };
        }
        if (rule.status !== "ACTIVE") {
            return { redirect: false, reason: "Redirect rule is not active" };
        }
        const conditionResult = this.evaluateConditions(rule.conditions, requestData);
        if (!conditionResult) {
            return { redirect: false, reason: "Conditions not met" };
        }
        let targetUrl = rule.targetUrl;
        if (rule.settings.preserveQueryParams && requestData.queryParams) {
            const targetUrlObj = new URL(targetUrl);
            for (const [key, value] of Object.entries(requestData.queryParams)) {
                targetUrlObj.searchParams.set(key, value);
            }
            targetUrl = targetUrlObj.toString();
        }
        if (rule.settings.preserveHash && requestData.hash) {
            targetUrl += requestData.hash;
        }
        if (rule.settings.addTrackingParams) {
            targetUrl = this.addTrackingParameters(targetUrl, rule, requestData);
        }
        if (rule.settings.analytics.enabled &&
            rule.settings.analytics.trackClicks) {
            await this.recordRedirectEvent(rule.id, sourceUrl, targetUrl, requestData);
        }
        let statusCode = 302;
        if (rule.type === "PERMANENT") {
            statusCode = 301;
        }
        else if (rule.type === "TEMPORARY") {
            statusCode = 302;
        }
        return { redirect: true, targetUrl, statusCode };
    }
    static async findMatchingRule(sourceUrl, requestData) {
        let rule = await prisma.redirectRule.findFirst({
            where: {
                sourceUrl,
                status: "ACTIVE",
            },
            orderBy: { createdAt: "desc" },
        });
        if (rule) {
            return rule;
        }
        const rules = await prisma.redirectRule.findMany({
            where: {
                status: "ACTIVE",
            },
            orderBy: { createdAt: "desc" },
        });
        for (const r of rules) {
            if (this.matchesPattern(r.sourceUrl, sourceUrl)) {
                return r;
            }
        }
        return null;
    }
    static matchesPattern(pattern, url) {
        const regexPattern = pattern
            .replace(/\*/g, ".*")
            .replace(/\?/g, ".")
            .replace(/\./g, "\\.");
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(url);
    }
    static evaluateConditions(conditions, requestData) {
        if (conditions.length === 0)
            return true;
        let result = true;
        let logic = "AND";
        for (const condition of conditions) {
            const conditionResult = this.evaluateCondition(condition, requestData);
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
    static evaluateCondition(condition, requestData) {
        const value = this.getFieldValue(requestData, condition.field);
        const conditionValue = condition.value;
        let compareValue = value;
        let compareConditionValue = conditionValue;
        if (!condition.caseSensitive) {
            compareValue = String(value).toLowerCase();
            compareConditionValue = String(conditionValue).toLowerCase();
        }
        switch (condition.operator) {
            case "EQUALS":
                return compareValue === compareConditionValue;
            case "NOT_EQUALS":
                return compareValue !== compareConditionValue;
            case "CONTAINS":
                return String(compareValue).includes(String(compareConditionValue));
            case "STARTS_WITH":
                return String(compareValue).startsWith(String(compareConditionValue));
            case "ENDS_WITH":
                return String(compareValue).endsWith(String(compareConditionValue));
            case "REGEX":
                try {
                    const regex = new RegExp(conditionValue, condition.caseSensitive ? "" : "i");
                    return regex.test(String(value));
                }
                catch {
                    return false;
                }
            case "IN":
                return Array.isArray(conditionValue) && conditionValue.includes(value);
            case "NOT_IN":
                return Array.isArray(conditionValue) && !conditionValue.includes(value);
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
    static addTrackingParameters(targetUrl, rule, requestData) {
        const urlObj = new URL(targetUrl);
        for (const [key, value] of Object.entries(rule.settings.trackingParams)) {
            let paramValue = value;
            paramValue = paramValue.replace(/\{\{ip\}\}/g, requestData.ipAddress || "");
            paramValue = paramValue.replace(/\{\{userAgent\}\}/g, requestData.userAgent || "");
            paramValue = paramValue.replace(/\{\{referrer\}\}/g, requestData.referrer || "");
            paramValue = paramValue.replace(/\{\{country\}\}/g, requestData.country || "");
            paramValue = paramValue.replace(/\{\{device\}\}/g, requestData.device || "");
            paramValue = paramValue.replace(/\{\{timestamp\}\}/g, Date.now().toString());
            if (paramValue) {
                urlObj.searchParams.set(key, paramValue);
            }
        }
        return urlObj.toString();
    }
    static async recordRedirectEvent(ruleId, sourceUrl, targetUrl, requestData) {
        return (await prisma.redirectEvent.create({
            data: {
                redirectRuleId: ruleId,
                ruleId: ruleId,
                clickId: Math.random().toString(36).substring(2, 15),
                sourceUrl,
                targetUrl,
                ipAddress: requestData.ipAddress,
                userAgent: requestData.userAgent,
                referrer: requestData.referrer,
                country: requestData.country,
                city: requestData.city,
                device: requestData.device,
                browser: requestData.browser,
                os: requestData.os,
                queryParams: (requestData.queryParams || {}),
                headers: (requestData.headers || {}),
                timestamp: new Date(),
            },
        }));
    }
    static async recordConversion(redirectEventId, conversionData) {
        const redirectEvent = await prisma.redirectEvent.findUnique({
            where: { id: redirectEventId },
        });
        if (!redirectEvent) {
            throw new Error("Redirect event not found");
        }
        const conversionEvent = (await prisma.conversion.create({
            data: {
                clickId: redirectEvent.clickId,
                affiliateId: conversionData.affiliateId || "",
                offerId: conversionData.offerId || "",
                customerValue: conversionData.value || 0,
                orderValue: conversionData.value || 0,
                commissionAmount: conversionData.commission || 0,
                customerEmail: conversionData.email,
            },
        }));
        await this.updateRuleStats(redirectEvent.redirectRuleId);
        return conversionEvent;
    }
    static async recordBounce(redirectEventId, bounceData) {
        const redirectEvent = await prisma.redirectEvent.findUnique({
            where: { id: redirectEventId },
        });
        if (!redirectEvent) {
            throw new Error("Redirect event not found");
        }
        const bounceEvent = (await prisma.bounceEvent.create({
            data: {
                redirectEventId,
                timeOnPage: bounceData.timeOnPage || 0,
                pagesViewed: bounceData.pagesViewed || 1,
                exitPage: bounceData.exitPage,
                timestamp: new Date(),
                data: bounceData,
            },
        }));
        await this.updateRuleStats(redirectEvent.redirectRuleId);
        return bounceEvent;
    }
    static async updateRuleStats(ruleId) {
        const rule = await this.findRuleById(ruleId);
        if (!rule)
            return;
        const totalRedirects = await prisma.redirectEvent.count({
            where: { redirectRuleId: ruleId },
        });
        const uniqueRedirects = await prisma.redirectEvent
            .groupBy({
            by: ["ipAddress"],
            where: { redirectRuleId: ruleId },
        })
            .then((result) => result.length);
        const redirectEvents = await prisma.redirectEvent.findMany({
            where: { redirectRuleId: ruleId },
            select: { clickId: true },
        });
        const clickIds = redirectEvents.map((e) => e.clickId);
        const conversions = await prisma.conversion.count({
            where: {
                clickId: { in: clickIds },
            },
        });
        const revenue = await prisma.conversion.aggregate({
            where: {
                clickId: { in: clickIds },
            },
            _sum: { orderValue: true },
        });
        const bounces = await prisma.bounceEvent.count({
            where: {
                redirectEvent: {
                    redirectRuleId: ruleId,
                },
            },
        });
        const averageTimeOnPage = await prisma.bounceEvent.aggregate({
            where: {
                redirectEvent: {
                    redirectRuleId: ruleId,
                },
            },
            _avg: { timeOnPage: true },
        });
        const stats = {
            ...rule.stats,
            totalRedirects,
            uniqueRedirects,
            conversions,
            revenue: revenue._sum.orderValue || 0,
            bounceRate: totalRedirects > 0 ? (bounces / totalRedirects) * 100 : 0,
            averageTimeOnPage: averageTimeOnPage._avg.timeOnPage || 0,
        };
        await this.updateRule(ruleId, { stats });
    }
    static async getRedirectStats(accountId, startDate, endDate) {
        const where = { accountId };
        if (startDate && endDate) {
            where.createdAt = {
                gte: startDate,
                lte: endDate,
            };
        }
        const rules = await this.listRules(accountId);
        const totalRedirects = await prisma.redirectEvent.count({
            where: { redirectRuleId: { in: rules.map((r) => r.id) } },
        });
        const allRedirectEvents = await prisma.redirectEvent.findMany({
            where: { redirectRuleId: { in: rules.map((r) => r.id) } },
            select: { clickId: true },
        });
        const allClickIds = allRedirectEvents.map((e) => e.clickId);
        const totalConversions = await prisma.conversion.count({
            where: {
                clickId: { in: allClickIds },
            },
        });
        const stats = {
            totalRules: rules.length,
            activeRules: rules.filter((r) => r.status === "ACTIVE").length,
            totalRedirects,
            totalConversions,
            totalRevenue: rules.reduce((sum, r) => sum + r.stats.revenue, 0),
            averageBounceRate: rules.reduce((sum, r) => sum + r.stats.bounceRate, 0) /
                rules.length,
            byType: {},
            byStatus: {},
            byCountry: {},
            byDevice: {},
            bySource: {},
        };
        rules.forEach((rule) => {
            stats.byType[rule.type] = (stats.byType[rule.type] || 0) + 1;
            stats.byStatus[rule.status] = (stats.byStatus[rule.status] || 0) + 1;
        });
        const redirectEvents = await prisma.redirectEvent.findMany({
            where: { redirectRuleId: { in: rules.map((r) => r.id) } },
            select: { country: true, device: true, referrer: true },
        });
        redirectEvents.forEach((event) => {
            if (event.country) {
                stats.byCountry[event.country] =
                    (stats.byCountry[event.country] || 0) + 1;
            }
            if (event.device) {
                stats.byDevice[event.device] = (stats.byDevice[event.device] || 0) + 1;
            }
            if (event.referrer) {
                const source = this.extractSource(event.referrer);
                stats.bySource[source] = (stats.bySource[source] || 0) + 1;
            }
        });
        return stats;
    }
    static extractSource(referrer) {
        try {
            const url = new URL(referrer);
            return url.hostname;
        }
        catch {
            return "direct";
        }
    }
    static async getRedirectTrackingDashboard(accountId) {
        const rules = await this.listRules(accountId);
        const stats = await this.getRedirectStats(accountId);
        return {
            rules,
            stats,
        };
    }
    static async createDefaultRules(accountId) {
        const defaultRules = [
            {
                name: "HTTP to HTTPS Redirect",
                description: "Redirect all HTTP traffic to HTTPS",
                sourceUrl: "http://*",
                targetUrl: "https://*",
                type: "PERMANENT",
                conditions: [],
                settings: {
                    preserveQueryParams: true,
                    preserveHash: true,
                    addTrackingParams: false,
                    trackingParams: {},
                    redirectDelay: 0,
                    redirectMethod: "IMMEDIATE",
                    customHeaders: {},
                    customScripts: [],
                    analytics: {
                        enabled: true,
                        trackClicks: true,
                        trackConversions: false,
                        trackBounceRate: true,
                        trackTimeOnPage: true,
                        customEvents: [],
                        goals: [],
                    },
                    seo: {
                        preserveTitle: true,
                        preserveDescription: true,
                        preserveKeywords: true,
                    },
                },
            },
            {
                name: "WWW to Non-WWW Redirect",
                description: "Redirect www subdomain to main domain",
                sourceUrl: "https://www.*",
                targetUrl: "https://*",
                type: "PERMANENT",
                conditions: [],
                settings: {
                    preserveQueryParams: true,
                    preserveHash: true,
                    addTrackingParams: false,
                    trackingParams: {},
                    redirectDelay: 0,
                    redirectMethod: "IMMEDIATE",
                    customHeaders: {},
                    customScripts: [],
                    analytics: {
                        enabled: true,
                        trackClicks: true,
                        trackConversions: false,
                        trackBounceRate: true,
                        trackTimeOnPage: true,
                        customEvents: [],
                        goals: [],
                    },
                    seo: {
                        preserveTitle: true,
                        preserveDescription: true,
                        preserveKeywords: true,
                    },
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
}
exports.RedirectTrackingModel = RedirectTrackingModel;
//# sourceMappingURL=RedirectTracking.js.map