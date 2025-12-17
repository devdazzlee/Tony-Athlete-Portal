import { TermsConditions, TermsAcceptance, TermsTemplate } from "@prisma/client";
export declare class TermsConditionsModel {
    static create(data: any): Promise<TermsConditions>;
    static findById(id: string): Promise<TermsConditions | null>;
    static findByAccountAndType(accountId: string, type: string): Promise<TermsConditions | null>;
    static update(id: string, data: Partial<TermsConditions>): Promise<TermsConditions>;
    static delete(id: string): Promise<void>;
    static list(accountId: string, filters?: any): Promise<TermsConditions[]>;
    static activate(id: string, userId: string): Promise<TermsConditions>;
    static acceptTerms(termsId: string, userId: string, userRole: string, ipAddress: string, userAgent: string): Promise<TermsAcceptance>;
    static getAcceptanceStatus(termsId: string, userId: string): Promise<{
        accepted: boolean;
        acceptance?: TermsAcceptance;
    }>;
    static getUserAcceptances(userId: string): Promise<TermsAcceptance[]>;
    static getRequiredAcceptances(userId: string, userRole: string, accountId: string): Promise<TermsConditions[]>;
    static createTemplate(data: Partial<TermsTemplate>): Promise<TermsTemplate>;
    static findTemplateById(id: string): Promise<TermsTemplate | null>;
    static listTemplates(filters?: any): Promise<TermsTemplate[]>;
    static generateFromTemplate(templateId: string, accountId: string, variables: Record<string, string>, userId: string): Promise<TermsConditions>;
    static createDefaultTemplates(): Promise<TermsTemplate[]>;
    static getTermsHistory(accountId: string, type: string): Promise<TermsConditions[]>;
    static getAcceptanceStats(termsId: string): Promise<any>;
    static exportTerms(termsId: string): Promise<any>;
    static importTerms(accountId: string, termsData: any, userId: string): Promise<TermsConditions>;
}
//# sourceMappingURL=TermsConditions.d.ts.map