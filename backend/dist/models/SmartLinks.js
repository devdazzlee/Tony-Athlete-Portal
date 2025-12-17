"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartLinksModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class SmartLinksModel {
    static async create(data) {
        const shortCode = await this.generateShortCode(data.accountId);
        return (await prisma.smartLink.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                baseUrl: data.baseUrl,
                shortCode,
                type: data.type || "DYNAMIC",
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
                    trackingPixels: [],
                    postbackUrls: [],
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
                targets: (data.targets || []),
                rules: (data.rules || []),
                stats: {
                    totalClicks: 0,
                    uniqueClicks: 0,
                    conversions: 0,
                    revenue: 0,
                    commission: 0,
                    conversionRate: 0,
                    byTarget: {},
                    byCountry: {},
                    byDevice: {},
                    bySource: {},
                    byHour: {},
                    byDay: {},
                },
            },
        }));
    }
    static async findById(id) {
        return (await prisma.smartLink.findUnique({
            where: { id },
        }));
    }
    static async findByShortCode(shortCode) {
        return (await prisma.smartLink.findFirst({
            where: {
                shortCode,
                status: "ACTIVE",
            },
        }));
    }
    static async update(id, data) {
        return (await prisma.smartLink.update({
            where: { id },
            data: {
                ...data,
                settings: data.settings,
                targets: data.targets,
                rules: data.rules,
                stats: data.stats,
                updatedAt: new Date(),
            },
        }));
    }
    static async delete(id) {
        await prisma.smartLink.delete({
            where: { id },
        });
    }
    static async list(accountId, filters = {}) {
        const where = { accountId };
        if (filters.status)
            where.status = filters.status;
        if (filters.type)
            where.type = filters.type;
        return (await prisma.smartLink.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async processSmartLink(shortCode, requestData) {
        const smartLink = await this.findByShortCode(shortCode);
        if (!smartLink) {
            return { redirect: false, reason: "Smart link not found" };
        }
        if (smartLink.status !== "ACTIVE") {
            return { redirect: false, reason: "Smart link is not active" };
        }
        const filterResult = await this.applyFilters(smartLink, requestData);
        if (!filterResult.allowed) {
            return { redirect: false, reason: filterResult.reason };
        }
        const ruleResult = await this.applyRules(smartLink, requestData);
        if (ruleResult.blocked) {
            return { redirect: false, reason: ruleResult.reason };
        }
        const target = await this.selectTarget(smartLink, requestData);
        if (!target) {
            return { redirect: false, reason: "No suitable target found" };
        }
        if (smartLink.settings.clickTracking) {
            await this.recordClick(smartLink.id, target.id, requestData);
        }
        if (smartLink.settings.trackingPixels) {
            await this.fireTrackingPixels(smartLink.settings.trackingPixels, requestData);
        }
        let targetUrl = target.url;
        targetUrl = this.addTrackingParameters(targetUrl, smartLink, target, requestData);
        return { redirect: true, targetUrl, targetId: target.id };
    }
    static async applyFilters(smartLink, requestData) {
        const settings = smartLink.settings;
        if (settings.geoBlocking) {
            const country = requestData.country;
            if (country && this.isCountryBlocked(country)) {
                return { allowed: false, reason: "Country blocked" };
            }
        }
        if (settings.deviceFiltering) {
            const device = requestData.device;
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
            const ipAddress = requestData.ipAddress;
            if (ipAddress && this.isIPBlocked(ipAddress)) {
                return { allowed: false, reason: "IP blocked" };
            }
        }
        if (settings.referrerFiltering) {
            const referrer = requestData.referrer;
            if (referrer && this.isReferrerBlocked(referrer)) {
                return { allowed: false, reason: "Referrer blocked" };
            }
        }
        for (const filter of settings.customFilters) {
            if (!filter.enabled)
                continue;
            const conditionResult = this.evaluateConditions(filter.conditions, requestData);
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
    static async applyRules(smartLink, requestData) {
        const rules = smartLink.rules.sort((a, b) => b.priority - a.priority);
        for (const rule of rules) {
            if (!rule.enabled)
                continue;
            const conditionResult = this.evaluateConditions(rule.conditions, requestData);
            if (conditionResult) {
                for (const action of rule.actions) {
                    if (!action.enabled)
                        continue;
                    switch (action.type) {
                        case "BLOCK":
                            return { blocked: true, reason: `Blocked by rule: ${rule.name}` };
                        case "REDIRECT":
                            return {
                                blocked: false,
                                reason: `Redirected by rule: ${rule.name}`,
                            };
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
        return { blocked: false };
    }
    static async selectTarget(smartLink, requestData) {
        const activeTargets = smartLink.targets.filter((t) => t.isActive);
        if (activeTargets.length === 0) {
            return null;
        }
        const matchingTargets = activeTargets.filter((target) => {
            if (target.conditions.length === 0)
                return true;
            return this.evaluateConditions(target.conditions, requestData);
        });
        if (matchingTargets.length === 0) {
            return activeTargets.find((t) => t.isDefault) || null;
        }
        switch (smartLink.type) {
            case "A_B_TEST":
                return this.selectABTestTarget(matchingTargets, requestData);
            case "GEO_TARGETED":
                return this.selectGeoTargetedTarget(matchingTargets, requestData);
            case "DEVICE_TARGETED":
                return this.selectDeviceTargetedTarget(matchingTargets, requestData);
            case "TIME_TARGETED":
                return this.selectTimeTargetedTarget(matchingTargets, requestData);
            default:
                return matchingTargets[0];
        }
    }
    static selectABTestTarget(targets, requestData) {
        const totalWeight = targets.reduce((sum, t) => sum + t.weight, 0);
        let random = Math.random() * totalWeight;
        for (const target of targets) {
            random -= target.weight;
            if (random <= 0) {
                return target;
            }
        }
        return targets[0];
    }
    static selectGeoTargetedTarget(targets, requestData) {
        const country = requestData.country;
        for (const target of targets) {
            for (const condition of target.conditions) {
                if (condition.field === "country" &&
                    condition.operator === "EQUALS" &&
                    condition.value === country) {
                    return target;
                }
            }
        }
        return targets.find((t) => t.isDefault) || targets[0];
    }
    static selectDeviceTargetedTarget(targets, requestData) {
        const device = requestData.device;
        for (const target of targets) {
            for (const condition of target.conditions) {
                if (condition.field === "device" &&
                    condition.operator === "EQUALS" &&
                    condition.value === device) {
                    return target;
                }
            }
        }
        return targets.find((t) => t.isDefault) || targets[0];
    }
    static selectTimeTargetedTarget(targets, requestData) {
        const hour = new Date().getHours();
        for (const target of targets) {
            for (const condition of target.conditions) {
                if (condition.field === "hour" &&
                    condition.operator === "EQUALS" &&
                    condition.value === hour) {
                    return target;
                }
            }
        }
        return targets.find((t) => t.isDefault) || targets[0];
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
            case "GREATER_THAN":
                return Number(compareValue) > Number(compareConditionValue);
            case "LESS_THAN":
                return Number(compareValue) < Number(compareConditionValue);
            case "IN":
                return Array.isArray(conditionValue) && conditionValue.includes(value);
            case "NOT_IN":
                return Array.isArray(conditionValue) && !conditionValue.includes(value);
            case "REGEX":
                try {
                    const regex = new RegExp(conditionValue, condition.caseSensitive ? "" : "i");
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
    static async recordClick(smartLinkId, targetId, requestData) {
        return (await prisma.smartLinkEvent.create({
            data: {
                smartLinkId,
                clickId: Math.random().toString(36).substring(2, 15),
                targetId,
                ipAddress: requestData.ipAddress,
                userAgent: requestData.userAgent,
                referrer: requestData.referrer,
                country: requestData.country,
                city: requestData.city,
                device: requestData.device,
                browser: requestData.browser,
                os: requestData.os,
                timestamp: new Date(),
                data: requestData,
            },
        }));
    }
    static async fireTrackingPixels(pixels, requestData) {
        for (const pixel of pixels) {
            if (!pixel.enabled)
                continue;
            if (pixel.position === "BEFORE_REDIRECT") {
                await this.firePixel(pixel, requestData);
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
    static addTrackingParameters(targetUrl, smartLink, target, requestData) {
        const urlObj = new URL(targetUrl);
        urlObj.searchParams.set("sl_id", smartLink.id);
        urlObj.searchParams.set("sl_target", target.id);
        urlObj.searchParams.set("sl_timestamp", Date.now().toString());
        if (requestData.ipAddress)
            urlObj.searchParams.set("sl_ip", requestData.ipAddress);
        if (requestData.country)
            urlObj.searchParams.set("sl_country", requestData.country);
        if (requestData.device)
            urlObj.searchParams.set("sl_device", requestData.device);
        if (requestData.referrer)
            urlObj.searchParams.set("sl_referrer", requestData.referrer);
        return urlObj.toString();
    }
    static async recordConversion(smartLinkId, targetId, conversionData) {
        const smartLink = await this.findById(smartLinkId);
        if (!smartLink) {
            throw new Error("Smart link not found");
        }
        const clickEvent = await prisma.smartLinkEvent.findFirst({
            where: {
                smartLinkId,
                targetId,
            },
            orderBy: { timestamp: "desc" },
        });
        if (!clickEvent) {
            throw new Error("Click event not found");
        }
        const conversionEvent = (await prisma.smartLinkConversion.create({
            data: {
                smartLinkId,
                smartLinkEventId: clickEvent.id,
                eventId: Math.random().toString(36).substring(2, 15),
                value: conversionData.value || 0,
                commission: conversionData.commission || 0,
                timestamp: new Date(),
                data: conversionData,
            },
        }));
        await this.updateStats(smartLinkId);
        if (smartLink.settings.postbackUrls) {
            await this.firePostbacks(smartLink.settings.postbackUrls, conversionData);
        }
        return conversionEvent;
    }
    static async updateStats(smartLinkId) {
        const smartLink = await this.findById(smartLinkId);
        if (!smartLink)
            return;
        const totalClicks = await prisma.smartLinkEvent.count({
            where: { smartLinkId },
        });
        const uniqueClicks = await prisma.smartLinkEvent
            .groupBy({
            by: ["ipAddress"],
            where: { smartLinkId },
        })
            .then((result) => result.length);
        const conversions = await prisma.smartLinkConversion.count({
            where: { smartLinkId },
        });
        const revenue = await prisma.smartLinkConversion.aggregate({
            where: { smartLinkId },
            _sum: { value: true },
        });
        const commission = await prisma.smartLinkConversion.aggregate({
            where: { smartLinkId },
            _sum: { commission: true },
        });
        const stats = {
            ...smartLink.stats,
            totalClicks,
            uniqueClicks,
            conversions,
            revenue: revenue._sum.value || 0,
            commission: commission._sum.commission || 0,
            conversionRate: totalClicks > 0 ? (conversions / totalClicks) * 100 : 0,
        };
        await this.update(smartLinkId, { stats });
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
    static async generateShortCode(accountId) {
        let shortCode;
        let exists = true;
        while (exists) {
            shortCode = Math.random().toString(36).substring(2, 8);
            const existing = await prisma.smartLink.findFirst({
                where: { shortCode },
            });
            exists = !!existing;
        }
        return shortCode;
    }
    static async getSmartLinkStats(accountId, startDate, endDate) {
        const where = { accountId };
        if (startDate && endDate) {
            where.createdAt = {
                gte: startDate,
                lte: endDate,
            };
        }
        const smartLinks = await this.list(accountId);
        const totalClicks = await prisma.smartLinkEvent.count({
            where: { smartLink: { accountId } },
        });
        const totalConversions = await prisma.smartLinkConversion.count({
            where: { smartLink: { accountId } },
        });
        const stats = {
            totalLinks: smartLinks.length,
            activeLinks: smartLinks.filter((l) => l.status === "ACTIVE").length,
            totalClicks,
            totalConversions,
            totalRevenue: smartLinks.reduce((sum, l) => sum + l.stats.revenue, 0),
            totalCommission: smartLinks.reduce((sum, l) => sum + l.stats.commission, 0),
            byType: {},
            byStatus: {},
            byTarget: {},
        };
        smartLinks.forEach((link) => {
            stats.byType[link.type] = (stats.byType[link.type] || 0) + 1;
            stats.byStatus[link.status] = (stats.byStatus[link.status] || 0) + 1;
        });
        for (const link of smartLinks) {
            for (const target of link.targets) {
                if (!stats.byTarget[target.id]) {
                    stats.byTarget[target.id] = {
                        name: target.name,
                        clicks: 0,
                        conversions: 0,
                        revenue: 0,
                    };
                }
                stats.byTarget[target.id].clicks +=
                    link.stats.byTarget[target.id] || 0;
            }
        }
        return stats;
    }
    static async getSmartLinksDashboard(accountId) {
        const smartLinks = await this.list(accountId);
        const stats = await this.getSmartLinkStats(accountId);
        return {
            smartLinks,
            stats,
        };
    }
    static async createDefaultSmartLinks(accountId) {
        const defaultSmartLinks = [
            {
                name: "Mobile vs Desktop Redirect",
                description: "Redirect mobile users to mobile site, desktop users to desktop site",
                baseUrl: "https://example.com",
                type: "DEVICE_TARGETED",
                targets: [
                    {
                        id: "mobile",
                        name: "Mobile Site",
                        url: "https://m.example.com",
                        weight: 1,
                        conditions: [
                            {
                                field: "device",
                                operator: "EQUALS",
                                value: "mobile",
                                logic: "AND",
                                caseSensitive: false,
                            },
                        ],
                        isDefault: false,
                        isActive: true,
                    },
                    {
                        id: "desktop",
                        name: "Desktop Site",
                        url: "https://www.example.com",
                        weight: 1,
                        conditions: [],
                        isDefault: true,
                        isActive: true,
                    },
                ],
            },
            {
                name: "Geo-Targeted Landing Pages",
                description: "Redirect users to country-specific landing pages",
                baseUrl: "https://example.com",
                type: "GEO_TARGETED",
                targets: [
                    {
                        id: "us",
                        name: "US Landing Page",
                        url: "https://us.example.com",
                        weight: 1,
                        conditions: [
                            {
                                field: "country",
                                operator: "EQUALS",
                                value: "US",
                                logic: "AND",
                                caseSensitive: false,
                            },
                        ],
                        isDefault: false,
                        isActive: true,
                    },
                    {
                        id: "uk",
                        name: "UK Landing Page",
                        url: "https://uk.example.com",
                        weight: 1,
                        conditions: [
                            {
                                field: "country",
                                operator: "EQUALS",
                                value: "GB",
                                logic: "AND",
                                caseSensitive: false,
                            },
                        ],
                        isDefault: false,
                        isActive: true,
                    },
                    {
                        id: "default",
                        name: "Default Landing Page",
                        url: "https://www.example.com",
                        weight: 1,
                        conditions: [],
                        isDefault: true,
                        isActive: true,
                    },
                ],
            },
        ];
        const createdSmartLinks = [];
        for (const smartLinkData of defaultSmartLinks) {
            const smartLink = await this.create({
                accountId,
                ...smartLinkData,
            });
            createdSmartLinks.push(smartLink);
        }
        return createdSmartLinks;
    }
}
exports.SmartLinksModel = SmartLinksModel;
//# sourceMappingURL=SmartLinks.js.map