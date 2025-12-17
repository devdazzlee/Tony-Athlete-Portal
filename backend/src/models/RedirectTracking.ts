import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface RedirectCondition {
  id: string;
  field: string;
  operator:
    | "EQUALS"
    | "NOT_EQUALS"
    | "CONTAINS"
    | "STARTS_WITH"
    | "ENDS_WITH"
    | "REGEX"
    | "IN"
    | "NOT_IN";
  value: any;
  logic: "AND" | "OR";
  caseSensitive: boolean;
}

export interface RedirectSettings {
  preserveQueryParams: boolean;
  preserveHash: boolean;
  addTrackingParams: boolean;
  trackingParams: Record<string, string>;
  redirectDelay: number; // milliseconds
  redirectMethod: "IMMEDIATE" | "DELAYED" | "CONDITIONAL";
  customHeaders: Record<string, string>;
  customScripts: string[];
  analytics: AnalyticsSettings;
  seo: SEOSettings;
}

export interface AnalyticsSettings {
  enabled: boolean;
  trackClicks: boolean;
  trackConversions: boolean;
  trackBounceRate: boolean;
  trackTimeOnPage: boolean;
  customEvents: string[];
  goals: AnalyticsGoal[];
}

export interface AnalyticsGoal {
  id: string;
  name: string;
  type: "PAGE_VIEW" | "CLICK" | "FORM_SUBMIT" | "TIME_ON_PAGE" | "CUSTOM";
  conditions: RedirectCondition[];
  value: number;
  enabled: boolean;
}

export interface SEOSettings {
  preserveTitle: boolean;
  preserveDescription: boolean;
  preserveKeywords: boolean;
  customTitle?: string;
  customDescription?: string;
  customKeywords?: string[];
  canonicalUrl?: string;
  robotsMeta?: string;
}

export interface RedirectStats {
  totalRedirects: number;
  uniqueRedirects: number;
  conversions: number;
  revenue: number;
  bounceRate: number;
  averageTimeOnPage: number;
  lastRedirect?: Date;
  lastConversion?: Date;
  byCountry: Record<string, number>;
  byDevice: Record<string, number>;
  bySource: Record<string, number>;
  byHour: Record<string, number>;
  byDay: Record<string, number>;
  byRule: Record<string, number>;
}

export interface RedirectEvent {
  id: string;
  redirectRuleId: string;
  sourceUrl: string;
  targetUrl: string;
  ipAddress: string;
  userAgent: string;
  referrer?: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  queryParams: Record<string, string>;
  headers: Record<string, string>;
  timestamp: Date;
  data: any;
}

export interface ConversionEvent {
  id: string;
  redirectEventId: string;
  redirectRuleId: string;
  value: number;
  currency: string;
  timestamp: Date;
  data: any;
}

export interface BounceEvent {
  id: string;
  redirectEventId: string;
  redirectRuleId: string;
  timeOnPage: number; // seconds
  pagesViewed: number;
  timestamp: Date;
  data: any;
}

export class RedirectTrackingModel {
  static async createRule(data: any): Promise<any> {
    return (await prisma.redirectRule.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        description: data.description || "",
        sourceUrl: data.sourceUrl!,
        targetUrl: data.targetUrl!,
        type: data.type || "PERMANENT",
        status: data.status || "ACTIVE",
        conditions: (data.conditions || []) as any,
        settings: (data.settings || {
          preserveQueryParams: true,
          preserveHash: true,
          addTrackingParams: true,
          trackingParams: {},
          redirectDelay: 0,
          redirectMethod: "IMMEDIATE",
          customHeaders: {},
          customScripts: [],
          analytics: {
            enabled: true,
            trackClicks: true,
            trackConversions: false,
            trackBounceRate: true,
            trackTimeOnPage: true,
            customEvents: [],
            goals: [],
          },
          seo: {
            preserveTitle: true,
            preserveDescription: true,
            preserveKeywords: true,
          },
        }) as any,
        stats: {
          totalRedirects: 0,
          uniqueRedirects: 0,
          conversions: 0,
          revenue: 0,
          bounceRate: 0,
          averageTimeOnPage: 0,
          byCountry: {},
          byDevice: {},
          bySource: {},
          byHour: {},
          byDay: {},
          byRule: {},
        } as any,
      },
    })) as unknown as any;
  }

  static async findRuleById(id: string): Promise<any | null> {
    return (await prisma.redirectRule.findUnique({
      where: { id },
    })) as unknown as any | null;
  }

  static async findRuleBySourceUrl(
    accountId: string,
    sourceUrl: string
  ): Promise<any | null> {
    return (await prisma.redirectRule.findFirst({
      where: {
        accountId,
        sourceUrl,
        status: "ACTIVE",
      },
    })) as unknown as any | null;
  }

  static async updateRule(id: string, data: any): Promise<any> {
    return (await prisma.redirectRule.update({
      where: { id },
      data: {
        ...data,
        conditions: data.conditions as any,
        settings: data.settings as any,
        stats: data.stats as any,
        updatedAt: new Date(),
      },
    })) as unknown as any;
  }

  static async deleteRule(id: string): Promise<void> {
    await prisma.redirectRule.delete({
      where: { id },
    });
  }

  static async listRules(accountId: string, filters: any = {}): Promise<any[]> {
    const where: any = { accountId };

    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;

    return (await prisma.redirectRule.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })) as unknown as any[];
  }

  static async processRedirect(
    sourceUrl: string,
    requestData: any
  ): Promise<{
    redirect: boolean;
    targetUrl?: string;
    statusCode?: number;
    reason?: string;
  }> {
    // Find matching redirect rule
    const rule = await this.findMatchingRule(sourceUrl, requestData);
    if (!rule) {
      return { redirect: false, reason: "No matching redirect rule found" };
    }

    // Check if rule is active
    if (rule.status !== "ACTIVE") {
      return { redirect: false, reason: "Redirect rule is not active" };
    }

    // Evaluate conditions
    const conditionResult = this.evaluateConditions(
      rule.conditions as any,
      requestData
    );
    if (!conditionResult) {
      return { redirect: false, reason: "Conditions not met" };
    }

    // Build target URL
    let targetUrl = rule.targetUrl as string;

    // Preserve query parameters
    if ((rule.settings as any).preserveQueryParams && requestData.queryParams) {
      const targetUrlObj = new URL(targetUrl);
      for (const [key, value] of Object.entries(requestData.queryParams)) {
        targetUrlObj.searchParams.set(key, value as string);
      }
      targetUrl = targetUrlObj.toString();
    }

    // Preserve hash
    if ((rule.settings as any).preserveHash && requestData.hash) {
      targetUrl += requestData.hash;
    }

    // Add tracking parameters
    if ((rule.settings as any).addTrackingParams) {
      targetUrl = this.addTrackingParameters(targetUrl, rule, requestData);
    }

    // Record redirect event
    if (
      (rule.settings as any).analytics.enabled &&
      (rule.settings as any).analytics.trackClicks
    ) {
      await this.recordRedirectEvent(
        rule.id,
        sourceUrl,
        targetUrl,
        requestData
      );
    }

    // Determine status code
    let statusCode = 302; // Temporary redirect
    if (rule.type === "PERMANENT") {
      statusCode = 301;
    } else if (rule.type === "TEMPORARY") {
      statusCode = 302;
    }

    return { redirect: true, targetUrl, statusCode };
  }

  private static async findMatchingRule(
    sourceUrl: string,
    requestData: any
  ): Promise<any | null> {
    // First, try exact match
    let rule = await prisma.redirectRule.findFirst({
      where: {
        sourceUrl,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
    });

    if (rule) {
      return rule as any;
    }

    // Try pattern matching
    const rules = await prisma.redirectRule.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
    });

    for (const r of rules) {
      if (this.matchesPattern(r.sourceUrl, sourceUrl)) {
        return r as any;
      }
    }

    return null;
  }

  private static matchesPattern(pattern: string, url: string): boolean {
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".")
      .replace(/\./g, "\\.");

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(url);
  }

  private static evaluateConditions(
    conditions: RedirectCondition[],
    requestData: any
  ): boolean {
    if (conditions.length === 0) return true;

    let result = true;
    let logic = "AND";

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, requestData);

      if (logic === "AND") {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      logic = condition.logic;
    }

    return result;
  }

  private static evaluateCondition(
    condition: RedirectCondition,
    requestData: any
  ): boolean {
    const value = this.getFieldValue(requestData, condition.field);
    const conditionValue = condition.value;

    let compareValue = value;
    let compareConditionValue = conditionValue;

    if (!condition.caseSensitive) {
      compareValue = String(value).toLowerCase();
      compareConditionValue = String(conditionValue).toLowerCase();
    }

    switch (condition.operator) {
      case "EQUALS":
        return compareValue === compareConditionValue;
      case "NOT_EQUALS":
        return compareValue !== compareConditionValue;
      case "CONTAINS":
        return String(compareValue).includes(String(compareConditionValue));
      case "STARTS_WITH":
        return String(compareValue).startsWith(String(compareConditionValue));
      case "ENDS_WITH":
        return String(compareValue).endsWith(String(compareConditionValue));
      case "REGEX":
        try {
          const regex = new RegExp(
            conditionValue,
            condition.caseSensitive ? "" : "i"
          );
          return regex.test(String(value));
        } catch {
          return false;
        }
      case "IN":
        return Array.isArray(conditionValue) && conditionValue.includes(value);
      case "NOT_IN":
        return Array.isArray(conditionValue) && !conditionValue.includes(value);
      default:
        return false;
    }
  }

  private static getFieldValue(data: any, field: string): any {
    const fields = field.split(".");
    let value = data;

    for (const f of fields) {
      value = value?.[f];
    }

    return value;
  }

  private static addTrackingParameters(
    targetUrl: string,
    rule: any,
    requestData: any
  ): string {
    const urlObj = new URL(targetUrl);

    // Add tracking parameters
    for (const [key, value] of Object.entries(
      (rule.settings as any).trackingParams
    )) {
      let paramValue = value as string;

      // Replace placeholders
      paramValue = paramValue.replace(
        /\{\{ip\}\}/g,
        requestData.ipAddress || ""
      );
      paramValue = paramValue.replace(
        /\{\{userAgent\}\}/g,
        requestData.userAgent || ""
      );
      paramValue = paramValue.replace(
        /\{\{referrer\}\}/g,
        requestData.referrer || ""
      );
      paramValue = paramValue.replace(
        /\{\{country\}\}/g,
        requestData.country || ""
      );
      paramValue = paramValue.replace(
        /\{\{device\}\}/g,
        requestData.device || ""
      );
      paramValue = paramValue.replace(
        /\{\{timestamp\}\}/g,
        Date.now().toString()
      );

      if (paramValue) {
        urlObj.searchParams.set(key, paramValue);
      }
    }

    return urlObj.toString();
  }

  private static async recordRedirectEvent(
    ruleId: string,
    sourceUrl: string,
    targetUrl: string,
    requestData: any
  ): Promise<RedirectEvent> {
    return (await prisma.redirectEvent.create({
      data: {
        redirectRuleId: ruleId,
        ruleId: ruleId,
        clickId: Math.random().toString(36).substring(2, 15),
        sourceUrl,
        targetUrl,
        ipAddress: requestData.ipAddress,
        userAgent: requestData.userAgent,
        referrer: requestData.referrer,
        country: requestData.country,
        city: requestData.city,
        device: requestData.device,
        browser: requestData.browser,
        os: requestData.os,
        queryParams: (requestData.queryParams || {}) as any,
        headers: (requestData.headers || {}) as any,
        timestamp: new Date(),
      },
    })) as unknown as RedirectEvent;
  }

  static async recordConversion(
    redirectEventId: string,
    conversionData: any
  ): Promise<ConversionEvent> {
    const redirectEvent = await prisma.redirectEvent.findUnique({
      where: { id: redirectEventId },
    });

    if (!redirectEvent) {
      throw new Error("Redirect event not found");
    }

    const conversionEvent = (await prisma.conversion.create({
      data: {
        clickId: redirectEvent.clickId,
        affiliateId: conversionData.affiliateId || "",
        offerId: conversionData.offerId || "",
        customerValue: conversionData.value || 0,
        orderValue: conversionData.value || 0,
        commissionAmount: conversionData.commission || 0,
        customerEmail: conversionData.email,
      },
    })) as unknown as ConversionEvent;

    // Update rule stats
    await this.updateRuleStats(redirectEvent.redirectRuleId);

    return conversionEvent;
  }

  static async recordBounce(
    redirectEventId: string,
    bounceData: any
  ): Promise<BounceEvent> {
    const redirectEvent = await prisma.redirectEvent.findUnique({
      where: { id: redirectEventId },
    });

    if (!redirectEvent) {
      throw new Error("Redirect event not found");
    }

    const bounceEvent = (await prisma.bounceEvent.create({
      data: {
        redirectEventId,
        timeOnPage: bounceData.timeOnPage || 0,
        pagesViewed: bounceData.pagesViewed || 1,
        exitPage: bounceData.exitPage,
        timestamp: new Date(),
        data: bounceData as any,
      },
    })) as unknown as BounceEvent;

    // Update rule stats
    await this.updateRuleStats(redirectEvent.redirectRuleId);

    return bounceEvent;
  }

  private static async updateRuleStats(ruleId: string): Promise<void> {
    const rule = await this.findRuleById(ruleId);
    if (!rule) return;

    // Get redirect and conversion counts
    const totalRedirects = await prisma.redirectEvent.count({
      where: { redirectRuleId: ruleId },
    });

    const uniqueRedirects = await prisma.redirectEvent
      .groupBy({
        by: ["ipAddress"],
        where: { redirectRuleId: ruleId },
      })
      .then((result) => result.length);

    // Get click IDs from redirect events
    const redirectEvents = await prisma.redirectEvent.findMany({
      where: { redirectRuleId: ruleId },
      select: { clickId: true },
    });

    const clickIds = redirectEvents.map((e) => e.clickId);

    const conversions = await prisma.conversion.count({
      where: {
        clickId: { in: clickIds },
      },
    });

    const revenue = await prisma.conversion.aggregate({
      where: {
        clickId: { in: clickIds },
      },
      _sum: { orderValue: true },
    });

    const bounces = await prisma.bounceEvent.count({
      where: {
        redirectEvent: {
          redirectRuleId: ruleId,
        },
      },
    });

    const averageTimeOnPage = await prisma.bounceEvent.aggregate({
      where: {
        redirectEvent: {
          redirectRuleId: ruleId,
        },
      },
      _avg: { timeOnPage: true },
    });

    // Update stats
    const stats: RedirectStats = {
      ...(rule.stats as any),
      totalRedirects,
      uniqueRedirects,
      conversions,
      revenue: revenue._sum.orderValue || 0,
      bounceRate: totalRedirects > 0 ? (bounces / totalRedirects) * 100 : 0,
      averageTimeOnPage: averageTimeOnPage._avg.timeOnPage || 0,
    };

    await this.updateRule(ruleId, { stats });
  }

  static async getRedirectStats(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const where: any = { accountId };

    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const rules = await this.listRules(accountId);
    const totalRedirects = await prisma.redirectEvent.count({
      where: { redirectRuleId: { in: rules.map((r) => r.id) } },
    });
    // Get all redirect events for the account
    const allRedirectEvents = await prisma.redirectEvent.findMany({
      where: { redirectRuleId: { in: rules.map((r) => r.id) } },
      select: { clickId: true },
    });

    const allClickIds = allRedirectEvents.map((e) => e.clickId);

    const totalConversions = await prisma.conversion.count({
      where: {
        clickId: { in: allClickIds },
      },
    });

    const stats = {
      totalRules: rules.length,
      activeRules: rules.filter((r) => r.status === "ACTIVE").length,
      totalRedirects,
      totalConversions,
      totalRevenue: rules.reduce((sum, r) => sum + (r.stats as any).revenue, 0),
      averageBounceRate:
        rules.reduce((sum, r) => sum + (r.stats as any).bounceRate, 0) /
        rules.length,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byCountry: {} as Record<string, number>,
      byDevice: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
    };

    // Aggregate by type and status
    rules.forEach((rule) => {
      stats.byType[rule.type] = (stats.byType[rule.type] || 0) + 1;
      stats.byStatus[rule.status] = (stats.byStatus[rule.status] || 0) + 1;
    });

    // Aggregate by country, device, and source
    const redirectEvents = await prisma.redirectEvent.findMany({
      where: { redirectRuleId: { in: rules.map((r) => r.id) } },
      select: { country: true, device: true, referrer: true },
    });

    redirectEvents.forEach((event) => {
      if (event.country) {
        stats.byCountry[event.country] =
          (stats.byCountry[event.country] || 0) + 1;
      }
      if (event.device) {
        stats.byDevice[event.device] = (stats.byDevice[event.device] || 0) + 1;
      }
      if (event.referrer) {
        const source = this.extractSource(event.referrer);
        stats.bySource[source] = (stats.bySource[source] || 0) + 1;
      }
    });

    return stats;
  }

  private static extractSource(referrer: string): string {
    try {
      const url = new URL(referrer);
      return url.hostname;
    } catch {
      return "direct";
    }
  }

  static async getRedirectTrackingDashboard(accountId: string): Promise<any> {
    const rules = await this.listRules(accountId);
    const stats = await this.getRedirectStats(accountId);

    return {
      rules,
      stats,
    };
  }

  static async createDefaultRules(accountId: string): Promise<any[]> {
    const defaultRules = [
      {
        name: "HTTP to HTTPS Redirect",
        description: "Redirect all HTTP traffic to HTTPS",
        sourceUrl: "http://*",
        targetUrl: "https://*",
        type: "PERMANENT" as const,
        conditions: [],
        settings: {
          preserveQueryParams: true,
          preserveHash: true,
          addTrackingParams: false,
          trackingParams: {},
          redirectDelay: 0,
          redirectMethod: "IMMEDIATE",
          customHeaders: {},
          customScripts: [],
          analytics: {
            enabled: true,
            trackClicks: true,
            trackConversions: false,
            trackBounceRate: true,
            trackTimeOnPage: true,
            customEvents: [],
            goals: [],
          },
          seo: {
            preserveTitle: true,
            preserveDescription: true,
            preserveKeywords: true,
          },
        },
      },
      {
        name: "WWW to Non-WWW Redirect",
        description: "Redirect www subdomain to main domain",
        sourceUrl: "https://www.*",
        targetUrl: "https://*",
        type: "PERMANENT" as const,
        conditions: [],
        settings: {
          preserveQueryParams: true,
          preserveHash: true,
          addTrackingParams: false,
          trackingParams: {},
          redirectDelay: 0,
          redirectMethod: "IMMEDIATE",
          customHeaders: {},
          customScripts: [],
          analytics: {
            enabled: true,
            trackClicks: true,
            trackConversions: false,
            trackBounceRate: true,
            trackTimeOnPage: true,
            customEvents: [],
            goals: [],
          },
          seo: {
            preserveTitle: true,
            preserveDescription: true,
            preserveKeywords: true,
          },
        },
      },
    ];

    const createdRules: any[] = [];
    for (const ruleData of defaultRules) {
      const rule = await this.createRule({
        accountId,
        ...ruleData,
      });
      createdRules.push(rule);
    }

    return createdRules;
  }
}
