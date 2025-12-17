export interface Account {
    id: string;
    name: string;
    domain: string;
    subdomain: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
    plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
    settings: AccountSettings;
    branding: BrandingSettings;
    createdAt: Date;
    updatedAt: Date;
}
export interface AccountSettings {
    timezone: string;
    currency: string;
    language: string;
    dateFormat: string;
    numberFormat: string;
    allowAffiliateRegistration: boolean;
    requireApproval: boolean;
    minimumPayout: number;
    payoutSchedule: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    fraudDetection: boolean;
    qualityControl: boolean;
    mlmEnabled: boolean;
    maxTiers: number;
}
export interface BrandingSettings {
    logo: string;
    favicon: string;
    primaryColor: string;
    secondaryColor: string;
    customCss: string;
    customJs: string;
    footerText: string;
    removeBranding: boolean;
    customDomain: string;
}
export declare class AccountModel {
    static create(data: Partial<Account>): Promise<Account>;
    static findById(id: string): Promise<Account | null>;
    static findBySubdomain(subdomain: string): Promise<Account | null>;
    static update(id: string, data: Partial<Account>): Promise<Account>;
    static delete(id: string): Promise<void>;
    static list(page?: number, limit?: number): Promise<Account[]>;
}
//# sourceMappingURL=Account.d.ts.map