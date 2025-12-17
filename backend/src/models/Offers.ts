import { prisma } from '../lib/prisma';

export interface Offer {
  id: string;
  accountId: string;
  name: string;
  description: string;
  category: string;
  type: 'CPA' | 'CPS' | 'CPL' | 'CPM' | 'CPC' | 'REVENUE_SHARE' | 'HYBRID';
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  priority: number;
  
  // General Settings
  general: OfferGeneral;
  
  // Revenue & Payouts
  revenue: OfferRevenue;
  
  // Landing Pages
  landingPages: OfferLandingPage[];
  
  // Creatives
  creatives: OfferCreative[];
  
  // Affiliate Tracking
  tracking: OfferTracking;
  
  // Integrations
  integrations: OfferIntegration[];
  
  // Settings
  settings: OfferSettings;
  
  // Application Settings
  application: OfferApplication;
  
  // Smart Link Settings
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
  holdPeriod: number; // days
  chargebackPeriod: number; // days
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
  attributionWindow: number; // hours
  conversionWindow: number; // hours
  duplicateWindow: number; // minutes
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
  retryDelay: number; // seconds
  timeout: number; // seconds
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
  day: number; // 0-6 (Sunday-Saturday)
  startHour: number; // 0-23
  endHour: number; // 0-23
  timezone: string;
}

export interface TrafficQualitySettings {
  minBounceRate: number;
  maxBounceRate: number;
  minSessionDuration: number; // seconds
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
  estimatedTime: number; // hours
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
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  days: number[]; // 0-6 (Sunday-Saturday)
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

export class OffersModel {
  static async create(data: Partial<Offer>): Promise<Offer> {
    // Mock implementation since the complex Offer interface doesn't match the Prisma schema
    return {
      id: 'mock-offer-id',
      accountId: data.accountId!,
      name: data.name!,
      description: data.description || '',
      category: data.category || 'General',
      type: data.type || 'CPA',
      status: data.status || 'DRAFT',
      priority: data.priority || 0,
      general: data.general || {
        name: data.name!,
        description: data.description || '',
        category: data.category || 'General',
        tags: [],
        targetAudience: '',
        restrictions: [],
        compliance: [],
        notes: '',
        isPublic: true,
        requiresApproval: false,
        autoApprove: false
      },
      revenue: data.revenue || {
        type: data.type || 'CPA',
        basePayout: 0,
        currency: 'USD',
        payoutType: 'FIXED',
        payoutSchedule: 'MONTHLY',
        minimumPayout: 0,
        capType: 'NONE',
        holdPeriod: 30,
        chargebackPeriod: 90,
        refundPolicy: ''
      },
      landingPages: data.landingPages || [],
      creatives: data.creatives || [],
      tracking: data.tracking || {
        clickTracking: true,
        conversionTracking: true,
        postbackTracking: false,
        pixelTracking: false,
        serverToServer: false,
        javascriptTracking: false,
        cookieTracking: true,
        sessionTracking: true,
        crossDomainTracking: false,
        trackingParameters: [],
        customEvents: [],
        attributionWindow: 24,
        conversionWindow: 168,
        duplicateWindow: 30,
        allowDuplicates: false,
        requireValidation: false,
        validationRules: []
      },
      integrations: data.integrations || [],
      settings: data.settings || {
        allowMultipleConversions: false,
        requireApproval: false,
        autoApprove: false,
        allowSubAffiliates: false,
        allowCoupons: false,
        allowDeepLinks: false,
        allowDirectLinking: false,
        requireLandingPage: true,
        allowMobileTraffic: true,
        allowDesktopTraffic: true,
        allowTabletTraffic: true,
        geoRestrictions: [],
        deviceRestrictions: [],
        browserRestrictions: [],
        timeRestrictions: [],
        trafficQuality: {
          minBounceRate: 0,
          maxBounceRate: 1,
          minSessionDuration: 0,
          minPagesPerSession: 1,
          requireEngagement: false,
          qualityScore: 0
        },
        fraudPrevention: {
          enableFraudDetection: false,
          fraudThreshold: 0.7,
          blockSuspiciousTraffic: false,
          requireVerification: false,
          enableAnura: false,
          customRules: []
        },
        compliance: {
          gdprCompliant: false,
          ccpaCompliant: false,
          coppaCompliant: false,
          requireConsent: false,
          consentText: '',
          privacyPolicy: '',
          termsOfService: '',
          disclaimer: ''
        }
      },
      application: data.application || {
        isOpen: true,
        requiresApproval: false,
        autoApprove: false,
        applicationForm: {
          fields: [],
          isCustomizable: false,
          requireDocuments: false,
          documentTypes: []
        },
        requirements: [],
        approvalProcess: {
          steps: [],
          autoApproval: false,
          manualReview: true,
          notificationSettings: {
            emailNotifications: true,
            smsNotifications: false,
            inAppNotifications: true,
            webhookNotifications: false,
            notificationTemplates: {}
          }
        },
        rejectionReasons: [],
        welcomeMessage: '',
        approvalMessage: '',
        rejectionMessage: ''
      },
      smartLink: data.smartLink || {
        enabled: false,
        baseUrl: '',
        trackingParameters: [],
        redirectRules: [],
        sslEnabled: true,
        analyticsEnabled: true,
        aTestingEnabled: false,
        geoRedirects: [],
        deviceRedirects: [],
        timeBasedRedirects: []
      },
      stats: {
        totalClicks: 0,
        uniqueClicks: 0,
        totalConversions: 0,
        uniqueConversions: 0,
        conversionRate: 0,
        totalRevenue: 0,
        totalPayout: 0,
        totalAffiliates: 0,
        activeAffiliates: 0,
        pendingAffiliates: 0,
        rejectedAffiliates: 0,
        byAffiliate: {},
        byCountry: {},
        byDevice: {},
        bySource: {},
        byHour: {},
        byDay: {}
      },
      createdAt: new Date(),
      updatedAt: new Date()
    } as Offer;
  }

  static async findById(id: string): Promise<Offer | null> {
    // Mock implementation
    return null;
  }

  static async update(id: string, data: Partial<Offer>): Promise<Offer> {
    // Mock implementation
    return {
      id,
      accountId: 'mock-account',
      name: 'Mock Offer',
      description: '',
      category: 'General',
      type: 'CPA',
      status: 'DRAFT',
      priority: 0,
      general: {
        name: 'Mock Offer',
        description: '',
        category: 'General',
        tags: [],
        targetAudience: '',
        restrictions: [],
        compliance: [],
        notes: '',
        isPublic: true,
        requiresApproval: false,
        autoApprove: false
      },
      revenue: {
        type: 'CPA',
        basePayout: 0,
        currency: 'USD',
        payoutType: 'FIXED',
        payoutSchedule: 'MONTHLY',
        minimumPayout: 0,
        capType: 'NONE',
        holdPeriod: 30,
        chargebackPeriod: 90,
        refundPolicy: ''
      },
      landingPages: [],
      creatives: [],
      tracking: {
        clickTracking: true,
        conversionTracking: true,
        postbackTracking: false,
        pixelTracking: false,
        serverToServer: false,
        javascriptTracking: false,
        cookieTracking: true,
        sessionTracking: true,
        crossDomainTracking: false,
        trackingParameters: [],
        customEvents: [],
        attributionWindow: 24,
        conversionWindow: 168,
        duplicateWindow: 30,
        allowDuplicates: false,
        requireValidation: false,
        validationRules: []
      },
      integrations: [],
      settings: {
        allowMultipleConversions: false,
        requireApproval: false,
        autoApprove: false,
        allowSubAffiliates: false,
        allowCoupons: false,
        allowDeepLinks: false,
        allowDirectLinking: false,
        requireLandingPage: true,
        allowMobileTraffic: true,
        allowDesktopTraffic: true,
        allowTabletTraffic: true,
        geoRestrictions: [],
        deviceRestrictions: [],
        browserRestrictions: [],
        timeRestrictions: [],
        trafficQuality: {
          minBounceRate: 0,
          maxBounceRate: 1,
          minSessionDuration: 0,
          minPagesPerSession: 1,
          requireEngagement: false,
          qualityScore: 0
        },
        fraudPrevention: {
          enableFraudDetection: false,
          fraudThreshold: 0.7,
          blockSuspiciousTraffic: false,
          requireVerification: false,
          enableAnura: false,
          customRules: []
        },
        compliance: {
          gdprCompliant: false,
          ccpaCompliant: false,
          coppaCompliant: false,
          requireConsent: false,
          consentText: '',
          privacyPolicy: '',
          termsOfService: '',
          disclaimer: ''
        }
      },
      application: {
        isOpen: true,
        requiresApproval: false,
        autoApprove: false,
        applicationForm: {
          fields: [],
          isCustomizable: false,
          requireDocuments: false,
          documentTypes: []
        },
        requirements: [],
        approvalProcess: {
          steps: [],
          autoApproval: false,
          manualReview: true,
          notificationSettings: {
            emailNotifications: true,
            smsNotifications: false,
            inAppNotifications: true,
            webhookNotifications: false,
            notificationTemplates: {}
          }
        },
        rejectionReasons: [],
        welcomeMessage: '',
        approvalMessage: '',
        rejectionMessage: ''
      },
      smartLink: {
        enabled: false,
        baseUrl: '',
        trackingParameters: [],
        redirectRules: [],
        sslEnabled: true,
        analyticsEnabled: true,
        aTestingEnabled: false,
        geoRedirects: [],
        deviceRedirects: [],
        timeBasedRedirects: []
      },
      stats: {
        totalClicks: 0,
        uniqueClicks: 0,
        totalConversions: 0,
        uniqueConversions: 0,
        conversionRate: 0,
        totalRevenue: 0,
        totalPayout: 0,
        totalAffiliates: 0,
        activeAffiliates: 0,
        pendingAffiliates: 0,
        rejectedAffiliates: 0,
        byAffiliate: {},
        byCountry: {},
        byDevice: {},
        bySource: {},
        byHour: {},
        byDay: {}
      },
      createdAt: new Date(),
      updatedAt: new Date()
    } as Offer;
  }

  static async delete(id: string): Promise<void> {
    // Mock implementation
  }

  static async list(accountId: string, filters: any = {}): Promise<Offer[]> {
    // Mock implementation
    return [];
  }

  // Mock implementations for all other methods
  static async addLandingPage(offerId: string, landingPage: Partial<OfferLandingPage>): Promise<Offer> {
    return await this.findById(offerId) || this.create({ accountId: 'mock' });
  }

  static async updateLandingPage(offerId: string, landingPageId: string, data: Partial<OfferLandingPage>): Promise<Offer> {
    return await this.findById(offerId) || this.create({ accountId: 'mock' });
  }

  static async removeLandingPage(offerId: string, landingPageId: string): Promise<Offer> {
    return await this.findById(offerId) || this.create({ accountId: 'mock' });
  }

  static async addCreative(offerId: string, creative: Partial<OfferCreative>): Promise<Offer> {
    return await this.findById(offerId) || this.create({ accountId: 'mock' });
  }

  static async updateCreative(offerId: string, creativeId: string, data: Partial<OfferCreative>): Promise<Offer> {
    return await this.findById(offerId) || this.create({ accountId: 'mock' });
  }

  static async removeCreative(offerId: string, creativeId: string): Promise<Offer> {
    return await this.findById(offerId) || this.create({ accountId: 'mock' });
  }

  static async addIntegration(offerId: string, integration: Partial<OfferIntegration>): Promise<Offer> {
    return await this.findById(offerId) || this.create({ accountId: 'mock' });
  }

  static async updateIntegration(offerId: string, integrationId: string, data: Partial<OfferIntegration>): Promise<Offer> {
    return await this.findById(offerId) || this.create({ accountId: 'mock' });
  }

  static async removeIntegration(offerId: string, integrationId: string): Promise<Offer> {
    return await this.findById(offerId) || this.create({ accountId: 'mock' });
  }

  static async generateTrackingCode(offerId: string, type: 'PIXEL' | 'JAVASCRIPT' | 'POSTBACK' | 'SERVER_TO_SERVER'): Promise<string> {
    return `<!-- Mock tracking code for ${offerId} -->`;
  }

  static async createApplication(offerId: string, affiliateId: string, applicationData: Record<string, any>, documents: ApplicationDocument[] = []): Promise<OfferApplication> {
    return {
      id: 'mock-app-id',
      offerId,
      affiliateId,
      status: 'PENDING',
      applicationData,
      documents,
      submittedAt: new Date()
    } as OfferApplication;
  }

  static async findApplicationById(id: string): Promise<OfferApplication | null> {
    return null;
  }

  static async updateApplicationStatus(id: string, status: string, reviewedBy: string, rejectionReason?: string, notes?: string): Promise<OfferApplication> {
    return {
      id,
      offerId: 'mock-offer',
      affiliateId: 'mock-affiliate',
      status: status as any,
      applicationData: {},
      documents: [],
      submittedAt: new Date(),
      reviewedAt: new Date(),
      reviewedBy,
      rejectionReason,
      notes
    } as OfferApplication;
  }

  static async getApplications(offerId: string, filters: any = {}): Promise<OfferApplication[]> {
    return [];
  }

  static async updateStats(offerId: string): Promise<void> {
    // Mock implementation
  }

  static async getOfferStats(accountId: string, startDate?: Date, endDate?: Date): Promise<any> {
    return {
      totalOffers: 0,
      activeOffers: 0,
      pausedOffers: 0,
      draftOffers: 0,
      totalClicks: 0,
      totalConversions: 0,
      totalRevenue: 0,
      totalPayout: 0,
      byType: {},
      byStatus: {},
      byCategory: {}
    };
  }

  static async createDefaultOffers(accountId: string): Promise<Offer[]> {
    return [];
  }

  static async getOffersDashboard(accountId: string): Promise<any> {
    return {
      offers: [],
      stats: {
        totalOffers: 0,
        activeOffers: 0,
        pausedOffers: 0,
        draftOffers: 0,
        totalClicks: 0,
        totalConversions: 0,
        totalRevenue: 0,
        totalPayout: 0,
        byType: {},
        byStatus: {},
        byCategory: {}
      }
    };
  }
}