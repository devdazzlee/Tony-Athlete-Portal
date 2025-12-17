export interface PaymentMethod {
    id: string;
    accountId: string;
    name: string;
    type: "PAYPAL" | "STRIPE" | "BANK_TRANSFER" | "WISE" | "CRYPTO" | "CHECK" | "WIRE_TRANSFER" | "CUSTOM";
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    settings: PaymentMethodSettings;
    fees: PaymentFees;
    limits: PaymentLimits;
    requirements: PaymentRequirements;
    supportedCurrencies: string[];
    processingTime: string;
    description: string;
    instructions: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface PaymentMethodSettings {
    apiKey?: string;
    apiSecret?: string;
    webhookSecret?: string;
    sandboxMode: boolean;
    customFields: Record<string, any>;
    additionalSettings: Record<string, any>;
}
export interface PaymentFees {
    fixedFee: number;
    percentageFee: number;
    minimumFee: number;
    maximumFee: number;
    currency: string;
}
export interface PaymentLimits {
    minimumAmount: number;
    maximumAmount: number;
    dailyLimit: number;
    monthlyLimit: number;
    currency: string;
}
export interface PaymentRequirements {
    kycRequired: boolean;
    bankAccountRequired: boolean;
    taxIdRequired: boolean;
    addressRequired: boolean;
    phoneRequired: boolean;
    additionalDocuments: string[];
}
export interface PaymentMethodUsage {
    id: string;
    paymentMethodId: string;
    affiliateId: string;
    totalPayouts: number;
    totalAmount: number;
    lastUsed: Date;
    successRate: number;
    averageProcessingTime: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare class PaymentMethodsModel {
    static create(data: any): Promise<any>;
    static findById(id: string): Promise<any | null>;
    static update(id: string, data: any): Promise<any>;
    static delete(id: string): Promise<void>;
    static list(accountId: string, filters?: any): Promise<any[]>;
    static getActiveMethods(accountId: string): Promise<any[]>;
    static calculateFees(paymentMethodId: string, amount: number, currency: string): Promise<{
        totalFees: number;
        netAmount: number;
        breakdown: any;
    }>;
    static validatePayment(paymentMethodId: string, amount: number, currency: string, affiliateId: string): Promise<{
        valid: boolean;
        errors: string[];
    }>;
    static recordUsage(paymentMethodId: string, affiliateId: string, amount: number, success: boolean, processingTime: number): Promise<any>;
    static getUsageStats(paymentMethodId: string): Promise<any>;
    static createDefaultMethods(accountId: string): Promise<any[]>;
    static getAffiliateMethods(affiliateId: string): Promise<any[]>;
    static getMethodComparison(accountId: string): Promise<any[]>;
    static updateMethodStatus(id: string, status: string): Promise<any>;
    static getMethodHealth(accountId: string): Promise<any>;
}
//# sourceMappingURL=PaymentMethods.d.ts.map