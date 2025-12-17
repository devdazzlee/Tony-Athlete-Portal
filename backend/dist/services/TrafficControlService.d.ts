export declare class TrafficControlService {
    static createRule(ruleData: any): Promise<import("../models/TrafficControl").TrafficRule>;
    static getRule(id: string): Promise<import("../models/TrafficControl").TrafficRule>;
    static updateRule(id: string, updateData: any): Promise<import("../models/TrafficControl").TrafficRule>;
    static deleteRule(id: string): Promise<void>;
    static listRules(filters?: any): Promise<import("../models/TrafficControl").TrafficRule[]>;
    static processTraffic(data: any, ipAddress: string, userAgent: string, affiliateId?: string, clickId?: string): Promise<import("../models/TrafficControl").TrafficEvent>;
    static getTrafficEvents(filters?: any, page?: number, limit?: number): Promise<import("../models/TrafficControl").TrafficEvent[]>;
    static getTrafficStats(startDate?: Date, endDate?: Date): Promise<import("../models/TrafficControl").TrafficStats>;
    static testRule(id: string, testData: any): Promise<{
        success: boolean;
    }>;
    static createDefaultRules(): Promise<import("../models/TrafficControl").TrafficRule[]>;
    static blockIP(ipAddress: string, reason: string, duration?: number): Promise<{
        success: boolean;
    }>;
    static unblockIP(ipAddress: string): Promise<{
        success: boolean;
    }>;
    static getBlockedIPs(page?: number, limit?: number): Promise<any[]>;
    static blockCountry(countryCode: string, reason: string): Promise<{
        success: boolean;
    }>;
    static unblockCountry(countryCode: string): Promise<{
        success: boolean;
    }>;
    static getBlockedCountries(): Promise<any[]>;
    static updateRateLimit(ruleId: string, requestsPerMinute: number, requestsPerHour: number, requestsPerDay: number): Promise<{
        success: boolean;
    }>;
    static blockDevice(deviceType: string, reason: string): Promise<{
        success: boolean;
    }>;
    static unblockDevice(deviceType: string): Promise<{
        success: boolean;
    }>;
    static getTrafficControlDashboard(): Promise<{
        stats: {};
    }>;
    static exportRules(format: string): Promise<any[]>;
    static importRules(rules: any[], overwrite?: boolean): Promise<any[]>;
    static evaluateTrafficRules(data: any, ipAddress: string, userAgent: string, affiliateId?: string): Promise<any[]>;
    private static evaluateRule;
    private static getFieldValue;
    private static getCountryFromIP;
    private static getDeviceTypeFromUserAgent;
    private static getBrowserFromUserAgent;
    private static getOSFromUserAgent;
    static executeTrafficAction(action: string, data: any, ipAddress: string, userAgent: string, affiliateId?: string): Promise<{
        action: string;
        message: string;
        url?: undefined;
    } | {
        action: string;
        message: string;
        url: any;
    }>;
    static checkRateLimit(ipAddress: string, affiliateId?: string, ruleId?: string): Promise<{
        allowed: boolean;
        remaining: number;
        resetTime: Date;
    }>;
    static getTrafficControlPerformance(startDate?: Date, endDate?: Date): Promise<{
        totalRequests: number;
        allowedRequests: number;
        blockedRequests: number;
        redirectedRequests: number;
        rateLimitedRequests: number;
        allowRate: number;
        blockRate: number;
        byAction: {};
        byCountry: {};
        byDevice: {};
        byBrowser: {};
        byOS: {};
        byHour: {};
        byDay: {};
    }>;
    static getTrafficControlRecommendations(): Promise<string[]>;
    static analyzeTrafficPatterns(startDate?: Date, endDate?: Date): Promise<{
        peakHours: Record<number, number>;
        peakDays: Record<string, number>;
        topCountries: Record<string, number>;
        topDevices: Record<string, number>;
        topBrowsers: Record<string, number>;
        topOS: Record<string, number>;
        suspiciousPatterns: string[];
    }>;
}
//# sourceMappingURL=TrafficControlService.d.ts.map