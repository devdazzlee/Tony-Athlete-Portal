export interface AttributionModel {
    id: string;
    accountId: string;
    name: string;
    description: string;
    type: "FIRST_CLICK" | "LAST_CLICK" | "LINEAR" | "TIME_DECAY" | "POSITION_BASED" | "CUSTOM";
    settings: AttributionSettings;
    rules: AttributionRule[];
    status: "ACTIVE" | "INACTIVE";
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface AttributionSettings {
    lookbackWindow: number;
    clickLookbackWindow: number;
    conversionLookbackWindow: number;
    includeDirectTraffic: boolean;
    includeOrganicTraffic: boolean;
    includePaidTraffic: boolean;
    includeSocialTraffic: boolean;
    includeEmailTraffic: boolean;
    includeReferralTraffic: boolean;
    customParameters: Record<string, any>;
}
export interface AttributionRule {
    id: string;
    name: string;
    conditions: AttributionCondition[];
    actions: AttributionAction[];
    priority: number;
    enabled: boolean;
}
export interface AttributionCondition {
    field: string;
    operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "GREATER_THAN" | "LESS_THAN" | "IN" | "NOT_IN";
    value: any;
    logic: "AND" | "OR";
}
export interface AttributionAction {
    type: "ASSIGN_CREDIT" | "MODIFY_CREDIT" | "EXCLUDE" | "INCLUDE" | "CUSTOM";
    parameters: Record<string, any>;
    enabled: boolean;
}
export interface AttributionEvent {
    id: string;
    conversionId: string;
    clickId: string;
    affiliateId: string;
    offerId: string;
    credit: number;
    weight: number;
    position: number;
    timestamp: Date;
    data: any;
}
export interface AttributionReport {
    id: string;
    accountId: string;
    name: string;
    description: string;
    modelId: string;
    dateRange: {
        startDate: Date;
        endDate: Date;
    };
    filters: AttributionFilter[];
    metrics: string[];
    dimensions: string[];
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    results: AttributionResults;
    createdAt: Date;
    completedAt?: Date;
}
export interface AttributionFilter {
    field: string;
    operator: string;
    value: any;
}
export interface AttributionResults {
    totalConversions: number;
    totalRevenue: number;
    totalCommissions: number;
    byAffiliate: Record<string, any>;
    byOffer: Record<string, any>;
    byChannel: Record<string, any>;
    byDevice: Record<string, any>;
    byCountry: Record<string, any>;
    timeline: Array<{
        date: string;
        conversions: number;
        revenue: number;
    }>;
    attributionPath: Array<{
        step: number;
        channel: string;
        conversions: number;
        percentage: number;
    }>;
}
export declare class ConversionAttributionModel {
    static createModel(data: Partial<AttributionModel>): Promise<AttributionModel>;
    static findModelById(id: string): Promise<AttributionModel | null>;
    static updateModel(id: string, data: Partial<AttributionModel>): Promise<AttributionModel>;
    static deleteModel(id: string): Promise<void>;
    static listModels(accountId: string, filters?: any): Promise<AttributionModel[]>;
    static calculateAttribution(conversionId: string, modelId: string): Promise<AttributionEvent[]>;
    private static getAttributionPath;
    private static filterClicks;
    private static calculateCredits;
    private static applyCustomRules;
    private static evaluateRuleConditions;
    private static evaluateCondition;
    private static getFieldValue;
    static createReport(data: Partial<AttributionReport>): Promise<AttributionReport>;
    static findReportById(id: string): Promise<AttributionReport | null>;
    static updateReport(id: string, data: Partial<AttributionReport>): Promise<AttributionReport>;
    static deleteReport(id: string): Promise<void>;
    static listReports(accountId: string, filters?: any): Promise<AttributionReport[]>;
    static generateReport(reportId: string): Promise<AttributionReport>;
    private static calculateReportResults;
    static getAttributionStats(accountId: string): Promise<any>;
    static createDefaultModels(accountId: string): Promise<AttributionModel[]>;
    static getConversionAttributionDashboard(accountId: string): Promise<any>;
}
//# sourceMappingURL=ConversionAttribution.d.ts.map