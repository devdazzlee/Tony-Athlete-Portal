export interface OfferCategory {
    id: string;
    accountId: string;
    name: string;
    description: string;
    order: number;
    status: "ACTIVE" | "INACTIVE";
    createdAt: Date;
    updatedAt: Date;
}
export interface OfferTag {
    id: string;
    accountId: string;
    name: string;
    color: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface OfferGroup {
    id: string;
    accountId: string;
    name: string;
    description: string;
    offers: string[];
    status: "ACTIVE" | "INACTIVE";
    createdAt: Date;
    updatedAt: Date;
}
export interface GroupCriteria {
    categories?: string[];
    tags?: string[];
    countries?: string[];
    devices?: string[];
    dateRange?: {
        startDate: Date;
        endDate: Date;
    };
    customRules?: CustomRule[];
}
export interface CustomRule {
    field: string;
    operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "GREATER_THAN" | "LESS_THAN" | "IN" | "NOT_IN";
    value: any;
    logic: "AND" | "OR";
}
export interface OfferTemplate {
    id: string;
    accountId: string;
    name: string;
    description: string;
    template: any;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface OfferTemplateData {
    name: string;
    description: string;
    categoryId: string;
    tags: string[];
    commissionType: string;
    commissionRate: number;
    payoutType: string;
    payoutAmount: number;
    requirements: string[];
    restrictions: string[];
    creativeAssets: CreativeAsset[];
    trackingSettings: TrackingSettings;
    approvalSettings: ApprovalSettings;
}
export interface CreativeAsset {
    id: string;
    type: "BANNER" | "LOGO" | "TEXT" | "VIDEO" | "AUDIO" | "DOCUMENT";
    name: string;
    url: string;
    size: number;
    mimeType: string;
    dimensions?: {
        width: number;
        height: number;
    };
    alt: string;
    status: "ACTIVE" | "INACTIVE";
}
export interface TrackingSettings {
    clickTracking: boolean;
    conversionTracking: boolean;
    postbackUrl?: string;
    customParameters: Record<string, string>;
    attributionWindow: number;
    cookieLifetime: number;
}
export interface ApprovalSettings {
    requireApproval: boolean;
    autoApprove: boolean;
    approvalWorkflow: string[];
    requiredDocuments: string[];
}
export interface OfferOrganization {
    id: string;
    accountId: string;
    name: string;
    description: string;
    settings: any;
    status: "ACTIVE" | "INACTIVE";
    createdAt: Date;
    updatedAt: Date;
}
export interface OrganizationStructure {
    categories: OfferCategory[];
    tags: OfferTag[];
    groups: OfferGroup[];
    templates: OfferTemplate[];
}
export interface OrganizationRule {
    id: string;
    name: string;
    description: string;
    type: "AUTO_CATEGORIZE" | "AUTO_TAG" | "AUTO_GROUP" | "VALIDATION" | "APPROVAL";
    conditions: RuleCondition[];
    actions: RuleAction[];
    priority: number;
    enabled: boolean;
}
export interface RuleCondition {
    field: string;
    operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "GREATER_THAN" | "LESS_THAN" | "IN" | "NOT_IN";
    value: any;
    logic: "AND" | "OR";
}
export interface RuleAction {
    type: "ASSIGN_CATEGORY" | "ADD_TAG" | "ADD_TO_GROUP" | "VALIDATE" | "REQUIRE_APPROVAL" | "AUTO_APPROVE";
    parameters: Record<string, any>;
    enabled: boolean;
}
export declare class OfferOrganizationModel {
    static createCategory(data: Partial<OfferCategory>): Promise<OfferCategory>;
    static findCategoryById(id: string): Promise<OfferCategory | null>;
    static updateCategory(id: string, data: Partial<OfferCategory>): Promise<OfferCategory>;
    static deleteCategory(id: string): Promise<void>;
    static listCategories(accountId: string, filters?: any): Promise<OfferCategory[]>;
    static getCategoryTree(accountId: string): Promise<OfferCategory[]>;
    private static buildCategoryTree;
    static createTag(data: Partial<OfferTag>): Promise<OfferTag>;
    static findTagById(id: string): Promise<OfferTag | null>;
    static updateTag(id: string, data: Partial<OfferTag>): Promise<OfferTag>;
    static deleteTag(id: string): Promise<void>;
    static listTags(accountId: string, filters?: any): Promise<OfferTag[]>;
    static createGroup(data: Partial<OfferGroup>): Promise<OfferGroup>;
    static findGroupById(id: string): Promise<OfferGroup | null>;
    static updateGroup(id: string, data: Partial<OfferGroup>): Promise<OfferGroup>;
    static deleteGroup(id: string): Promise<void>;
    static listGroups(accountId: string, filters?: any): Promise<OfferGroup[]>;
    static createTemplate(data: Partial<OfferTemplate>): Promise<OfferTemplate>;
    static findTemplateById(id: string): Promise<OfferTemplate | null>;
    static updateTemplate(id: string, data: Partial<OfferTemplate>): Promise<OfferTemplate>;
    static deleteTemplate(id: string): Promise<void>;
    static listTemplates(accountId: string, filters?: any): Promise<OfferTemplate[]>;
    static createOrganization(data: Partial<OfferOrganization>): Promise<OfferOrganization>;
    static findOrganizationById(id: string): Promise<OfferOrganization | null>;
    static updateOrganization(id: string, data: Partial<OfferOrganization>): Promise<OfferOrganization>;
    static deleteOrganization(id: string): Promise<void>;
    static listOrganizations(accountId: string, filters?: any): Promise<OfferOrganization[]>;
    static applyOrganizationRules(offerId: string, organizationId: string): Promise<void>;
    private static evaluateRuleConditions;
    private static evaluateRuleCondition;
    private static getFieldValue;
    private static executeRuleActions;
    static getOrganizationStats(accountId: string): Promise<any>;
    static createDefaultOrganization(accountId: string): Promise<OfferOrganization>;
    static getOrganizationDashboard(accountId: string): Promise<any>;
}
//# sourceMappingURL=OfferOrganization.d.ts.map