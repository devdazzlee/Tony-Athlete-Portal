export interface TrackingSettings {
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
    landingPage: string;
    fallbackUrl?: string;
    trackingPixels: TrackingPixel[];
    postbackUrls: PostbackUrl[];
}
export interface TrackingParameter {
    id: string;
    name: string;
    value: string;
    type: "STATIC" | "DYNAMIC" | "AFFILIATE" | "OFFER" | "CUSTOM";
    required: boolean;
    defaultValue?: string;
    validation?: ParameterValidation;
}
export interface ParameterValidation {
    type: "REGEX" | "LENGTH" | "FORMAT" | "CUSTOM";
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    message: string;
}
export interface TrackingRule {
    id: string;
    name: string;
    conditions: TrackingCondition[];
    actions: TrackingAction[];
    priority: number;
    enabled: boolean;
}
export interface TrackingCondition {
    field: string;
    operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "GREATER_THAN" | "LESS_THAN" | "IN" | "NOT_IN" | "REGEX";
    value: any;
    logic: "AND" | "OR";
}
export interface TrackingAction {
    type: "REDIRECT" | "BLOCK" | "MODIFY_URL" | "ADD_PARAMETER" | "REMOVE_PARAMETER" | "CUSTOM";
    parameters: Record<string, any>;
    enabled: boolean;
}
export interface CustomFilter {
    id: string;
    name: string;
    type: "GEO" | "DEVICE" | "TIME" | "IP" | "REFERRER" | "CUSTOM";
    conditions: TrackingCondition[];
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
export interface TrackingStats {
    totalClicks: number;
    uniqueClicks: number;
    conversions: number;
    revenue: number;
    commission: number;
    conversionRate: number;
    lastClick?: Date;
    lastConversion?: Date;
    byCountry: Record<string, number>;
    byDevice: Record<string, number>;
    bySource: Record<string, number>;
    byHour: Record<string, number>;
    byDay: Record<string, number>;
}
export interface ClickEvent {
    id: string;
    trackingLinkId: string;
    affiliateId: string;
    offerId: string;
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
export interface ConversionEvent {
    id: string;
    trackingLinkId: string;
    clickEventId: string;
    affiliateId: string;
    offerId: string;
    value: number;
    commission: number;
    timestamp: Date;
    data: any;
}
export declare class TrackingLinksModel {
    static create(data: any): Promise<any>;
    static findById(id: string): Promise<any | null>;
    static findByTrackingUrl(trackingUrl: string): Promise<any | null>;
    static update(id: string, data: any): Promise<any>;
    static delete(id: string): Promise<void>;
    static list(accountId: string, filters?: any): Promise<any[]>;
    static processClick(trackingUrl: string, clickData: any): Promise<{
        redirect: boolean;
        url?: string;
        reason?: string;
    }>;
    private static applyFilters;
    private static applyRules;
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
    private static evaluateCustomParameter;
    static recordConversion(trackingLinkId: string, conversionData: any): Promise<ConversionEvent>;
    private static updateStats;
    private static firePostbacks;
    static generateTrackingUrl(accountId: string, affiliateId: string, offerId: string): Promise<string>;
    static generateShortUrl(trackingUrl: string): Promise<string>;
    static getTrackingStats(accountId: string, startDate?: Date, endDate?: Date): Promise<any>;
    static getTrackingLinksDashboard(accountId: string): Promise<any>;
}
//# sourceMappingURL=TrackingLinks.d.ts.map