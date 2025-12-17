"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class TrackingService {
    async processEvents(data) {
        const { events, websiteId, sessionId } = data;
        let processed = 0;
        let failed = 0;
        for (const event of events) {
            try {
                await this.processEvent(event);
                processed++;
            }
            catch (error) {
                console.error("Failed to process event:", error);
                failed++;
            }
        }
        return { processed, failed };
    }
    async processEvent(event) {
        const { id, event: eventType, data, timestamp, sessionId, userId, websiteId, page, device, browser, } = event;
        await this.upsertSession({
            id: sessionId,
            websiteId,
            userId,
            startTime: timestamp,
            lastActivity: timestamp,
            userAgent: device.userAgent,
            ipAddress: "",
            country: "Unknown",
            city: "Unknown",
        });
        await this.storeEvent({
            id,
            eventType,
            data,
            timestamp,
            sessionId,
            userId,
            websiteId,
            page,
            device,
            browser,
            event: eventType,
            trackingCodeId: "default",
            ipAddress: "",
            userAgent: "",
            referrer: "",
        });
        await this.updateWebsiteStats(websiteId, eventType, timestamp);
    }
    async upsertSession(sessionData) {
        await prisma.trackingSession.upsert({
            where: { sessionId: sessionData.id },
            update: {
                userAgent: sessionData.userAgent,
                ipAddress: sessionData.ipAddress,
                country: sessionData.country,
                city: sessionData.city,
                updatedAt: new Date(),
            },
            create: {
                sessionId: sessionData.id,
                websiteId: sessionData.websiteId,
                userId: sessionData.userId,
                startTime: new Date(sessionData.startTime),
                userAgent: sessionData.userAgent,
                ipAddress: sessionData.ipAddress,
                country: sessionData.country,
                city: sessionData.city,
            },
        });
    }
    async storeEvent(eventData) {
        await prisma.trackingEvent.create({
            data: {
                trackingCodeId: eventData.trackingCodeId || "default",
                eventType: eventData.eventType,
                event: eventData.event,
                data: eventData.data,
                timestamp: new Date(eventData.timestamp),
                sessionId: eventData.sessionId,
                websiteId: eventData.websiteId,
                ipAddress: eventData.ipAddress,
                userAgent: eventData.userAgent,
                referrer: eventData.referrer,
            },
        });
    }
    async updateWebsiteStats(websiteId, eventType, timestamp) {
        const date = new Date(timestamp);
        const dateStr = date.toISOString().split("T")[0];
        await prisma.trackingStats.upsert({
            where: {
                websiteId_date: {
                    websiteId,
                    date: new Date(dateStr),
                },
            },
            update: {
                pageViews: eventType === "page_view" ? { increment: 1 } : undefined,
                events: eventType === "click" || eventType === "conversion"
                    ? { increment: 1 }
                    : undefined,
                conversions: eventType === "conversion" ? { increment: 1 } : undefined,
            },
            create: {
                websiteId,
                date: new Date(dateStr),
                pageViews: eventType === "page_view" ? 1 : 0,
                uniqueVisitors: 0,
                sessions: 0,
                events: eventType === "click" || eventType === "conversion" ? 1 : 0,
                conversions: eventType === "conversion" ? 1 : 0,
                revenue: 0,
                bounceRate: 0,
                avgSessionDuration: 0,
            },
        });
    }
    async getTrackingStats(websiteId, options) {
        const { startDate, endDate, groupBy = "day" } = options;
        let whereClause = { websiteId };
        if (startDate || endDate) {
            whereClause.date = {};
            if (startDate)
                whereClause.date.gte = startDate;
            if (endDate)
                whereClause.date.lte = endDate;
        }
        const stats = await prisma.trackingStats.findMany({
            where: whereClause,
            orderBy: { date: "asc" },
        });
        const groupedStats = this.groupStatsByPeriod(stats, groupBy);
        return {
            websiteId,
            period: { startDate, endDate, groupBy },
            stats: groupedStats,
            summary: this.calculateSummary(stats),
        };
    }
    async getRealtimeAnalytics(websiteId) {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const [activeSessions, recentEvents, topPages] = await Promise.all([
            prisma.trackingSession.count({
                where: {
                    websiteId,
                    updatedAt: { gte: oneHourAgo },
                },
            }),
            prisma.trackingEvent.findMany({
                where: {
                    websiteId,
                    timestamp: { gte: oneHourAgo },
                },
                orderBy: { timestamp: "desc" },
                take: 50,
            }),
            prisma.trackingEvent.findMany({
                where: {
                    websiteId,
                    eventType: "page_view",
                    timestamp: { gte: oneHourAgo },
                },
                select: {
                    data: true,
                    timestamp: true,
                },
                orderBy: { timestamp: "desc" },
                take: 100,
            }),
        ]);
        return {
            websiteId,
            timestamp: now.toISOString(),
            activeSessions,
            recentEvents: recentEvents.map((event) => ({
                id: event.id,
                eventType: event.eventType,
                timestamp: event.timestamp,
                page: event.data?.page || null,
                data: event.data,
            })),
            topPages: topPages.map((page) => ({
                page: page.data?.page || null,
                views: 1,
            })),
        };
    }
    async getPageAnalytics(websiteId, options) {
        const { startDate, endDate, limit = 50, sortBy = "views", sortOrder = "desc", } = options;
        let whereClause = {
            websiteId,
            eventType: "page_view",
        };
        if (startDate || endDate) {
            whereClause.timestamp = {};
            if (startDate)
                whereClause.timestamp.gte = new Date(startDate);
            if (endDate)
                whereClause.timestamp.lte = new Date(endDate);
        }
        const pageStats = await prisma.trackingEvent.findMany({
            where: whereClause,
            select: {
                data: true,
                timestamp: true,
            },
            orderBy: { timestamp: sortOrder },
            take: limit,
        });
        const pageGroups = {};
        pageStats.forEach((event) => {
            const pageUrl = event.data?.page?.url || "unknown";
            if (!pageGroups[pageUrl]) {
                pageGroups[pageUrl] = { views: 0, avgTime: 0 };
            }
            pageGroups[pageUrl].views++;
        });
        const result = Object.entries(pageGroups)
            .map(([page, stats]) => ({
            page,
            views: stats.views,
            avgTime: stats.avgTime,
        }))
            .sort((a, b) => {
            if (sortBy === "views") {
                return sortOrder === "desc" ? b.views - a.views : a.views - b.views;
            }
            return 0;
        });
        return result;
    }
    async getDeviceAnalytics(websiteId, options) {
        const { startDate, endDate, groupBy = "browser" } = options;
        let whereClause = { websiteId };
        if (startDate || endDate) {
            whereClause.timestamp = {};
            if (startDate)
                whereClause.timestamp.gte = new Date(startDate);
            if (endDate)
                whereClause.timestamp.lte = new Date(endDate);
        }
        const deviceStats = await prisma.trackingEvent.findMany({
            where: whereClause,
            select: {
                data: true,
                timestamp: true,
            },
            take: 1000,
        });
        const deviceGroups = {};
        deviceStats.forEach((event) => {
            const deviceType = event.data?.device?.platform || "unknown";
            deviceGroups[deviceType] = (deviceGroups[deviceType] || 0) + 1;
        });
        return Object.entries(deviceGroups).map(([device, count]) => ({
            [groupBy]: device,
            count,
        }));
    }
    async getGeographicAnalytics(websiteId, options) {
        const { startDate, endDate, groupBy = "country" } = options;
        let whereClause = { websiteId };
        if (startDate || endDate) {
            whereClause.timestamp = {};
            if (startDate)
                whereClause.timestamp.gte = new Date(startDate);
            if (endDate)
                whereClause.timestamp.lte = new Date(endDate);
        }
        const geoStats = await prisma.trackingSession.groupBy({
            by: [groupBy],
            where: whereClause,
            _count: { id: true },
        });
        return geoStats.map((stat) => ({
            [groupBy]: stat[groupBy],
            count: stat._count.id,
        }));
    }
    async getConversionAnalytics(websiteId, options) {
        const { startDate, endDate, conversionType } = options;
        let whereClause = {
            websiteId,
            eventType: "conversion",
        };
        if (startDate || endDate) {
            whereClause.timestamp = {};
            if (startDate)
                whereClause.timestamp.gte = new Date(startDate);
            if (endDate)
                whereClause.timestamp.lte = new Date(endDate);
        }
        const conversions = await prisma.trackingEvent.findMany({
            where: whereClause,
            orderBy: { timestamp: "desc" },
        });
        return conversions.map((conversion) => ({
            id: conversion.id,
            timestamp: conversion.timestamp,
            data: conversion.data,
            page: conversion.data?.page || null,
        }));
    }
    async getUserJourney(websiteId, options) {
        const { sessionId, userId, startDate, endDate } = options;
        let whereClause = { websiteId };
        if (sessionId)
            whereClause.sessionId = sessionId;
        if (userId)
            whereClause.userId = userId;
        if (startDate || endDate) {
            whereClause.timestamp = {};
            if (startDate)
                whereClause.timestamp.gte = new Date(startDate);
            if (endDate)
                whereClause.timestamp.lte = new Date(endDate);
        }
        const events = await prisma.trackingEvent.findMany({
            where: whereClause,
            orderBy: { timestamp: "asc" },
        });
        return events.map((event) => ({
            id: event.id,
            eventType: event.eventType,
            timestamp: event.timestamp,
            page: event.data?.page || null,
            data: event.data,
        }));
    }
    async getHeatmapData(websiteId, options) {
        const { page, startDate, endDate } = options;
        let whereClause = {
            websiteId,
            eventType: "click",
        };
        if (page)
            whereClause.page = { path: page };
        if (startDate || endDate) {
            whereClause.timestamp = {};
            if (startDate)
                whereClause.timestamp.gte = new Date(startDate);
            if (endDate)
                whereClause.timestamp.lte = new Date(endDate);
        }
        const clicks = await prisma.trackingEvent.findMany({
            where: whereClause,
            select: { data: true },
        });
        const heatmapData = clicks
            .filter((click) => click.data &&
            typeof click.data === "object" &&
            "position" in click.data)
            .map((click) => ({
            x: click.data.position?.x || 0,
            y: click.data.position?.y || 0,
        }));
        return {
            page,
            clicks: heatmapData,
            totalClicks: heatmapData.length,
        };
    }
    async getFunnelAnalysis(websiteId, options) {
        const { steps, startDate, endDate } = options;
        const stepList = steps
            ? steps.split(",")
            : ["page_view", "click", "conversion"];
        let whereClause = { websiteId };
        if (startDate || endDate) {
            whereClause.timestamp = {};
            if (startDate)
                whereClause.timestamp.gte = new Date(startDate);
            if (endDate)
                whereClause.timestamp.lte = new Date(endDate);
        }
        const funnelData = await Promise.all(stepList.map(async (step, index) => {
            const count = await prisma.trackingEvent.count({
                where: {
                    ...whereClause,
                    eventType: step,
                },
            });
            return {
                step: index + 1,
                eventType: step,
                count,
                conversionRate: index === 0 ? 100 : 0,
            };
        }));
        const firstStepCount = funnelData[0]?.count || 0;
        funnelData.forEach((step, index) => {
            if (index > 0 && firstStepCount > 0) {
                step.conversionRate = (step.count / firstStepCount) * 100;
            }
        });
        return {
            steps: funnelData,
            totalSteps: stepList.length,
        };
    }
    async exportTrackingData(websiteId, options) {
        const { startDate, endDate, format = "csv", eventTypes } = options;
        let whereClause = { websiteId };
        if (startDate || endDate) {
            whereClause.timestamp = {};
            if (startDate)
                whereClause.timestamp.gte = new Date(startDate);
            if (endDate)
                whereClause.timestamp.lte = new Date(endDate);
        }
        if (eventTypes) {
            const types = eventTypes.split(",");
            whereClause.eventType = { in: types };
        }
        const events = await prisma.trackingEvent.findMany({
            where: whereClause,
            orderBy: { timestamp: "desc" },
        });
        if (format === "csv") {
            return this.convertToCSV(events);
        }
        else {
            return JSON.stringify(events, null, 2);
        }
    }
    groupStatsByPeriod(stats, groupBy) {
        return stats;
    }
    calculateSummary(stats) {
        return {
            totalPageViews: stats.reduce((sum, stat) => sum + stat.pageViews, 0),
            totalClicks: stats.reduce((sum, stat) => sum + stat.clicks, 0),
            totalConversions: stats.reduce((sum, stat) => sum + stat.conversions, 0),
            totalEvents: stats.reduce((sum, stat) => sum + stat.otherEvents, 0),
        };
    }
    convertToCSV(events) {
        const headers = [
            "id",
            "eventType",
            "timestamp",
            "sessionId",
            "userId",
            "page",
            "data",
        ];
        const csvRows = [headers.join(",")];
        events.forEach((event) => {
            const row = headers.map((header) => {
                const value = event[header];
                return typeof value === "object" ? JSON.stringify(value) : value;
            });
            csvRows.push(row.join(","));
        });
        return csvRows.join("\n");
    }
}
exports.TrackingService = TrackingService;
//# sourceMappingURL=TrackingService.js.map