export interface Offer {
    id: string;
    accountId: string;
    name: string;
    description: string;
    category: string;
    type: 'CPA' | 'CPS' | 'CPL' | 'CPM' | 'CPC' | 'REVENUE_SHARE' | 'HYBRID';
    status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
    priority: number;
    general: OfferGeneral;
    revenue: OfferRevenue;
    landingPages: OfferLandingPage[];
    creatives: OfferCreative[];
    tracking: OfferTracking;
    integrations: OfferIntegration[];
    settings: OfferSettings;
    application: OfferApplication;
    smartLink: OfferSmartLink;
    stats: OfferStats;
    createdAt: Date;
    updatedAt: Date;
}
export interface OfferGeneral {
    name: string;
    description: string;
    category: string;
    subcategory?: string;
    tags: string[];
    targetAudience: string;
    restrictions: string[];
    compliance: string[];
    notes: string;
    isPublic: boolean;
    requiresApproval: boolean;
    autoApprove: boolean;
    maxAffiliates?: number;
    minTraffic?: number;
    minConversions?: number;
}
export interface OfferRevenue {
    type: 'CPA' | 'CPS' | 'CPL' | 'CPM' | 'CPC' | 'REVENUE_SHARE' | 'HYBRID';
    basePayout: number;
    currency: string;
    payoutType: 'FIXED' | 'PERCENTAGE' | 'TIERED';
    payoutSchedule: 'IMMEDIATE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    minimumPayout: number;
    maximumPayout?: number;
    tieredRates?: TieredRate[];
    revenueShare?: number;
    capType: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
    capAmount?: number;
    holdPeriod: number;
    chargebackPeriod: number;
    refundPolicy: string;
}
export interface TieredRate {
    min: number;
    max?: number;
    rate: number;
    type: 'FIXED' | 'PERCENTAGE';
}
export interface OfferLandingPage {
    id: string;
    name: string;
    url: string;
    type: 'PRIMARY' | 'BACKUP' | 'MOBILE' | 'DESKTOP';
    isDefault: boolean;
    weight: number;
    conditions: LandingPageCondition[];
    status: 'ACTIVE' | 'INACTIVE';
}
export interface LandingPageCondition {
    field: string;
    operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'IN' | 'NOT_IN';
    value: any;
}
export interface OfferCreative {
    id: string;
    name: string;
    type: 'BANNER' | 'TEXT' | 'EMAIL' | 'VIDEO' | 'AUDIO' | 'POPUP' | 'OVERLAY';
    format: string;
    size: string;
    url: string;
    thumbnail?: string;
    altText?: string;
    title?: string;
    description?: string;
    htmlCode?: string;
    javascriptCode?: string;
    cssCode?: string;
    isActive: boolean;
    isDefault: boolean;
    weight: number;
    restrictions: string[];
    trackingCode?: string;
}
export interface OfferTracking {
    clickTracking: boolean;
    conversionTracking: boolean;
    postbackTracking: boolean;
    pixelTracking: boolean;
    serverToServer: boolean;
    javascriptTracking: boolean;
    cookieTracking: boolean;
    sessionTracking: boolean;
    crossDomainTracking: boolean;
    trackingDomain?: string;
    trackingParameters: TrackingParameter[];
    customEvents: CustomEvent[];
    attributionWindow: number;
    conversionWindow: number;
    duplicateWindow: number;
    allowDuplicates: boolean;
    requireValidation: boolean;
    validationRules: ValidationRule[];
}
export interface TrackingParameter {
    name: string;
    value: string;
    type: 'STATIC' | 'DYNAMIC' | 'CUSTOM';
    required: boolean;
    description?: string;
}
export interface CustomEvent {
    name: string;
    description: string;
    parameters: string[];
    isActive: boolean;
}
export interface ValidationRule {
    field: string;
    operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN' | 'REGEX';
    value: any;
    message: string;
    isActive: boolean;
}
export interface OfferIntegration {
    id: string;
    name: string;
    type: 'WEBHOOK' | 'API' | 'PIXEL' | 'POSTBACK' | 'EMAIL' | 'SMS';
    url?: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers: Record<string, string>;
    parameters: Record<string, string>;
    authentication: {
        type: 'NONE' | 'BASIC' | 'BEARER' | 'API_KEY' | 'OAUTH';
        credentials?: Record<string, string>;
    };
    isActive: boolean;
    retryAttempts: number;
    retryDelay: number;
    timeout: number;
    events: string[];
    conditions: IntegrationCondition[];
}
export interface IntegrationCondition {
    field: string;
    operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN';
    value: any;
}
export interface OfferSettings {
    allowMultipleConversions: boolean;
    requireApproval: boolean;
    autoApprove: boolean;
    allowSubAffiliates: boolean;
    allowCoupons: boolean;
    allowDeepLinks: boolean;
    allowDirectLinking: boolean;
    requireLandingPage: boolean;
    allowMobileTraffic: boolean;
    allowDesktopTraffic: boolean;
    allowTabletTraffic: boolean;
    geoRestrictions: string[];
    deviceRestrictions: string[];
    browserRestrictions: string[];
    timeRestrictions: TimeRestriction[];
    trafficQuality: TrafficQualitySettings;
    fraudPrevention: FraudPreventionSettings;
    compliance: ComplianceSettings;
}
export interface TimeRestriction {
    day: number;
    startHour: number;
    endHour: number;
    timezone: string;
}
export interface TrafficQualitySettings {
    minBounceRate: number;
    maxBounceRate: number;
    minSessionDuration: number;
    minPagesPerSession: number;
    requireEngagement: boolean;
    qualityScore: number;
}
export interface FraudPreventionSettings {
    enableFraudDetection: boolean;
    fraudThreshold: number;
    blockSuspiciousTraffic: boolean;
    requireVerification: boolean;
    enableAnura: boolean;
    customRules: FraudRule[];
}
export interface FraudRule {
    name: string;
    condition: string;
    action: 'ALLOW' | 'BLOCK' | 'FLAG' | 'REVIEW';
    weight: number;
}
export interface ComplianceSettings {
    gdprCompliant: boolean;
    ccpaCompliant: boolean;
    coppaCompliant: boolean;
    requireConsent: boolean;
    consentText: string;
    privacyPolicy: string;
    termsOfService: string;
    disclaimer: string;
}
export interface OfferApplication {
    isOpen: boolean;
    requiresApproval: boolean;
    autoApprove: boolean;
    applicationForm: ApplicationForm;
    requirements: ApplicationRequirement[];
    approvalProcess: ApprovalProcess;
    rejectionReasons: string[];
    welcomeMessage: string;
    approvalMessage: string;
    rejectionMessage: string;
}
export interface ApplicationForm {
    fields: ApplicationField[];
    isCustomizable: boolean;
    requireDocuments: boolean;
    documentTypes: string[];
}
export interface ApplicationField {
    name: string;
    label: string;
    type: 'TEXT' | 'EMAIL' | 'PHONE' | 'URL' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX' | 'RADIO' | 'FILE';
    required: boolean;
    options?: string[];
    validation?: string;
    placeholder?: string;
    helpText?: string;
}
export interface ApplicationRequirement {
    type: 'MINIMUM_TRAFFIC' | 'MINIMUM_CONVERSIONS' | 'WEBSITE_QUALITY' | 'EXPERIENCE' | 'DOCUMENTS' | 'CUSTOM';
    value: any;
    description: string;
    isRequired: boolean;
}
export interface ApprovalProcess {
    steps: ApprovalStep[];
    autoApproval: boolean;
    manualReview: boolean;
    notificationSettings: NotificationSettings;
}
export interface ApprovalStep {
    name: string;
    description: string;
    order: number;
    isRequired: boolean;
    estimatedTime: number;
    assignedTo?: string;
}
export interface NotificationSettings {
    emailNotifications: boolean;
    smsNotifications: boolean;
    inAppNotifications: boolean;
    webhookNotifications: boolean;
    notificationTemplates: Record<string, string>;
}
export interface OfferSmartLink {
    enabled: boolean;
    baseUrl: string;
    shortDomain?: string;
    trackingParameters: string[];
    redirectRules: SmartLinkRule[];
    fallbackUrl?: string;
    customDomain?: string;
    sslEnabled: boolean;
    analyticsEnabled: boolean;
    aTestingEnabled: boolean;
    geoRedirects: GeoRedirect[];
    deviceRedirects: DeviceRedirect[];
    timeBasedRedirects: TimeBasedRedirect[];
}
export interface SmartLinkRule {
    id: string;
    name: string;
    conditions: SmartLinkCondition[];
    actions: SmartLinkAction[];
    priority: number;
    isActive: boolean;
}
export interface SmartLinkCondition {
    field: string;
    operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'IN' | 'NOT_IN' | 'GREATER_THAN' | 'LESS_THAN';
    value: any;
}
export interface SmartLinkAction {
    type: 'REDIRECT' | 'BLOCK' | 'MODIFY_URL' | 'ADD_PARAMETER' | 'REMOVE_PARAMETER';
    parameters: Record<string, any>;
}
export interface GeoRedirect {
    country: string;
    url: string;
    isActive: boolean;
}
export interface DeviceRedirect {
    device: 'MOBILE' | 'TABLET' | 'DESKTOP';
    url: string;
    isActive: boolean;
}
export interface TimeBasedRedirect {
    startTime: string;
    endTime: string;
    days: number[];
    url: string;
    isActive: boolean;
}
export interface OfferStats {
    totalClicks: number;
    uniqueClicks: number;
    totalConversions: number;
    uniqueConversions: number;
    conversionRate: number;
    totalRevenue: number;
    totalPayout: number;
    totalAffiliates: number;
    activeAffiliates: number;
    pendingAffiliates: number;
    rejectedAffiliates: number;
    lastClick?: Date;
    lastConversion?: Date;
    byAffiliate: Record<string, any>;
    byCountry: Record<string, any>;
    byDevice: Record<string, any>;
    bySource: Record<string, any>;
    byHour: Record<number, any>;
    byDay: Record<string, any>;
}
export interface OfferApplication {
    id: string;
    offerId: string;
    affiliateId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
    applicationData: Record<string, any>;
    documents: ApplicationDocument[];
    submittedAt: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
    rejectionReason?: string;
    notes?: string;
}
export interface ApplicationDocument {
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
    uploadedAt: Date;
}
export declare class OffersModel {
    static create(data: Partial<Offer>): Promise<Offer>;
    static findById(id: string): Promise<Offer | null>;
    static update(id: string, data: Partial<Offer>): Promise<Offer>;
    static delete(id: string): Promise<void>;
    static list(accountId: string, filters?: any): Promise<Offer[]>;
    static addLandingPage(offerId: string, landingPage: Partial<OfferLandingPage>): Promise<Offer>;
    static updateLandingPage(offerId: string, landingPageId: string, data: Partial<OfferLandingPage>): Promise<Offer>;
    static removeLandingPage(offerId: string, landingPageId: string): Promise<Offer>;
    static addCreative(offerId: string, creative: Partial<OfferCreative>): Promise<Offer>;
    static updateCreative(offerId: string, creativeId: string, data: Partial<OfferCreative>): Promise<Offer>;
    static removeCreative(offerId: string, creativeId: string): Promise<Offer>;
    static addIntegration(offerId: string, integration: Partial<OfferIntegration>): Promise<Offer>;
    static updateIntegration(offerId: string, integrationId: string, data: Partial<OfferIntegration>): Promise<Offer>;
    static removeIntegration(offerId: string, integrationId: string): Promise<Offer>;
    static generateTrackingCode(offerId: string, type: 'PIXEL' | 'JAVASCRIPT' | 'POSTBACK' | 'SERVER_TO_SERVER'): Promise<string>;
    static createApplication(offerId: string, affiliateId: string, applicationData: Record<string, any>, documents?: ApplicationDocument[]): Promise<OfferApplication>;
    static findApplicationById(id: string): Promise<OfferApplication | null>;
    static updateApplicationStatus(id: string, status: string, reviewedBy: string, rejectionReason?: string, notes?: string): Promise<OfferApplication>;
    static getApplications(offerId: string, filters?: any): Promise<OfferApplication[]>;
    static updateStats(offerId: string): Promise<void>;
    static getOfferStats(accountId: string, startDate?: Date, endDate?: Date): Promise<any>;
    static createDefaultOffers(accountId: string): Promise<Offer[]>;
    static getOffersDashboard(accountId: string): Promise<any>;
}
//# sourceMappingURL=Offers.d.ts.map