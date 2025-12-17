interface TrackingEvent {
    id: string;
    event: string;
    data: any;
    timestamp: string;
    sessionId: string;
    userId?: string;
    websiteId: string;
    page: {
        url: string;
        title: string;
        referrer?: string;
        path: string;
        search: string;
        hash: string;
    };
    device: {
        userAgent: string;
        language: string;
        platform: string;
        screenWidth: number;
        screenHeight: number;
        viewportWidth: number;
        viewportHeight: number;
        colorDepth: number;
        timezone: string;
    };
    browser: {
        browser: string;
        version: string;
    };
}
interface ProcessEventsData {
    events: TrackingEvent[];
    websiteId: string;
    sessionId: string;
    timestamp: string;
}
export declare class TrackingService {
    processEvents(data: ProcessEventsData): Promise<{
        processed: number;
        failed: number;
    }>;
    private processEvent;
    private upsertSession;
    private storeEvent;
    private updateWebsiteStats;
    getTrackingStats(websiteId: string, options: {
        startDate?: string;
        endDate?: string;
        groupBy?: string;
        timezone?: string;
    }): Promise<{
        websiteId: string;
        period: {
            startDate: string;
            endDate: string;
            groupBy: string;
        };
        stats: any[];
        summary: {
            totalPageViews: any;
            totalClicks: any;
            totalConversions: any;
            totalEvents: any;
        };
    }>;
    getRealtimeAnalytics(websiteId: string): Promise<{
        websiteId: string;
        timestamp: string;
        activeSessions: number;
        recentEvents: {
            id: string;
            eventType: string;
            timestamp: Date;
            page: any;
            data: import("@prisma/client/runtime/library").JsonValue;
        }[];
        topPages: {
            page: any;
            views: number;
        }[];
    }>;
    getPageAnalytics(websiteId: string, options: {
        startDate?: string;
        endDate?: string;
        limit?: number;
        sortBy?: string;
        sortOrder?: string;
    }): Promise<{
        page: string;
        views: number;
        avgTime: number;
    }[]>;
    getDeviceAnalytics(websiteId: string, options: {
        startDate?: string;
        endDate?: string;
        groupBy?: string;
    }): Promise<{
        [x: string]: string | number;
        count: number;
    }[]>;
    getGeographicAnalytics(websiteId: string, options: {
        startDate?: string;
        endDate?: string;
        groupBy?: string;
    }): Promise<{
        [x: string]: string | number | {
            id: number;
        };
        count: number;
    }[]>;
    getConversionAnalytics(websiteId: string, options: {
        startDate?: string;
        endDate?: string;
        conversionType?: string;
    }): Promise<{
        id: string;
        timestamp: Date;
        data: import("@prisma/client/runtime/library").JsonValue;
        page: any;
    }[]>;
    getUserJourney(websiteId: string, options: {
        sessionId?: string;
        userId?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<{
        id: string;
        eventType: string;
        timestamp: Date;
        page: any;
        data: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    getHeatmapData(websiteId: string, options: {
        page?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<{
        page: string;
        clicks: {
            x: any;
            y: any;
        }[];
        totalClicks: number;
    }>;
    getFunnelAnalysis(websiteId: string, options: {
        steps?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<{
        steps: {
            step: number;
            eventType: string;
            count: number;
            conversionRate: number;
        }[];
        totalSteps: number;
    }>;
    exportTrackingData(websiteId: string, options: {
        startDate?: string;
        endDate?: string;
        format?: string;
        eventTypes?: string;
    }): Promise<string>;
    private groupStatsByPeriod;
    private calculateSummary;
    private convertToCSV;
}
export {};
//# sourceMappingURL=TrackingService.d.ts.map