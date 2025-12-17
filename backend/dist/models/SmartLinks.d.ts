export interface SmartLinkSettings {
    clickTracking: boolean;
    conversionTracking: boolean;
    fraudDetection: boolean;
    geoBlocking: boolean;
    deviceFiltering: boolean;
    timeFiltering: boolean;
    ipFiltering: boolean;
    referrerFiltering: boolean;
    customFilters: CustomFilter[];
    redirectDelay: number;
    redirectMethod: "IMMEDIATE" | "DELAYED" | "CONDITIONAL";
    fallbackUrl?: string;
    trackingPixels: TrackingPixel[];
    postbackUrls: PostbackUrl[];
    analytics: AnalyticsSettings;
    seo: SEOSettings;
}
export interface SmartLinkTarget {
    id: string;
    name: string;
    url: string;
    weight: number;
    conditions: TargetCondition[];
    isDefault: boolean;
    isActive: boolean;
}
export interface TargetCondition {
    field: string;
    operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "GREATER_THAN" | "LESS_THAN" | "IN" | "NOT_IN" | "REGEX";
    value: any;
    logic: "AND" | "OR";
    caseSensitive: boolean;
}
export interface SmartLinkRule {
    id: string;
    name: string;
    priority: number;
    conditions: SmartLinkCondition[];
    actions: SmartLinkAction[];
    enabled: boolean;
}
export interface SmartLinkCondition {
    field: string;
    operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "GREATER_THAN" | "LESS_THAN" | "IN" | "NOT_IN" | "REGEX";
    value: any;
    logic: "AND" | "OR";
    caseSensitive: boolean;
}
export interface SmartLinkAction {
    type: "REDIRECT" | "BLOCK" | "MODIFY_URL" | "ADD_PARAMETER" | "REMOVE_PARAMETER" | "CUSTOM";
    parameters: Record<string, any>;
    enabled: boolean;
}
export interface CustomFilter {
    id: string;
    name: string;
    type: "GEO" | "DEVICE" | "TIME" | "IP" | "REFERRER" | "CUSTOM";
    conditions: SmartLinkCondition[];
    action: "ALLOW" | "BLOCK" | "REDIRECT";
    redirectUrl?: string;
    enabled: boolean;
}
export interface TrackingPixel {
    id: string;
    name: string;
    url: string;
    position: "BEFORE_REDIRECT" | "AFTER_REDIRECT" | "ON_CONVERSION";
    parameters: Record<string, string>;
    enabled: boolean;
}
export interface PostbackUrl {
    id: string;
    name: string;
    url: string;
    method: "GET" | "POST";
    parameters: Record<string, string>;
    headers: Record<string, string>;
    enabled: boolean;
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
    conditions: SmartLinkCondition[];
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
export interface SmartLinkStats {
    totalClicks: number;
    uniqueClicks: number;
    conversions: number;
    revenue: number;
    commission: number;
    conversionRate: number;
    lastClick?: Date;
    lastConversion?: Date;
    byTarget: Record<string, number>;
    byCountry: Record<string, number>;
    byDevice: Record<string, number>;
    bySource: Record<string, number>;
    byHour: Record<string, number>;
    byDay: Record<string, number>;
}
export interface SmartLinkEvent {
    id: string;
    smartLinkId: string;
    targetId?: string;
    ipAddress: string;
    userAgent: string;
    referrer?: string;
    country?: string;
    city?: string;
    device?: string;
    browser?: string;
    os?: string;
    timestamp: Date;
    data: any;
}
export interface SmartLinkConversion {
    id: string;
    smartLinkId: string;
    smartLinkEventId: string;
    targetId?: string;
    value: number;
    commission: number;
    timestamp: Date;
    data: any;
}
export declare class SmartLinksModel {
    static create(data: any): Promise<any>;
    static findById(id: string): Promise<any | null>;
    static findByShortCode(shortCode: string): Promise<any | null>;
    static update(id: string, data: any): Promise<any>;
    static delete(id: string): Promise<void>;
    static list(accountId: string, filters?: any): Promise<any[]>;
    static processSmartLink(shortCode: string, requestData: any): Promise<{
        redirect: boolean;
        targetUrl?: string;
        targetId?: string;
        reason?: string;
    }>;
    private static applyFilters;
    private static applyRules;
    private static selectTarget;
    private static selectABTestTarget;
    private static selectGeoTargetedTarget;
    private static selectDeviceTargetedTarget;
    private static selectTimeTargetedTarget;
    private static evaluateConditions;
    private static evaluateCondition;
    private static getFieldValue;
    private static isCountryBlocked;
    private static isDeviceBlocked;
    private static isTimeBlocked;
    private static isIPBlocked;
    private static isReferrerBlocked;
    private static recordClick;
    private static fireTrackingPixels;
    private static firePixel;
    private static addTrackingParameters;
    static recordConversion(smartLinkId: string, targetId: string, conversionData: any): Promise<SmartLinkConversion>;
    private static updateStats;
    private static firePostbacks;
    private static generateShortCode;
    static getSmartLinkStats(accountId: string, startDate?: Date, endDate?: Date): Promise<any>;
    static getSmartLinksDashboard(accountId: string): Promise<any>;
    static createDefaultSmartLinks(accountId: string): Promise<any[]>;
}
//# sourceMappingURL=SmartLinks.d.ts.map