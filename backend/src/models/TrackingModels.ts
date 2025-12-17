import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Tracking Website Model
export interface TrackingWebsite {
  id: string;
  accountId: string;
  name: string;
  domain: string;
  description?: string;
  settings: {
    trackClicks: boolean;
    trackScrolls: boolean;
    trackForms: boolean;
    trackPageViews: boolean;
    trackConversions: boolean;
    respectDoNotTrack: boolean;
    anonymizeIP: boolean;
  };
  status: "ACTIVE" | "PAUSED" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

// Tracking Session Model
export interface TrackingSession {
  id: string;
  websiteId: string;
  userId?: string;
  startTime: Date;
  lastActivity: Date;
  userAgent: string;
  ipAddress: string;
  country: string;
  city: string;
  device: {
    type: string;
    browser: string;
    os: string;
    screen: {
      width: number;
      height: number;
    };
  };
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

// Tracking Event Model
export interface TrackingEvent {
  id: string;
  sessionId: string;
  websiteId: string;
  userId?: string;
  eventType: string;
  data: any;
  timestamp: Date;
  page: {
    url: string;
    title: string;
    path: string;
    search: string;
    hash: string;
    referrer?: string;
  };
  device: {
    userAgent: string;
    language: string;
    platform: string;
    screenWidth: number;
    screenHeight: number;
    viewportWidth: number;
    viewportHeight: number;
    colorDepth: number;
    timezone: string;
  };
  browser: {
    browser: string;
    version: string;
  };
  location?: {
    country: string;
    region: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };
}

// Tracking Statistics Model
export interface TrackingStats {
  id: string;
  websiteId: string;
  date: string;
  pageViews: number;
  uniqueVisitors: number;
  clicks: number;
  conversions: number;
  bounceRate: number;
  avgSessionDuration: number;
  otherEvents: number;
  createdAt: Date;
  updatedAt: Date;
}

// Conversion Model
export interface Conversion {
  id: string;
  websiteId: string;
  sessionId: string;
  userId?: string;
  eventId: string;
  conversionType: string;
  value?: number;
  currency?: string;
  data: any;
  timestamp: Date;
  page: {
    url: string;
    title: string;
    path: string;
  };
}

// Heatmap Data Model
export interface HeatmapData {
  id: string;
  websiteId: string;
  page: string;
  x: number;
  y: number;
  clicks: number;
  timestamp: Date;
}

// Funnel Step Model
export interface FunnelStep {
  id: string;
  websiteId: string;
  name: string;
  eventType: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Goal Model
export interface Goal {
  id: string;
  websiteId: string;
  name: string;
  description?: string;
  eventType: string;
  conditions: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Alert Model
export interface Alert {
  id: string;
  websiteId: string;
  name: string;
  description?: string;
  type: "THRESHOLD" | "ANOMALY" | "GOAL" | "CUSTOM";
  conditions: any;
  isActive: boolean;
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Export Model
export interface Export {
  id: string;
  websiteId: string;
  type: "EVENTS" | "SESSIONS" | "CONVERSIONS" | "STATS";
  format: "CSV" | "JSON" | "XLSX";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  filters: any;
  fileUrl?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Real-time Analytics Model
export interface RealtimeAnalytics {
  websiteId: string;
  timestamp: Date;
  activeSessions: number;
  activeUsers: number;
  pageViews: number;
  events: number;
  topPages: Array<{
    page: string;
    views: number;
  }>;
  topReferrers: Array<{
    referrer: string;
    visits: number;
  }>;
  topCountries: Array<{
    country: string;
    visitors: number;
  }>;
  topDevices: Array<{
    device: string;
    count: number;
  }>;
}

// User Journey Model
export interface UserJourney {
  sessionId: string;
  websiteId: string;
  userId?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  pageViews: number;
  eventCount: number;
  conversions: number;
  pages: Array<{
    url: string;
    title: string;
    timestamp: Date;
    duration: number;
  }>;
  events: Array<{
    type: string;
    data: any;
    timestamp: Date;
  }>;
  referrer?: string;
  exitPage?: string;
  bounce: boolean;
}

// Attribution Model
export interface Attribution {
  id: string;
  websiteId: string;
  sessionId: string;
  userId?: string;
  conversionId: string;
  touchpoints: Array<{
    type: string;
    source: string;
    medium: string;
    campaign?: string;
    timestamp: Date;
    value: number;
  }>;
  firstTouch: {
    type: string;
    source: string;
    medium: string;
    campaign?: string;
    timestamp: Date;
    value: number;
  };
  lastTouch: {
    type: string;
    source: string;
    medium: string;
    campaign?: string;
    timestamp: Date;
    value: number;
  };
  totalValue: number;
  createdAt: Date;
}

// Cohort Analysis Model
export interface CohortAnalysis {
  id: string;
  websiteId: string;
  cohortDate: string;
  cohortSize: number;
  retention: Array<{
    period: number;
    users: number;
    percentage: number;
  }>;
  revenue: Array<{
    period: number;
    revenue: number;
    averageRevenue: number;
  }>;
  createdAt: Date;
}

// A/B Test Model
export interface ABTest {
  id: string;
  websiteId: string;
  name: string;
  description?: string;
  status: "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED";
  variants: Array<{
    id: string;
    name: string;
    traffic: number;
    isControl: boolean;
  }>;
  metrics: Array<{
    name: string;
    type: "CONVERSION" | "REVENUE" | "ENGAGEMENT";
    goal: number;
  }>;
  startDate: Date;
  endDate?: Date;
  results?: {
    winner?: string;
    confidence: number;
    lift: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Custom Event Model
export interface CustomEvent {
  id: string;
  websiteId: string;
  name: string;
  description?: string;
  eventType: string;
  conditions: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Segment Model
export interface Segment {
  id: string;
  websiteId: string;
  name: string;
  description?: string;
  conditions: any;
  isActive: boolean;
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Dashboard Widget Model
export interface DashboardWidget {
  id: string;
  websiteId: string;
  name: string;
  type: "CHART" | "TABLE" | "KPI" | "HEATMAP" | "FUNNEL";
  config: any;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API Key Model
export interface APIKey {
  id: string;
  websiteId: string;
  name: string;
  key: string;
  permissions: string[];
  isActive: boolean;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Webhook Model
export interface Webhook {
  id: string;
  websiteId: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  lastTriggered?: Date;
  successRate: number;
  totalCalls: number;
  createdAt: Date;
  updatedAt: Date;
}

// Integration Model
export interface Integration {
  id: string;
  websiteId: string;
  type:
    | "GOOGLE_ANALYTICS"
    | "FACEBOOK_PIXEL"
    | "HOTJAR"
    | "MIXPANEL"
    | "CUSTOM";
  config: any;
  isActive: boolean;
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Data Retention Policy Model
export interface DataRetentionPolicy {
  id: string;
  websiteId: string;
  eventTypes: string[];
  retentionDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Privacy Settings Model
export interface PrivacySettings {
  id: string;
  websiteId: string;
  respectDoNotTrack: boolean;
  anonymizeIP: boolean;
  cookieConsent: boolean;
  gdprCompliant: boolean;
  dataProcessingAgreement: boolean;
  privacyPolicyUrl?: string;
  cookiePolicyUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Performance Metrics Model
export interface PerformanceMetrics {
  id: string;
  websiteId: string;
  date: string;
  pageLoadTime: number;
  bounceRate: number;
  avgSessionDuration: number;
  pagesPerSession: number;
  newUserPercentage: number;
  returnUserPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

// Error Tracking Model
export interface ErrorTracking {
  id: string;
  websiteId: string;
  sessionId: string;
  userId?: string;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  page: {
    url: string;
    title: string;
  };
  browser: {
    browser: string;
    version: string;
  };
  timestamp: Date;
  isResolved: boolean;
  resolvedAt?: Date;
}

// Feature Flag Model
export interface FeatureFlag {
  id: string;
  websiteId: string;
  name: string;
  description?: string;
  isActive: boolean;
  conditions: any;
  createdAt: Date;
  updatedAt: Date;
}

// Audit Log Model
export interface AuditLog {
  id: string;
  websiteId: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export { prisma };
