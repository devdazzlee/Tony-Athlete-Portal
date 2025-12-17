export interface GetRealTimeAnalyticsParams {
    timeRange?: '1h' | '24h' | '7d';
}
export interface GetFunnelAnalysisParams {
    offerId?: string;
    startDate?: string;
    endDate?: string;
}
export interface GetCohortAnalysisParams {
    startDate: string;
    endDate: string;
}
export interface GetPerformanceAnalyticsParams {
    timeRange?: '7d' | '30d' | '90d' | '1y';
    metric?: 'clicks' | 'conversions' | 'revenue' | 'commission';
    groupBy?: 'day' | 'week' | 'month';
}
export interface GetGeographicAnalyticsParams {
    timeRange?: '7d' | '30d' | '90d' | '1y';
    startDate?: string;
    endDate?: string;
}
export interface GetDeviceAnalyticsParams {
    timeRange?: '7d' | '30d' | '90d' | '1y';
    startDate?: string;
    endDate?: string;
}
export interface CreateCustomReportData {
    name: string;
    description?: string;
    metrics: string[];
    filters: Record<string, any>;
    schedule?: string;
}
export interface UpdateCustomReportData {
    name?: string;
    description?: string;
    metrics?: string[];
    filters?: Record<string, any>;
    schedule?: string;
}
export declare class AnalyticsService {
    getRealTimeAnalytics(params: GetRealTimeAnalyticsParams): Promise<{
        activeUsers: number;
        liveClicks: number;
        liveConversions: number;
        liveRevenue: number;
        timestamp: Date;
    }>;
    getRealTimeActivity(limit: number): Promise<({
        user: {
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        status: string | null;
        createdAt: Date;
        userId: string;
        action: string;
        resource: string;
        details: import("@prisma/client/runtime/library").JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
        reviewedBy: string | null;
        reviewedAt: Date | null;
        adminComment: string | null;
    })[]>;
    getRealTimeMetrics(): Promise<{
        clicks: number;
        conversions: number;
        revenue: number;
        conversionRate: number;
    }>;
    getFunnelAnalysis(params: GetFunnelAnalysisParams): Promise<{
        totalClicks: number;
        totalConversions: number;
        conversionRate: number;
    }>;
    getCohortAnalysis(params: GetCohortAnalysisParams): Promise<any[]>;
    getAttributionData(conversionId: string): Promise<{
        conversion: {
            click: {
                link: {
                    offer: {
                        name: string;
                        id: string;
                        status: import(".prisma/client").$Enums.OfferStatus;
                        createdAt: Date;
                        updatedAt: Date;
                        commissionRate: number;
                        totalClicks: number;
                        totalConversions: number;
                        description: string;
                        accountId: string;
                        startDate: Date;
                        endDate: Date | null;
                        tags: string[];
                        totalRevenue: number;
                        totalCommissions: number;
                    };
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    expiresAt: Date | null;
                    clicks: number;
                    conversions: number;
                    affiliateId: string;
                    offerId: string | null;
                    originalUrl: string;
                    shortUrl: string;
                    customSlug: string | null;
                    earnings: number;
                    isActive: boolean;
                };
            } & {
                id: string;
                createdAt: Date;
                userId: string | null;
                ipAddress: string;
                userAgent: string;
                linkId: string;
                affiliateId: string;
                referrer: string | null;
                country: string | null;
                city: string | null;
                device: string | null;
                browser: string | null;
                os: string | null;
                source: string | null;
                converted: boolean;
                conversionId: string | null;
                timestamp: Date;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.ConversionStatus;
            createdAt: Date;
            updatedAt: Date;
            userId: string | null;
            orderValue: number;
            commissionAmount: number;
            affiliateId: string;
            clickId: string;
            offerId: string;
            customerEmail: string | null;
            customerValue: number;
        };
        attributionClicks: ({
            link: {
                offer: {
                    name: string;
                    id: string;
                    status: import(".prisma/client").$Enums.OfferStatus;
                    createdAt: Date;
                    updatedAt: Date;
                    commissionRate: number;
                    totalClicks: number;
                    totalConversions: number;
                    description: string;
                    accountId: string;
                    startDate: Date;
                    endDate: Date | null;
                    tags: string[];
                    totalRevenue: number;
                    totalCommissions: number;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                expiresAt: Date | null;
                clicks: number;
                conversions: number;
                affiliateId: string;
                offerId: string | null;
                originalUrl: string;
                shortUrl: string;
                customSlug: string | null;
                earnings: number;
                isActive: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string | null;
            ipAddress: string;
            userAgent: string;
            linkId: string;
            affiliateId: string;
            referrer: string | null;
            country: string | null;
            city: string | null;
            device: string | null;
            browser: string | null;
            os: string | null;
            source: string | null;
            converted: boolean;
            conversionId: string | null;
            timestamp: Date;
        })[];
        firstClick: {
            link: {
                offer: {
                    name: string;
                    id: string;
                    status: import(".prisma/client").$Enums.OfferStatus;
                    createdAt: Date;
                    updatedAt: Date;
                    commissionRate: number;
                    totalClicks: number;
                    totalConversions: number;
                    description: string;
                    accountId: string;
                    startDate: Date;
                    endDate: Date | null;
                    tags: string[];
                    totalRevenue: number;
                    totalCommissions: number;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                expiresAt: Date | null;
                clicks: number;
                conversions: number;
                affiliateId: string;
                offerId: string | null;
                originalUrl: string;
                shortUrl: string;
                customSlug: string | null;
                earnings: number;
                isActive: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string | null;
            ipAddress: string;
            userAgent: string;
            linkId: string;
            affiliateId: string;
            referrer: string | null;
            country: string | null;
            city: string | null;
            device: string | null;
            browser: string | null;
            os: string | null;
            source: string | null;
            converted: boolean;
            conversionId: string | null;
            timestamp: Date;
        };
        lastClick: {
            link: {
                offer: {
                    name: string;
                    id: string;
                    status: import(".prisma/client").$Enums.OfferStatus;
                    createdAt: Date;
                    updatedAt: Date;
                    commissionRate: number;
                    totalClicks: number;
                    totalConversions: number;
                    description: string;
                    accountId: string;
                    startDate: Date;
                    endDate: Date | null;
                    tags: string[];
                    totalRevenue: number;
                    totalCommissions: number;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                expiresAt: Date | null;
                clicks: number;
                conversions: number;
                affiliateId: string;
                offerId: string | null;
                originalUrl: string;
                shortUrl: string;
                customSlug: string | null;
                earnings: number;
                isActive: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string | null;
            ipAddress: string;
            userAgent: string;
            linkId: string;
            affiliateId: string;
            referrer: string | null;
            country: string | null;
            city: string | null;
            device: string | null;
            browser: string | null;
            os: string | null;
            source: string | null;
            converted: boolean;
            conversionId: string | null;
            timestamp: Date;
        };
    }>;
    getAttributionModels(): Promise<{
        name: string;
        description: string;
    }[]>;
    getPerformanceAnalytics(params: GetPerformanceAnalyticsParams): Promise<{
        totalClicks: number;
        totalConversions: number;
        totalRevenue: number;
        conversionRate: number;
        averageOrderValue: number;
        topPerformingOffers: {
            name: string;
            clicks: number;
            conversions: number;
            revenue: number;
        }[];
    }>;
    getPerformanceTrends(timeRange: string, metric: string): Promise<{
        timeRange: string;
        metric: string;
        trends: {
            date: string;
            value: number;
        }[];
    }>;
    getPerformanceComparison(period1: string, period2: string, metric: string): Promise<{
        period1: string;
        period2: string;
        metric: string;
        comparison: {
            period1Value: number;
            period2Value: number;
            change: number;
            changePercentage: number;
        };
    }>;
    getGeographicAnalytics(params: GetGeographicAnalyticsParams): Promise<{
        totalCountries: number;
        topCountries: {
            country: string;
            clicks: number;
            conversions: number;
            revenue: number;
        }[];
    }>;
    getCountryAnalytics(timeRange: string, limit: number): Promise<{
        country: string;
        clicks: number;
        conversions: number;
        revenue: number;
    }[]>;
    getCityAnalytics(timeRange: string, limit: number): Promise<{
        city: string;
        country: string;
        clicks: number;
        conversions: number;
        revenue: number;
    }[]>;
    getDeviceAnalytics(params: GetDeviceAnalyticsParams): Promise<{
        totalDevices: number;
        deviceBreakdown: {
            device: string;
            clicks: number;
            conversions: number;
            revenue: number;
        }[];
    }>;
    getDeviceTypeAnalytics(timeRange: string): Promise<{
        device: string;
        percentage: number;
        clicks: number;
    }[]>;
    getBrowserAnalytics(timeRange: string, limit: number): Promise<{
        browser: string;
        clicks: number;
        conversions: number;
        revenue: number;
    }[]>;
    getCustomReports(page: number, limit: number): Promise<{
        reports: {
            id: string;
            name: string;
            description: string;
            createdAt: Date;
            updatedAt: Date;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    createCustomReport(userId: string, data: CreateCustomReportData): Promise<{
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description?: string;
        metrics: string[];
        filters: Record<string, any>;
        schedule?: string;
        id: string;
        userId: string;
    }>;
    updateCustomReport(reportId: string, data: UpdateCustomReportData): Promise<{
        updatedAt: Date;
        name?: string;
        description?: string;
        metrics?: string[];
        filters?: Record<string, any>;
        schedule?: string;
        id: string;
    }>;
    deleteCustomReport(reportId: string): Promise<{
        success: boolean;
    }>;
    exportReport(reportId: string, format: string): Promise<{
        reportId: string;
        format: string;
        downloadUrl: string;
        expiresAt: Date;
    }>;
}
//# sourceMappingURL=AnalyticsService.d.ts.map