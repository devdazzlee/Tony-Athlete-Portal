"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingLinksModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class TrackingLinksModel {
    static async create(data) {
        const trackingUrl = await this.generateTrackingUrl(data.accountId, data.affiliateId, data.offerId);
        const result = await prisma.trackingLink.create({
            data: {
                accountId: data.accountId,
                affiliateId: data.affiliateId,
                offerId: data.offerId,
                name: data.name,
                description: data.description || "",
                originalUrl: data.originalUrl,
                trackingUrl,
                shortCode: data.shortCode || Math.random().toString(36).substring(2, 8),
                type: data.type || "STANDARD",
                status: data.status || "ACTIVE",
                settings: (data.settings || {
                    clickTracking: true,
                    conversionTracking: true,
                    fraudDetection: false,
                    geoBlocking: false,
                    deviceFiltering: false,
                    timeFiltering: false,
                    ipFiltering: false,
                    referrerFiltering: false,
                    customFilters: [],
                    redirectDelay: 0,
                    redirectMethod: "IMMEDIATE",
                    landingPage: data.originalUrl,
                    trackingPixels: [],
                    postbackUrls: [],
                }),
                parameters: (data.parameters || []),
                rules: (data.rules || []),
                stats: {
                    totalClicks: 0,
                    uniqueClicks: 0,
                    conversions: 0,
                    revenue: 0,
                    commission: 0,
                    conversionRate: 0,
                    byCountry: {},
                    byDevice: {},
                    bySource: {},
                    byHour: {},
                    byDay: {},
                },
            },
        });
        return result;
    }
    static async findById(id) {
        return await prisma.trackingLink.findUnique({
            where: { id },
        });
    }
    static async findByTrackingUrl(trackingUrl) {
        return await prisma.trackingLink.findFirst({
            where: {
                trackingUrl,
                status: "ACTIVE",
            },
        });
    }
    static async update(id, data) {
        return await prisma.trackingLink.update({
            where: { id },
            data: {
                ...data,
                settings: data.settings,
                parameters: data.parameters,
                rules: data.rules,
                stats: data.stats,
                updatedAt: new Date(),
            },
        });
    }
    static async delete(id) {
        await prisma.trackingLink.delete({
            where: { id },
        });
    }
    static async list(accountId, filters = {}) {
        const where = { accountId };
        if (filters.status)
            where.status = filters.status;
        if (filters.type)
            where.type = filters.type;
        if (filters.affiliateId)
            where.affiliateId = filters.affiliateId;
        if (filters.offerId)
            where.offerId = filters.offerId;
        return await prisma.trackingLink.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });
    }
    static async processClick(trackingUrl, clickData) {
        const trackingLink = await this.findByTrackingUrl(trackingUrl);
        if (!trackingLink) {
            return { redirect: false, reason: "Tracking link not found" };
        }
        if (trackingLink.status !== "ACTIVE") {
            return { redirect: false, reason: "Tracking link is not active" };
        }
        const filterResult = await this.applyFilters(trackingLink, clickData);
        if (!filterResult.allowed) {
            return { redirect: false, reason: filterResult.reason };
        }
        const ruleResult = await this.applyRules(trackingLink, clickData);
        if (trackingLink.settings.clickTracking) {
            await this.recordClick(trackingLink.id, clickData);
        }
        if (trackingLink.settings.trackingPixels) {
            await this.fireTrackingPixels(trackingLink.settings.trackingPixels, clickData);
        }
        let redirectUrl = ruleResult.redirectUrl || trackingLink.settings.landingPage;
        redirectUrl = this.addTrackingParameters(redirectUrl, trackingLink, clickData);
        return { redirect: true, url: redirectUrl };
    }
    static async applyFilters(trackingLink, clickData) {
        const settings = trackingLink.settings;
        if (settings.geoBlocking) {
            const country = clickData.country;
            if (country && this.isCountryBlocked(country)) {
                return { allowed: false, reason: "Country blocked" };
            }
        }
        if (settings.deviceFiltering) {
            const device = clickData.device;
            if (device && this.isDeviceBlocked(device)) {
                return { allowed: false, reason: "Device blocked" };
            }
        }
        if (settings.timeFiltering) {
            const hour = new Date().getHours();
            if (this.isTimeBlocked(hour)) {
                return { allowed: false, reason: "Time blocked" };
            }
        }
        if (settings.ipFiltering) {
            const ipAddress = clickData.ipAddress;
            if (ipAddress && this.isIPBlocked(ipAddress)) {
                return { allowed: false, reason: "IP blocked" };
            }
        }
        if (settings.referrerFiltering) {
            const referrer = clickData.referrer;
            if (referrer && this.isReferrerBlocked(referrer)) {
                return { allowed: false, reason: "Referrer blocked" };
            }
        }
        for (const filter of settings.customFilters) {
            if (!filter.enabled)
                continue;
            const conditionResult = this.evaluateConditions(filter.conditions, clickData);
            if (conditionResult) {
                switch (filter.action) {
                    case "BLOCK":
                        return {
                            allowed: false,
                            reason: `Blocked by filter: ${filter.name}`,
                        };
                    case "REDIRECT":
                        return {
                            allowed: true,
                            reason: `Redirected by filter: ${filter.name}`,
                        };
                }
            }
        }
        return { allowed: true };
    }
    static async applyRules(trackingLink, clickData) {
        const rules = trackingLink.rules.sort((a, b) => b.priority - a.priority);
        for (const rule of rules) {
            if (!rule.enabled)
                continue;
            const conditionResult = this.evaluateConditions(rule.conditions, clickData);
            if (conditionResult) {
                for (const action of rule.actions) {
                    if (!action.enabled)
                        continue;
                    switch (action.type) {
                        case "REDIRECT":
                            return { redirectUrl: action.parameters.url };
                        case "BLOCK":
                            return { redirectUrl: undefined };
                        case "MODIFY_URL":
                            break;
                        case "ADD_PARAMETER":
                            break;
                        case "REMOVE_PARAMETER":
                            break;
                    }
                }
            }
        }
        return {};
    }
    static evaluateConditions(conditions, data) {
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
            case "REGEX":
                try {
                    const regex = new RegExp(condition.value);
                    return regex.test(String(value));
                }
                catch {
                    return false;
                }
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
    static isCountryBlocked(country) {
        const blockedCountries = ["XX", "YY"];
        return blockedCountries.includes(country);
    }
    static isDeviceBlocked(device) {
        const blockedDevices = ["bot", "crawler"];
        return blockedDevices.includes(device.toLowerCase());
    }
    static isTimeBlocked(hour) {
        return hour < 6 || hour > 22;
    }
    static isIPBlocked(ipAddress) {
        return false;
    }
    static isReferrerBlocked(referrer) {
        const blockedReferrers = ["spam.com", "malicious.com"];
        return blockedReferrers.some((blocked) => referrer.includes(blocked));
    }
    static async recordClick(trackingLinkId, clickData) {
        return (await prisma.clickEvent.create({
            data: {
                trackingLinkId,
                affiliateId: clickData.affiliateId,
                offerId: clickData.offerId,
                ipAddress: clickData.ipAddress,
                userAgent: clickData.userAgent,
                referrer: clickData.referrer,
                country: clickData.country,
                city: clickData.city,
                device: clickData.device,
                browser: clickData.browser,
                os: clickData.os,
                timestamp: new Date(),
                data: clickData,
            },
        }));
    }
    static async fireTrackingPixels(pixels, clickData) {
        for (const pixel of pixels) {
            if (!pixel.enabled)
                continue;
            if (pixel.position === "BEFORE_REDIRECT") {
                await this.firePixel(pixel, clickData);
            }
        }
    }
    static async firePixel(pixel, data) {
        let url = pixel.url;
        for (const [key, value] of Object.entries(pixel.parameters)) {
            const placeholder = `{{${key}}}`;
            url = url.replace(new RegExp(placeholder, "g"), String(data[key] || value));
        }
        console.log(`Firing pixel: ${url}`);
    }
    static addTrackingParameters(url, trackingLink, clickData) {
        const urlObj = new URL(url);
        for (const param of trackingLink.parameters) {
            let value = param.value;
            switch (param.type) {
                case "DYNAMIC":
                    value =
                        this.getFieldValue(clickData, param.name) ||
                            param.defaultValue ||
                            "";
                    break;
                case "AFFILIATE":
                    value = clickData.affiliateId || "";
                    break;
                case "OFFER":
                    value = clickData.offerId || "";
                    break;
                case "CUSTOM":
                    value = this.evaluateCustomParameter(param.value, clickData);
                    break;
            }
            if (value) {
                urlObj.searchParams.set(param.name, value);
            }
        }
        return urlObj.toString();
    }
    static evaluateCustomParameter(formula, data) {
        let result = formula;
        for (const [key, value] of Object.entries(data)) {
            const placeholder = `{{${key}}}`;
            result = result.replace(new RegExp(placeholder, "g"), String(value));
        }
        return result;
    }
    static async recordConversion(trackingLinkId, conversionData) {
        const trackingLink = await this.findById(trackingLinkId);
        if (!trackingLink) {
            throw new Error("Tracking link not found");
        }
        const clickEvent = await prisma.clickEvent.findFirst({
            where: {
                trackingLinkId,
                affiliateId: conversionData.affiliateId,
                offerId: conversionData.offerId,
            },
            orderBy: { timestamp: "desc" },
        });
        if (!clickEvent) {
            throw new Error("Click event not found");
        }
        const conversionEvent = (await prisma.conversionEvent.create({
            data: {
                trackingLinkId,
                clickEventId: clickEvent.id,
                affiliateId: conversionData.affiliateId,
                offerId: conversionData.offerId,
                value: conversionData.value || 0,
                commission: conversionData.commission || 0,
                timestamp: new Date(),
                data: conversionData,
            },
        }));
        await this.updateStats(trackingLinkId);
        if (trackingLink.settings.postbackUrls) {
            await this.firePostbacks(trackingLink.settings.postbackUrls, conversionData);
        }
        return conversionEvent;
    }
    static async updateStats(trackingLinkId) {
        const trackingLink = await this.findById(trackingLinkId);
        if (!trackingLink)
            return;
        const totalClicks = await prisma.clickEvent.count({
            where: { trackingLinkId },
        });
        const uniqueClicks = await prisma.clickEvent
            .groupBy({
            by: ["ipAddress"],
            where: { trackingLinkId },
        })
            .then((result) => result.length);
        const conversions = await prisma.conversionEvent.count({
            where: { trackingLinkId },
        });
        const revenue = await prisma.conversionEvent.aggregate({
            where: { trackingLinkId },
            _sum: { value: true },
        });
        const commission = await prisma.conversionEvent.aggregate({
            where: { trackingLinkId },
            _sum: { commission: true },
        });
        const stats = {
            ...trackingLink.stats,
            totalClicks,
            uniqueClicks,
            conversions,
            revenue: revenue._sum.value || 0,
            commission: commission._sum.commission || 0,
            conversionRate: totalClicks > 0 ? (conversions / totalClicks) * 100 : 0,
        };
        await this.update(trackingLinkId, { stats: stats });
    }
    static async firePostbacks(postbacks, data) {
        for (const postback of postbacks) {
            if (!postback.enabled)
                continue;
            let url = postback.url;
            for (const [key, value] of Object.entries(postback.parameters)) {
                const placeholder = `{{${key}}}`;
                url = url.replace(new RegExp(placeholder, "g"), String(data[key] || value));
            }
            console.log(`Firing postback: ${url}`);
        }
    }
    static async generateTrackingUrl(accountId, affiliateId, offerId) {
        const baseUrl = process.env.TRACKING_BASE_URL || "https://track.example.com";
        const path = `/${accountId}/${affiliateId}/${offerId}`;
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `${baseUrl}${path}/${timestamp}-${random}`;
    }
    static async generateShortUrl(trackingUrl) {
        const shortCode = Math.random().toString(36).substring(2, 8);
        const baseUrl = process.env.SHORT_URL_BASE || "https://short.example.com";
        return `${baseUrl}/${shortCode}`;
    }
    static async getTrackingStats(accountId, startDate, endDate) {
        const where = { accountId };
        if (startDate && endDate) {
            where.createdAt = {
                gte: startDate,
                lte: endDate,
            };
        }
        const trackingLinks = await this.list(accountId);
        const totalClicks = await prisma.clickEvent.count({
            where: { trackingLink: { accountId } },
        });
        const totalConversions = await prisma.conversionEvent.count({
            where: { trackingLink: { accountId } },
        });
        const stats = {
            totalLinks: trackingLinks.length,
            activeLinks: trackingLinks.filter((l) => l.status === "ACTIVE").length,
            totalClicks,
            totalConversions,
            totalRevenue: trackingLinks.reduce((sum, l) => sum + l.stats.revenue, 0),
            totalCommission: trackingLinks.reduce((sum, l) => sum + l.stats.commission, 0),
            byType: {},
            byStatus: {},
            byAffiliate: {},
            byOffer: {},
        };
        trackingLinks.forEach((link) => {
            stats.byType[link.type] = (stats.byType[link.type] || 0) + 1;
            stats.byStatus[link.status] = (stats.byStatus[link.status] || 0) + 1;
            if (!stats.byAffiliate[link.affiliateId]) {
                stats.byAffiliate[link.affiliateId] = {
                    links: 0,
                    clicks: 0,
                    conversions: 0,
                    revenue: 0,
                };
            }
            stats.byAffiliate[link.affiliateId].links++;
            stats.byAffiliate[link.affiliateId].clicks += link.stats.totalClicks;
            stats.byAffiliate[link.affiliateId].conversions += link.stats.conversions;
            stats.byAffiliate[link.affiliateId].revenue += link.stats.revenue;
            if (!stats.byOffer[link.offerId]) {
                stats.byOffer[link.offerId] = {
                    links: 0,
                    clicks: 0,
                    conversions: 0,
                    revenue: 0,
                };
            }
            stats.byOffer[link.offerId].links++;
            stats.byOffer[link.offerId].clicks += link.stats.totalClicks;
            stats.byOffer[link.offerId].conversions += link.stats.conversions;
            stats.byOffer[link.offerId].revenue += link.stats.revenue;
        });
        return stats;
    }
    static async getTrackingLinksDashboard(accountId) {
        const links = await this.list(accountId);
        const stats = await this.getTrackingStats(accountId);
        return {
            links,
            stats,
        };
    }
}
exports.TrackingLinksModel = TrackingLinksModel;
//# sourceMappingURL=TrackingLinks.js.map