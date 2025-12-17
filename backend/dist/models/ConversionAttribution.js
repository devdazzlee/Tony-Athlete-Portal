"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversionAttributionModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ConversionAttributionModel {
    static async createModel(data) {
        const result = await prisma.attributionModel.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                type: data.type,
                settings: (data.settings || {
                    lookbackWindow: 30,
                    clickLookbackWindow: 30,
                    conversionLookbackWindow: 30,
                    includeDirectTraffic: true,
                    includeOrganicTraffic: true,
                    includePaidTraffic: true,
                    includeSocialTraffic: true,
                    includeEmailTraffic: true,
                    includeReferralTraffic: true,
                    customParameters: {},
                }),
                rules: (data.rules || []),
                status: data.status || "ACTIVE",
                isDefault: data.isDefault || false,
            },
        });
        return result;
    }
    static async findModelById(id) {
        const result = await prisma.attributionModel.findUnique({
            where: { id },
        });
        return result;
    }
    static async updateModel(id, data) {
        const result = await prisma.attributionModel.update({
            where: { id },
            data: {
                ...data,
                settings: data.settings,
                rules: data.rules,
                updatedAt: new Date(),
            },
        });
        return result;
    }
    static async deleteModel(id) {
        await prisma.attributionModel.delete({
            where: { id },
        });
    }
    static async listModels(accountId, filters = {}) {
        const where = { accountId };
        if (filters.status)
            where.status = filters.status;
        if (filters.type)
            where.type = filters.type;
        if (filters.isDefault !== undefined)
            where.isDefault = filters.isDefault;
        const results = await prisma.attributionModel.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });
        return results;
    }
    static async calculateAttribution(conversionId, modelId) {
        const model = await this.findModelById(modelId);
        if (!model) {
            throw new Error("Attribution model not found");
        }
        const conversion = await prisma.conversion.findUnique({
            where: { id: conversionId },
            include: {
                click: true,
                offer: true,
            },
        });
        if (!conversion) {
            throw new Error("Conversion not found");
        }
        const attributionPath = await this.getAttributionPath(conversion, model);
        const credits = this.calculateCredits(attributionPath, model);
        const events = [];
        for (let i = 0; i < attributionPath.length; i++) {
            const click = attributionPath[i];
            const credit = credits[i];
            const event = (await prisma.attributionEvent.create({
                data: {
                    conversionId,
                    clickId: click.id,
                    affiliateId: click.affiliateId,
                    offerId: conversion.offerId,
                    credit,
                    weight: credit / (conversion.commissionAmount || 1),
                    position: i + 1,
                    timestamp: click.createdAt,
                    data: {
                        modelType: model.type,
                        clickData: click,
                    },
                },
            }));
            events.push(event);
        }
        return events;
    }
    static async getAttributionPath(conversion, model) {
        const settings = model.settings;
        const lookbackDate = new Date(conversion.createdAt.getTime() -
            settings.lookbackWindow * 24 * 60 * 60 * 1000);
        const clicks = await prisma.click.findMany({
            where: {
                userId: conversion.userId,
                createdAt: {
                    gte: lookbackDate,
                    lte: conversion.createdAt,
                },
            },
            orderBy: { createdAt: "asc" },
        });
        return this.filterClicks(clicks, settings);
    }
    static filterClicks(clicks, settings) {
        return clicks.filter((click) => {
            if (!settings.includeDirectTraffic && click.source === "direct")
                return false;
            if (!settings.includeOrganicTraffic && click.source === "organic")
                return false;
            if (!settings.includePaidTraffic && click.source === "paid")
                return false;
            if (!settings.includeSocialTraffic && click.source === "social")
                return false;
            if (!settings.includeEmailTraffic && click.source === "email")
                return false;
            if (!settings.includeReferralTraffic && click.source === "referral")
                return false;
            return true;
        });
    }
    static calculateCredits(attributionPath, model) {
        const totalClicks = attributionPath.length;
        if (totalClicks === 0)
            return [];
        const credits = [];
        switch (model.type) {
            case "FIRST_CLICK":
                credits[0] = 1;
                for (let i = 1; i < totalClicks; i++) {
                    credits[i] = 0;
                }
                break;
            case "LAST_CLICK":
                for (let i = 0; i < totalClicks - 1; i++) {
                    credits[i] = 0;
                }
                credits[totalClicks - 1] = 1;
                break;
            case "LINEAR":
                const linearCredit = 1 / totalClicks;
                for (let i = 0; i < totalClicks; i++) {
                    credits[i] = linearCredit;
                }
                break;
            case "TIME_DECAY":
                const decayFactor = 0.5;
                let totalWeight = 0;
                for (let i = 0; i < totalClicks; i++) {
                    const weight = Math.pow(decayFactor, totalClicks - 1 - i);
                    credits[i] = weight;
                    totalWeight += weight;
                }
                for (let i = 0; i < totalClicks; i++) {
                    credits[i] = credits[i] / totalWeight;
                }
                break;
            case "POSITION_BASED":
                const firstLastWeight = 0.4;
                const middleWeight = 0.2;
                if (totalClicks === 1) {
                    credits[0] = 1;
                }
                else if (totalClicks === 2) {
                    credits[0] = firstLastWeight;
                    credits[1] = firstLastWeight;
                }
                else {
                    credits[0] = firstLastWeight;
                    credits[totalClicks - 1] = firstLastWeight;
                    const middleCredit = middleWeight / (totalClicks - 2);
                    for (let i = 1; i < totalClicks - 1; i++) {
                        credits[i] = middleCredit;
                    }
                }
                break;
            case "CUSTOM":
                return this.applyCustomRules(attributionPath, model.rules);
            default:
                for (let i = 0; i < totalClicks - 1; i++) {
                    credits[i] = 0;
                }
                credits[totalClicks - 1] = 1;
        }
        return credits;
    }
    static applyCustomRules(attributionPath, rules) {
        const credits = new Array(attributionPath.length).fill(0);
        for (const rule of rules) {
            if (!rule.enabled)
                continue;
            for (let i = 0; i < attributionPath.length; i++) {
                const click = attributionPath[i];
                const conditionsMet = this.evaluateRuleConditions(rule.conditions, click);
                if (conditionsMet) {
                    for (const action of rule.actions) {
                        if (!action.enabled)
                            continue;
                        switch (action.type) {
                            case "ASSIGN_CREDIT":
                                credits[i] = action.parameters.credit || 0;
                                break;
                            case "MODIFY_CREDIT":
                                credits[i] *= action.parameters.multiplier || 1;
                                break;
                            case "EXCLUDE":
                                credits[i] = 0;
                                break;
                            case "INCLUDE":
                                credits[i] = action.parameters.credit || 1;
                                break;
                        }
                    }
                }
            }
        }
        const total = credits.reduce((sum, credit) => sum + credit, 0);
        if (total > 0) {
            for (let i = 0; i < credits.length; i++) {
                credits[i] = credits[i] / total;
            }
        }
        return credits;
    }
    static evaluateRuleConditions(conditions, data) {
        if (conditions.length === 0)
            return true;
        let result = true;
        let logic = "AND";
        for (const condition of conditions) {
            const conditionResult = this.evaluateCondition(condition, data);
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
    static evaluateCondition(condition, data) {
        const value = this.getFieldValue(data, condition.field);
        switch (condition.operator) {
            case "EQUALS":
                return value === condition.value;
            case "NOT_EQUALS":
                return value !== condition.value;
            case "CONTAINS":
                return String(value).includes(String(condition.value));
            case "GREATER_THAN":
                return Number(value) > Number(condition.value);
            case "LESS_THAN":
                return Number(value) < Number(condition.value);
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
    static async createReport(data) {
        const result = await prisma.attributionReport.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                modelId: data.modelId,
                dateRange: data.dateRange,
                filters: (data.filters || []),
                metrics: data.metrics || ["conversions", "revenue", "commissions"],
                dimensions: data.dimensions || ["affiliate", "offer", "channel"],
                status: "PENDING",
                results: {
                    totalConversions: 0,
                    totalRevenue: 0,
                    totalCommissions: 0,
                    byAffiliate: {},
                    byOffer: {},
                    byChannel: {},
                    byDevice: {},
                    byCountry: {},
                    timeline: [],
                    attributionPath: [],
                },
            },
        });
        return result;
    }
    static async findReportById(id) {
        const result = await prisma.attributionReport.findUnique({
            where: { id },
        });
        return result;
    }
    static async updateReport(id, data) {
        const result = await prisma.attributionReport.update({
            where: { id },
            data: {
                ...data,
                dateRange: data.dateRange,
                filters: data.filters,
                results: data.results,
                updatedAt: new Date(),
            },
        });
        return result;
    }
    static async deleteReport(id) {
        await prisma.attributionReport.delete({
            where: { id },
        });
    }
    static async listReports(accountId, filters = {}) {
        const where = { accountId };
        if (filters.status)
            where.status = filters.status;
        if (filters.modelId)
            where.modelId = filters.modelId;
        const results = await prisma.attributionReport.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });
        return results;
    }
    static async generateReport(reportId) {
        const report = await this.findReportById(reportId);
        if (!report) {
            throw new Error("Report not found");
        }
        await this.updateReport(reportId, { status: "PROCESSING" });
        try {
            const results = await this.calculateReportResults(report);
            const updatedReport = await this.updateReport(reportId, {
                status: "COMPLETED",
                results,
                completedAt: new Date(),
            });
            return updatedReport;
        }
        catch (error) {
            await this.updateReport(reportId, {
                status: "FAILED",
            });
            throw error;
        }
    }
    static async calculateReportResults(report) {
        const { dateRange, modelId, filters } = report;
        const conversions = await prisma.conversion.findMany({
            where: {
                createdAt: {
                    gte: dateRange.startDate,
                    lte: dateRange.endDate,
                },
            },
            include: {
                click: true,
                offer: true,
            },
        });
        const attributionEvents = [];
        for (const conversion of conversions) {
            const events = await this.calculateAttribution(conversion.id, modelId);
            attributionEvents.push(...events);
        }
        const results = {
            totalConversions: conversions.length,
            totalRevenue: conversions.reduce((sum, c) => sum + (c.orderValue || 0), 0),
            totalCommissions: conversions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0),
            byAffiliate: {},
            byOffer: {},
            byChannel: {},
            byDevice: {},
            byCountry: {},
            timeline: [],
            attributionPath: [],
        };
        for (const event of attributionEvents) {
            const click = event.data.clickData;
            const credit = event.credit;
            if (!results.byAffiliate[event.affiliateId]) {
                results.byAffiliate[event.affiliateId] = {
                    conversions: 0,
                    revenue: 0,
                    commissions: 0,
                };
            }
            results.byAffiliate[event.affiliateId].conversions += credit;
            results.byAffiliate[event.affiliateId].revenue +=
                credit * (click.orderValue || 0);
            results.byAffiliate[event.affiliateId].commissions +=
                credit * (click.commissionAmount || 0);
            if (!results.byOffer[event.offerId]) {
                results.byOffer[event.offerId] = {
                    conversions: 0,
                    revenue: 0,
                    commissions: 0,
                };
            }
            results.byOffer[event.offerId].conversions += credit;
            results.byOffer[event.offerId].revenue +=
                credit * (click.orderValue || 0);
            results.byOffer[event.offerId].commissions +=
                credit * (click.commissionAmount || 0);
            const channel = click.source || "unknown";
            if (!results.byChannel[channel]) {
                results.byChannel[channel] = {
                    conversions: 0,
                    revenue: 0,
                    commissions: 0,
                };
            }
            results.byChannel[channel].conversions += credit;
            results.byChannel[channel].revenue += credit * (click.orderValue || 0);
            results.byChannel[channel].commissions +=
                credit * (click.commissionAmount || 0);
            const device = click.device || "unknown";
            if (!results.byDevice[device]) {
                results.byDevice[device] = {
                    conversions: 0,
                    revenue: 0,
                    commissions: 0,
                };
            }
            results.byDevice[device].conversions += credit;
            results.byDevice[device].revenue += credit * (click.orderValue || 0);
            results.byDevice[device].commissions +=
                credit * (click.commissionAmount || 0);
            const country = click.country || "unknown";
            if (!results.byCountry[country]) {
                results.byCountry[country] = {
                    conversions: 0,
                    revenue: 0,
                    commissions: 0,
                };
            }
            results.byCountry[country].conversions += credit;
            results.byCountry[country].revenue += credit * (click.orderValue || 0);
            results.byCountry[country].commissions +=
                credit * (click.commissionAmount || 0);
        }
        const timelineMap = new Map();
        for (const conversion of conversions) {
            const date = conversion.createdAt.toISOString().split("T")[0];
            if (!timelineMap.has(date)) {
                timelineMap.set(date, { conversions: 0, revenue: 0 });
            }
            const dayData = timelineMap.get(date);
            dayData.conversions += 1;
            dayData.revenue += conversion.orderValue || 0;
        }
        results.timeline = Array.from(timelineMap.entries()).map(([date, data]) => ({
            date,
            ...data,
        }));
        const pathMap = new Map();
        for (const event of attributionEvents) {
            const position = event.position;
            const channel = event.data.clickData.source || "unknown";
            if (!pathMap.has(position)) {
                pathMap.set(position, { channel, conversions: 0 });
            }
            pathMap.get(position).conversions += event.credit;
        }
        results.attributionPath = Array.from(pathMap.entries()).map(([step, data]) => ({
            step,
            ...data,
            percentage: (data.conversions / results.totalConversions) * 100,
        }));
        return results;
    }
    static async getAttributionStats(accountId) {
        const models = await this.listModels(accountId);
        const reports = await this.listReports(accountId);
        const stats = {
            totalModels: models.length,
            activeModels: models.filter((m) => m.status === "ACTIVE").length,
            totalReports: reports.length,
            completedReports: reports.filter((r) => r.status === "COMPLETED").length,
            byType: {},
            byStatus: {},
        };
        models.forEach((model) => {
            stats.byType[model.type] = (stats.byType[model.type] || 0) + 1;
            stats.byStatus[model.status] = (stats.byStatus[model.status] || 0) + 1;
        });
        return stats;
    }
    static async createDefaultModels(accountId) {
        const defaultModels = [
            {
                name: "Last Click Attribution",
                description: "Gives 100% credit to the last click before conversion",
                type: "LAST_CLICK",
                settings: {
                    lookbackWindow: 30,
                    clickLookbackWindow: 30,
                    conversionLookbackWindow: 30,
                    includeDirectTraffic: true,
                    includeOrganicTraffic: true,
                    includePaidTraffic: true,
                    includeSocialTraffic: true,
                    includeEmailTraffic: true,
                    includeReferralTraffic: true,
                    customParameters: {},
                },
                isDefault: true,
            },
            {
                name: "First Click Attribution",
                description: "Gives 100% credit to the first click in the conversion path",
                type: "FIRST_CLICK",
                settings: {
                    lookbackWindow: 30,
                    clickLookbackWindow: 30,
                    conversionLookbackWindow: 30,
                    includeDirectTraffic: true,
                    includeOrganicTraffic: true,
                    includePaidTraffic: true,
                    includeSocialTraffic: true,
                    includeEmailTraffic: true,
                    includeReferralTraffic: true,
                    customParameters: {},
                },
                isDefault: false,
            },
            {
                name: "Linear Attribution",
                description: "Distributes credit equally across all touchpoints",
                type: "LINEAR",
                settings: {
                    lookbackWindow: 30,
                    clickLookbackWindow: 30,
                    conversionLookbackWindow: 30,
                    includeDirectTraffic: true,
                    includeOrganicTraffic: true,
                    includePaidTraffic: true,
                    includeSocialTraffic: true,
                    includeEmailTraffic: true,
                    includeReferralTraffic: true,
                    customParameters: {},
                },
                isDefault: false,
            },
            {
                name: "Time Decay Attribution",
                description: "Gives more credit to clicks closer to the conversion",
                type: "TIME_DECAY",
                settings: {
                    lookbackWindow: 30,
                    clickLookbackWindow: 30,
                    conversionLookbackWindow: 30,
                    includeDirectTraffic: true,
                    includeOrganicTraffic: true,
                    includePaidTraffic: true,
                    includeSocialTraffic: true,
                    includeEmailTraffic: true,
                    includeReferralTraffic: true,
                    customParameters: {},
                },
                isDefault: false,
            },
        ];
        const createdModels = [];
        for (const modelData of defaultModels) {
            const model = await this.createModel({
                accountId,
                ...modelData,
            });
            createdModels.push(model);
        }
        return createdModels;
    }
    static async getConversionAttributionDashboard(accountId) {
        const models = await this.listModels(accountId);
        const reports = await this.listReports(accountId);
        const stats = await this.getAttributionStats(accountId);
        return {
            models,
            reports,
            stats,
        };
    }
}
exports.ConversionAttributionModel = ConversionAttributionModel;
//# sourceMappingURL=ConversionAttribution.js.map