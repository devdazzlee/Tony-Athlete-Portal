export interface RedirectCondition {
    id: string;
    field: string;
    operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "STARTS_WITH" | "ENDS_WITH" | "REGEX" | "IN" | "NOT_IN";
    value: any;
    logic: "AND" | "OR";
    caseSensitive: boolean;
}
export interface RedirectSettings {
    preserveQueryParams: boolean;
    preserveHash: boolean;
    addTrackingParams: boolean;
    trackingParams: Record<string, string>;
    redirectDelay: number;
    redirectMethod: "IMMEDIATE" | "DELAYED" | "CONDITIONAL";
    customHeaders: Record<string, string>;
    customScripts: string[];
    analytics: AnalyticsSettings;
    seo: SEOSettings;
}
export interface AnalyticsSettings {
    enabled: boolean;
    trackClicks: boolean;
    trackConversions: boolean;
    trackBounceRate: boolean;
    trackTimeOnPage: boolean;
    customEvents: string[];
    goals: AnalyticsGoal[];
}
export interface AnalyticsGoal {
    id: string;
    name: string;
    type: "PAGE_VIEW" | "CLICK" | "FORM_SUBMIT" | "TIME_ON_PAGE" | "CUSTOM";
    conditions: RedirectCondition[];
    value: number;
    enabled: boolean;
}
export interface SEOSettings {
    preserveTitle: boolean;
    preserveDescription: boolean;
    preserveKeywords: boolean;
    customTitle?: string;
    customDescription?: string;
    customKeywords?: string[];
    canonicalUrl?: string;
    robotsMeta?: string;
}
export interface RedirectStats {
    totalRedirects: number;
    uniqueRedirects: number;
    conversions: number;
    revenue: number;
    bounceRate: number;
    averageTimeOnPage: number;
    lastRedirect?: Date;
    lastConversion?: Date;
    byCountry: Record<string, number>;
    byDevice: Record<string, number>;
    bySource: Record<string, number>;
    byHour: Record<string, number>;
    byDay: Record<string, number>;
    byRule: Record<string, number>;
}
export interface RedirectEvent {
    id: string;
    redirectRuleId: string;
    sourceUrl: string;
    targetUrl: string;
    ipAddress: string;
    userAgent: string;
    referrer?: string;
    country?: string;
    city?: string;
    device?: string;
    browser?: string;
    os?: string;
    queryParams: Record<string, string>;
    headers: Record<string, string>;
    timestamp: Date;
    data: any;
}
export interface ConversionEvent {
    id: string;
    redirectEventId: string;
    redirectRuleId: string;
    value: number;
    currency: string;
    timestamp: Date;
    data: any;
}
export interface BounceEvent {
    id: string;
    redirectEventId: string;
    redirectRuleId: string;
    timeOnPage: number;
    pagesViewed: number;
    timestamp: Date;
    data: any;
}
export declare class RedirectTrackingModel {
    static createRule(data: any): Promise<any>;
    static findRuleById(id: string): Promise<any | null>;
    static findRuleBySourceUrl(accountId: string, sourceUrl: string): Promise<any | null>;
    static updateRule(id: string, data: any): Promise<any>;
    static deleteRule(id: string): Promise<void>;
    static listRules(accountId: string, filters?: any): Promise<any[]>;
    static processRedirect(sourceUrl: string, requestData: any): Promise<{
        redirect: boolean;
        targetUrl?: string;
        statusCode?: number;
        reason?: string;
    }>;
    private static findMatchingRule;
    private static matchesPattern;
    private static evaluateConditions;
    private static evaluateCondition;
    private static getFieldValue;
    private static addTrackingParameters;
    private static recordRedirectEvent;
    static recordConversion(redirectEventId: string, conversionData: any): Promise<ConversionEvent>;
    static recordBounce(redirectEventId: string, bounceData: any): Promise<BounceEvent>;
    private static updateRuleStats;
    static getRedirectStats(accountId: string, startDate?: Date, endDate?: Date): Promise<any>;
    private static extractSource;
    static getRedirectTrackingDashboard(accountId: string): Promise<any>;
    static createDefaultRules(accountId: string): Promise<any[]>;
}
//# sourceMappingURL=RedirectTracking.d.ts.map