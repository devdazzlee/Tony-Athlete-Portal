export interface MLMStructure {
    id: string;
    accountId: string;
    name: string;
    type: string;
    maxLevels: number;
    settings: any;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface MLMCommissionRate {
    tier: number;
    rate: number;
    type: 'PERCENTAGE' | 'FIXED_AMOUNT';
}
export interface MLMRelationship {
    id: string;
    structureId: string;
    sponsorId: string;
    affiliateId: string;
    position: string;
    level: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface MLMCommission {
    id: string;
    conversionId: string;
    affiliateId: string;
    amount: number;
    rate: number;
    status: 'PENDING' | 'APPROVED' | 'PAID';
    createdAt: Date;
    updatedAt: Date;
}
export declare class MLMModel {
    static createStructure(data: Partial<MLMStructure>): Promise<MLMStructure>;
    static findStructureById(id: string): Promise<MLMStructure | null>;
    static updateStructure(id: string, data: Partial<MLMStructure>): Promise<MLMStructure>;
    static createRelationship(data: Partial<MLMRelationship>): Promise<MLMRelationship>;
    static findRelationshipByAffiliate(affiliateId: string, structureId: string): Promise<MLMRelationship | null>;
    static getDownline(affiliateId: string, structureId: string, maxLevels?: number): Promise<MLMRelationship[]>;
    static getUpline(affiliateId: string, structureId: string): Promise<MLMRelationship[]>;
    static calculateMLMCommissions(conversionId: string, affiliateId: string, amount: number, structureId: string): Promise<MLMCommission[]>;
    static getMLMStats(affiliateId: string, structureId: string): Promise<any>;
    static getMLMReport(structureId: string, startDate?: Date, endDate?: Date): Promise<any>;
    static approveCommission(commissionId: string): Promise<MLMCommission>;
    static payCommission(commissionId: string): Promise<MLMCommission>;
}
//# sourceMappingURL=MLM.d.ts.map