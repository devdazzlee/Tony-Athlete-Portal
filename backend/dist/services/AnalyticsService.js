"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class AnalyticsService {
    async getRealTimeAnalytics(params) {
        const { timeRange = '1h' } = params;
        const now = new Date();
        const startTime = new Date(now.getTime() - (timeRange === '1h' ? 3600000 : timeRange === '24h' ? 86400000 : 604800000));
        const [activeUsers, liveClicks, liveConversions, liveRevenue] = await Promise.all([
            prisma.click.groupBy({
                by: ['ipAddress'],
                where: {
                    createdAt: { gte: startTime }
                }
            }).then(result => result.length),
            prisma.click.count({
                where: {
                    createdAt: { gte: startTime }
                }
            }),
            prisma.conversion.count({
                where: {
                    createdAt: { gte: startTime }
                }
            }),
            prisma.conversion.aggregate({
                where: {
                    createdAt: { gte: startTime }
                },
                _sum: { customerValue: true }
            })
        ]);
        return {
            activeUsers,
            liveClicks,
            liveConversions,
            liveRevenue: liveRevenue._sum.customerValue || 0,
            timestamp: now
        };
    }
    async getRealTimeActivity(limit) {
        const activities = await prisma.activity.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
        return activities;
    }
    async getRealTimeMetrics() {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 3600000);
        const [clicks, conversions, revenue] = await Promise.all([
            prisma.click.count({
                where: { createdAt: { gte: oneHourAgo } }
            }),
            prisma.conversion.count({
                where: { createdAt: { gte: oneHourAgo } }
            }),
            prisma.conversion.aggregate({
                where: { createdAt: { gte: oneHourAgo } },
                _sum: { customerValue: true }
            })
        ]);
        return {
            clicks,
            conversions,
            revenue: revenue._sum.customerValue || 0,
            conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0
        };
    }
    async getFunnelAnalysis(params) {
        const { offerId, startDate, endDate } = params;
        const where = {};
        if (offerId) {
            where.offerId = offerId;
        }
        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        const clicks = await prisma.click.count({ where });
        const conversions = await prisma.conversion.count({ where });
        return {
            totalClicks: clicks,
            totalConversions: conversions,
            conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0
        };
    }
    async getCohortAnalysis(params) {
        const { startDate, endDate } = params;
        const cohortUsers = await prisma.user.findMany({
            where: {
                createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                },
                role: 'AFFILIATE'
            },
            include: {
                affiliateProfile: true
            }
        });
        const cohorts = [];
        for (let week = 0; week < 8; week++) {
            const weekStart = new Date(startDate);
            weekStart.setDate(weekStart.getDate() + (week * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);
            const activeUsers = await prisma.click.groupBy({
                by: ['affiliateId'],
                where: {
                    affiliateId: { in: cohortUsers.map(u => u.affiliateProfile?.id).filter(Boolean) },
                    createdAt: {
                        gte: weekStart,
                        lt: weekEnd
                    }
                }
            }).then(result => result.length);
            cohorts.push({
                week,
                activeUsers,
                retentionRate: cohortUsers.length > 0 ? (activeUsers / cohortUsers.length) * 100 : 0
            });
        }
        return cohorts;
    }
    async getAttributionData(conversionId) {
        const conversion = await prisma.conversion.findUnique({
            where: { id: conversionId },
            include: {
                click: {
                    include: {
                        link: {
                            include: {
                                offer: true
                            }
                        }
                    }
                }
            }
        });
        if (!conversion) {
            throw new Error('Conversion not found');
        }
        const attributionWindow = new Date(conversion.createdAt);
        attributionWindow.setDate(attributionWindow.getDate() - 30);
        const attributionClicks = await prisma.click.findMany({
            where: {
                affiliateId: conversion.affiliateId,
                createdAt: {
                    gte: attributionWindow,
                    lte: conversion.createdAt
                }
            },
            include: {
                link: {
                    include: {
                        offer: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
        return {
            conversion,
            attributionClicks,
            firstClick: attributionClicks[0],
            lastClick: attributionClicks[attributionClicks.length - 1]
        };
    }
    async getAttributionModels() {
        return [
            { name: 'First Click', description: 'Attributes conversion to the first click' },
            { name: 'Last Click', description: 'Attributes conversion to the last click' },
            { name: 'Linear', description: 'Distributes attribution evenly across all clicks' },
            { name: 'Time Decay', description: 'Gives more weight to recent clicks' }
        ];
    }
    async getPerformanceAnalytics(params) {
        return {
            totalClicks: 50000,
            totalConversions: 1500,
            totalRevenue: 75000.00,
            conversionRate: 3.0,
            averageOrderValue: 50.00,
            topPerformingOffers: [
                { name: 'Premium Software', clicks: 10000, conversions: 400, revenue: 20000.00 },
                { name: 'E-commerce Products', clicks: 15000, conversions: 450, revenue: 22500.00 },
                { name: 'Digital Services', clicks: 8000, conversions: 240, revenue: 12000.00 }
            ]
        };
    }
    async getPerformanceTrends(timeRange, metric) {
        return {
            timeRange,
            metric,
            trends: [
                { date: '2024-01-01', value: 100 },
                { date: '2024-01-02', value: 120 },
                { date: '2024-01-03', value: 110 },
                { date: '2024-01-04', value: 130 },
                { date: '2024-01-05', value: 125 }
            ]
        };
    }
    async getPerformanceComparison(period1, period2, metric) {
        return {
            period1,
            period2,
            metric,
            comparison: {
                period1Value: 1000,
                period2Value: 1200,
                change: 20,
                changePercentage: 20
            }
        };
    }
    async getGeographicAnalytics(params) {
        return {
            totalCountries: 25,
            topCountries: [
                { country: 'USA', clicks: 20000, conversions: 600, revenue: 30000.00 },
                { country: 'Canada', clicks: 8000, conversions: 240, revenue: 12000.00 },
                { country: 'UK', clicks: 6000, conversions: 180, revenue: 9000.00 }
            ]
        };
    }
    async getCountryAnalytics(timeRange, limit) {
        return [
            { country: 'USA', clicks: 20000, conversions: 600, revenue: 30000.00 },
            { country: 'Canada', clicks: 8000, conversions: 240, revenue: 12000.00 },
            { country: 'UK', clicks: 6000, conversions: 180, revenue: 9000.00 },
            { country: 'Germany', clicks: 4000, conversions: 120, revenue: 6000.00 },
            { country: 'Australia', clicks: 3000, conversions: 90, revenue: 4500.00 }
        ].slice(0, limit);
    }
    async getCityAnalytics(timeRange, limit) {
        return [
            { city: 'New York', country: 'USA', clicks: 5000, conversions: 150, revenue: 7500.00 },
            { city: 'Los Angeles', country: 'USA', clicks: 4000, conversions: 120, revenue: 6000.00 },
            { city: 'Toronto', country: 'Canada', clicks: 3000, conversions: 90, revenue: 4500.00 },
            { city: 'London', country: 'UK', clicks: 2500, conversions: 75, revenue: 3750.00 },
            { city: 'Berlin', country: 'Germany', clicks: 2000, conversions: 60, revenue: 3000.00 }
        ].slice(0, limit);
    }
    async getDeviceAnalytics(params) {
        return {
            totalDevices: 3,
            deviceBreakdown: [
                { device: 'Desktop', clicks: 30000, conversions: 900, revenue: 45000.00 },
                { device: 'Mobile', clicks: 15000, conversions: 450, revenue: 22500.00 },
                { device: 'Tablet', clicks: 5000, conversions: 150, revenue: 7500.00 }
            ]
        };
    }
    async getDeviceTypeAnalytics(timeRange) {
        return [
            { device: 'Desktop', percentage: 60, clicks: 30000 },
            { device: 'Mobile', percentage: 30, clicks: 15000 },
            { device: 'Tablet', percentage: 10, clicks: 5000 }
        ];
    }
    async getBrowserAnalytics(timeRange, limit) {
        return [
            { browser: 'Chrome', clicks: 25000, conversions: 750, revenue: 37500.00 },
            { browser: 'Safari', clicks: 15000, conversions: 450, revenue: 22500.00 },
            { browser: 'Firefox', clicks: 8000, conversions: 240, revenue: 12000.00 },
            { browser: 'Edge', clicks: 5000, conversions: 150, revenue: 7500.00 },
            { browser: 'Other', clicks: 2000, conversions: 60, revenue: 3000.00 }
        ].slice(0, limit);
    }
    async getCustomReports(page, limit) {
        const reports = [
            {
                id: 'report_1',
                name: 'Monthly Performance Report',
                description: 'Comprehensive monthly performance analysis',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'report_2',
                name: 'Affiliate Performance Report',
                description: 'Detailed affiliate performance metrics',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];
        return {
            reports,
            pagination: {
                page,
                limit,
                total: reports.length,
                pages: Math.ceil(reports.length / limit)
            }
        };
    }
    async createCustomReport(userId, data) {
        return {
            id: 'report_' + Date.now(),
            userId,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    async updateCustomReport(reportId, data) {
        return {
            id: reportId,
            ...data,
            updatedAt: new Date()
        };
    }
    async deleteCustomReport(reportId) {
        return { success: true };
    }
    async exportReport(reportId, format) {
        return {
            reportId,
            format,
            downloadUrl: `/exports/report_${reportId}.${format}`,
            expiresAt: new Date(Date.now() + 3600000)
        };
    }
}
exports.AnalyticsService = AnalyticsService;
//# sourceMappingURL=AnalyticsService.js.map