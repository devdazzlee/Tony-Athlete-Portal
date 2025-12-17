export interface ConversionType {
    id: string;
    accountId: string;
    name: string;
    description: string;
    code: string;
    category: "SALE" | "LEAD" | "SIGNUP" | "DOWNLOAD" | "CLICK" | "VIEW" | "CUSTOM";
    value: ConversionValue;
    tracking: TrackingSettings;
    validation: ValidationSettings;
    attribution: AttributionSettings;
    status: "ACTIVE" | "INACTIVE";
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface ConversionValue {
    type: "FIXED" | "PERCENTAGE" | "DYNAMIC" | "CUSTOM";
    fixedAmount?: number;
    percentage?: number;
    field?: string;
    formula?: string;
    currency: string;
    minimumValue?: number;
    maximumValue?: number;
}
export interface TrackingSettings {
    method: "PIXEL" | "POSTBACK" | "API" | "JAVASCRIPT" | "SERVER_TO_SERVER";
    pixelCode?: string;
    postbackUrl?: string;
    apiEndpoint?: string;
    javascriptCode?: string;
    parameters: Record<string, string>;
    customFields: Record<string, any>;
    requireValidation: boolean;
    allowDuplicates: boolean;
    duplicateWindow: number;
}
export interface ValidationSettings {
    enabled: boolean;
    rules: ValidationRule[];
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
}
export interface ValidationRule {
    id: string;
    name: string;
    type: "REQUIRED_FIELD" | "FIELD_FORMAT" | "FIELD_VALUE" | "CUSTOM_LOGIC";
    field: string;
    operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "GREATER_THAN" | "LESS_THAN" | "REGEX";
    value: any;
    message: string;
    enabled: boolean;
}
export interface AttributionSettings {
    enabled: boolean;
    lookbackWindow: number;
    clickLookbackWindow: number;
    attributionModel: string;
    includeDirectTraffic: boolean;
    includeOrganicTraffic: boolean;
    includePaidTraffic: boolean;
    includeSocialTraffic: boolean;
    includeEmailTraffic: boolean;
    includeReferralTraffic: boolean;
    customRules: AttributionRule[];
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
export interface ConversionEvent {
    id: string;
    conversionTypeId: string;
    affiliateId: string;
    offerId: string;
    clickId?: string;
    userId?: string;
    sessionId?: string;
    value: number;
    currency: string;
    status: "PENDING" | "VALIDATED" | "APPROVED" | "REJECTED" | "FRAUD";
    data: any;
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
    validatedAt?: Date;
    approvedAt?: Date;
    rejectedAt?: Date;
    rejectionReason?: string;
}
export interface ConversionValidation {
    id: string;
    conversionEventId: string;
    ruleId: string;
    status: "PASSED" | "FAILED" | "SKIPPED";
    message: string;
    data: any;
    timestamp: Date;
}
export declare class ConversionTypesModel {
    static create(data: Partial<ConversionType>): Promise<ConversionType>;
    static findById(id: string): Promise<ConversionType | null>;
    static findByCode(accountId: string, code: string): Promise<ConversionType | null>;
    static update(id: string, data: Partial<ConversionType>): Promise<ConversionType>;
    static delete(id: string): Promise<void>;
    static list(accountId: string, filters?: any): Promise<ConversionType[]>;
    static createEvent(data: Partial<ConversionEvent>): Promise<ConversionEvent>;
    static findEventById(id: string): Promise<ConversionEvent | null>;
    static updateEvent(id: string, data: Partial<ConversionEvent>): Promise<ConversionEvent>;
    static deleteEvent(id: string): Promise<void>;
    static listEvents(conversionTypeId: string, filters?: any, page?: number, limit?: number): Promise<ConversionEvent[]>;
    static validateEvent(eventId: string): Promise<{
        valid: boolean;
        errors: string[];
        warnings: string[];
    }>;
    private static validateRule;
    private static getFieldValue;
    private static validateFormat;
    private static validateValue;
    static approveEvent(eventId: string, approvedBy: string): Promise<ConversionEvent>;
    static rejectEvent(eventId: string, rejectedBy: string, reason: string): Promise<ConversionEvent>;
    static markAsFraud(eventId: string, markedBy: string, reason: string): Promise<ConversionEvent>;
    static calculateValue(conversionTypeId: string, data: any): Promise<number>;
    private static evaluateFormula;
    static getConversionStats(accountId: string, startDate?: Date, endDate?: Date): Promise<any>;
    static createDefaultTypes(accountId: string): Promise<ConversionType[]>;
    static getConversionTypesDashboard(accountId: string): Promise<any>;
}
//# sourceMappingURL=ConversionTypes.d.ts.map