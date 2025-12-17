export interface AnuraConfig {
    id: string;
    apiKey: string;
    apiSecret: string;
    endpoint: string;
    enabled: boolean;
    settings: AnuraSettings;
    createdAt: Date;
    updatedAt: Date;
}
export interface AnuraSettings {
    fraudThreshold: number;
    qualityThreshold: number;
    autoBlock: boolean;
    notifyOnFraud: boolean;
    notifyOnQuality: boolean;
    webhookUrl?: string;
    customRules: AnuraCustomRule[];
}
export interface AnuraCustomRule {
    name: string;
    condition: string;
    action: "ALLOW" | "BLOCK" | "FLAG" | "REVIEW";
    weight: number;
}
export interface AnuraCheck {
    id: string;
    requestId: string;
    type: "FRAUD" | "QUALITY" | "BOTH";
    data: any;
    result: AnuraResult;
    ipAddress: string;
    userAgent: string;
    affiliateId?: string;
    clickId?: string;
    conversionId?: string;
    timestamp: Date;
}
export interface AnuraResult {
    fraudScore: number;
    qualityScore: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    recommendations: string[];
    blocked: boolean;
    reason?: string;
    details: any;
}
export interface AnuraStats {
    totalChecks: number;
    fraudDetected: number;
    qualityIssues: number;
    blockedRequests: number;
    allowedRequests: number;
    averageFraudScore: number;
    averageQualityScore: number;
    byRiskLevel: Record<string, number>;
    byAffiliate: Record<string, any>;
    byHour: Record<number, any>;
}
export declare class AnuraModel {
    static createConfig(data: Partial<AnuraConfig>): Promise<AnuraConfig>;
    static getConfig(): Promise<AnuraConfig | null>;
    static updateConfig(id: string, data: Partial<AnuraConfig>): Promise<AnuraConfig>;
    static deleteConfig(id: string): Promise<void>;
    static performAnuraCheck(data: any, ipAddress: string, userAgent: string, affiliateId?: string, clickId?: string, conversionId?: string): Promise<AnuraCheck>;
    private static callAnuraAPI;
    private static calculateRiskLevel;
    private static shouldBlock;
    private static generateRequestId;
    static getAnuraChecks(filters?: any, page?: number, limit?: number): Promise<AnuraCheck[]>;
    static getAnuraStats(startDate?: Date, endDate?: Date): Promise<AnuraStats>;
    static updateAnuraSettings(settings: Partial<AnuraSettings>): Promise<AnuraConfig>;
    static testAnuraConnection(): Promise<boolean>;
    static createCustomRule(rule: AnuraCustomRule): Promise<AnuraConfig>;
    static removeCustomRule(ruleName: string): Promise<AnuraConfig>;
}
//# sourceMappingURL=Anura.d.ts.map