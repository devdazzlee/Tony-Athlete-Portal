"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnuraModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class AnuraModel {
    static async createConfig(data) {
        return (await prisma.anuraConfig.create({
            data: {
                accountId: "default",
                apiKey: data.apiKey,
                settings: data.settings ||
                    {
                        fraudThreshold: 0.7,
                        qualityThreshold: 0.5,
                        autoBlock: true,
                        notifyOnFraud: true,
                        notifyOnQuality: true,
                        customRules: [],
                    },
                isActive: data.enabled || false,
            },
        }));
    }
    static async getConfig() {
        return (await prisma.anuraConfig.findFirst({
            orderBy: { createdAt: "desc" },
        }));
    }
    static async updateConfig(id, data) {
        return (await prisma.anuraConfig.update({
            where: { id },
            data: data,
        }));
    }
    static async deleteConfig(id) {
        await prisma.anuraConfig.delete({
            where: { id },
        });
    }
    static async performAnuraCheck(data, ipAddress, userAgent, affiliateId, clickId, conversionId) {
        const config = await this.getConfig();
        if (!config || !config.enabled) {
            throw new Error("Anura is not configured or enabled");
        }
        const requestId = this.generateRequestId();
        const result = await this.callAnuraAPI(config, data, ipAddress, userAgent);
        const anuraCheck = (await prisma.anuraCheck.create({
            data: {
                affiliateId,
                clickId,
                result: result,
                score: 0.5,
                status: "COMPLETED",
            },
        }));
        return anuraCheck;
    }
    static async callAnuraAPI(config, data, ipAddress, userAgent) {
        try {
            const payload = {
                ip: ipAddress,
                user_agent: userAgent,
                referrer: data.referrer,
                country: data.country,
                device: data.device,
                browser: data.browser,
                os: data.os,
                timestamp: new Date().toISOString(),
                custom_data: data,
            };
            const response = await fetch(`${config.endpoint}/check`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${config.apiKey}`,
                    "X-API-Secret": config.apiSecret,
                },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                throw new Error(`Anura API error: ${response.status} ${response.statusText}`);
            }
            const anuraResponse = await response.json();
            return {
                fraudScore: anuraResponse.fraud_score || 0,
                qualityScore: anuraResponse.quality_score || 0,
                riskLevel: this.calculateRiskLevel(anuraResponse.fraud_score, anuraResponse.quality_score),
                recommendations: anuraResponse.recommendations || [],
                blocked: this.shouldBlock(anuraResponse, config.settings),
                reason: anuraResponse.reason,
                details: anuraResponse,
            };
        }
        catch (error) {
            return {
                fraudScore: 0.5,
                qualityScore: 0.5,
                riskLevel: "MEDIUM",
                recommendations: ["API call failed, manual review recommended"],
                blocked: false,
                reason: "API error",
                details: { error: error.message },
            };
        }
    }
    static calculateRiskLevel(fraudScore, qualityScore) {
        const combinedScore = (fraudScore + (1 - qualityScore)) / 2;
        if (combinedScore >= 0.8)
            return "CRITICAL";
        if (combinedScore >= 0.6)
            return "HIGH";
        if (combinedScore >= 0.4)
            return "MEDIUM";
        return "LOW";
    }
    static shouldBlock(anuraResponse, settings) {
        if (!settings.autoBlock)
            return false;
        const fraudScore = anuraResponse.fraud_score || 0;
        const qualityScore = anuraResponse.quality_score || 0;
        return (fraudScore >= settings.fraudThreshold ||
            qualityScore <= settings.qualityThreshold);
    }
    static generateRequestId() {
        return `anura_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    static async getAnuraChecks(filters = {}, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const where = {};
        if (filters.type)
            where.type = filters.type;
        if (filters.affiliateId)
            where.affiliateId = filters.affiliateId;
        if (filters.riskLevel)
            where.result = { path: ["riskLevel"], equals: filters.riskLevel };
        if (filters.blocked)
            where.result = { path: ["blocked"], equals: filters.blocked };
        if (filters.startDate && filters.endDate) {
            where.timestamp = {
                gte: filters.startDate,
                lte: filters.endDate,
            };
        }
        return (await prisma.anuraCheck.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async getAnuraStats(startDate, endDate) {
        const where = {};
        if (startDate && endDate) {
            where.timestamp = {
                gte: startDate,
                lte: endDate,
            };
        }
        const checks = (await prisma.anuraCheck.findMany({
            where,
        }));
        const stats = {
            totalChecks: checks.length,
            fraudDetected: 0,
            qualityIssues: 0,
            blockedRequests: 0,
            allowedRequests: 0,
            averageFraudScore: 0,
            averageQualityScore: 0,
            byRiskLevel: {},
            byAffiliate: {},
            byHour: {},
        };
        let totalFraudScore = 0;
        let totalQualityScore = 0;
        checks.forEach((check) => {
            const result = check.result;
            if (result.fraudScore >= 0.7)
                stats.fraudDetected++;
            if (result.qualityScore <= 0.5)
                stats.qualityIssues++;
            if (result.blocked)
                stats.blockedRequests++;
            else
                stats.allowedRequests++;
            totalFraudScore += result.fraudScore;
            totalQualityScore += result.qualityScore;
            stats.byRiskLevel[result.riskLevel] =
                (stats.byRiskLevel[result.riskLevel] || 0) + 1;
            if (check.affiliateId) {
                if (!stats.byAffiliate[check.affiliateId]) {
                    stats.byAffiliate[check.affiliateId] = {
                        total: 0,
                        fraud: 0,
                        quality: 0,
                        blocked: 0,
                        name: "Unknown",
                    };
                }
                stats.byAffiliate[check.affiliateId].total++;
                if (result.fraudScore >= 0.7)
                    stats.byAffiliate[check.affiliateId].fraud++;
                if (result.qualityScore <= 0.5)
                    stats.byAffiliate[check.affiliateId].quality++;
                if (result.blocked)
                    stats.byAffiliate[check.affiliateId].blocked++;
            }
            const hour = check.timestamp?.getHours() || 0;
            if (!stats.byHour[hour]) {
                stats.byHour[hour] = { total: 0, fraud: 0, quality: 0, blocked: 0 };
            }
            stats.byHour[hour].total++;
            if (result.fraudScore >= 0.7)
                stats.byHour[hour].fraud++;
            if (result.qualityScore <= 0.5)
                stats.byHour[hour].quality++;
            if (result.blocked)
                stats.byHour[hour].blocked++;
        });
        stats.averageFraudScore =
            checks.length > 0 ? totalFraudScore / checks.length : 0;
        stats.averageQualityScore =
            checks.length > 0 ? totalQualityScore / checks.length : 0;
        return stats;
    }
    static async updateAnuraSettings(settings) {
        const config = await this.getConfig();
        if (!config) {
            throw new Error("Anura configuration not found");
        }
        return await this.updateConfig(config.id, {
            settings: { ...config.settings, ...settings },
        });
    }
    static async testAnuraConnection() {
        const config = await this.getConfig();
        if (!config) {
            return false;
        }
        try {
            const response = await fetch(`${config.endpoint}/health`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    "X-API-Secret": config.apiSecret,
                },
            });
            return response.ok;
        }
        catch {
            return false;
        }
    }
    static async createCustomRule(rule) {
        const config = await this.getConfig();
        if (!config) {
            throw new Error("Anura configuration not found");
        }
        const customRules = [...config.settings.customRules, rule];
        return await this.updateConfig(config.id, {
            settings: { ...config.settings, customRules },
        });
    }
    static async removeCustomRule(ruleName) {
        const config = await this.getConfig();
        if (!config) {
            throw new Error("Anura configuration not found");
        }
        const customRules = config.settings.customRules.filter((rule) => rule.name !== ruleName);
        return await this.updateConfig(config.id, {
            settings: { ...config.settings, customRules },
        });
    }
}
exports.AnuraModel = AnuraModel;
//# sourceMappingURL=Anura.js.map