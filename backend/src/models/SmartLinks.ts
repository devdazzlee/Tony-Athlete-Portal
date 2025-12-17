import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface SmartLinkSettings {
  clickTracking: boolean;
  conversionTracking: boolean;
  fraudDetection: boolean;
  geoBlocking: boolean;
  deviceFiltering: boolean;
  timeFiltering: boolean;
  ipFiltering: boolean;
  referrerFiltering: boolean;
  customFilters: CustomFilter[];
  redirectDelay: number; // milliseconds
  redirectMethod: "IMMEDIATE" | "DELAYED" | "CONDITIONAL";
  fallbackUrl?: string;
  trackingPixels: TrackingPixel[];
  postbackUrls: PostbackUrl[];
  analytics: AnalyticsSettings;
  seo: SEOSettings;
}

export interface SmartLinkTarget {
  id: string;
  name: string;
  url: string;
  weight: number; // for A/B testing
  conditions: TargetCondition[];
  isDefault: boolean;
  isActive: boolean;
}

export interface TargetCondition {
  field: string;
  operator:
    | "EQUALS"
    | "NOT_EQUALS"
    | "CONTAINS"
    | "GREATER_THAN"
    | "LESS_THAN"
    | "IN"
    | "NOT_IN"
    | "REGEX";
  value: any;
  logic: "AND" | "OR";
  caseSensitive: boolean;
}

export interface SmartLinkRule {
  id: string;
  name: string;
  priority: number;
  conditions: SmartLinkCondition[];
  actions: SmartLinkAction[];
  enabled: boolean;
}

export interface SmartLinkCondition {
  field: string;
  operator:
    | "EQUALS"
    | "NOT_EQUALS"
    | "CONTAINS"
    | "GREATER_THAN"
    | "LESS_THAN"
    | "IN"
    | "NOT_IN"
    | "REGEX";
  value: any;
  logic: "AND" | "OR";
  caseSensitive: boolean;
}

export interface SmartLinkAction {
  type:
    | "REDIRECT"
    | "BLOCK"
    | "MODIFY_URL"
    | "ADD_PARAMETER"
    | "REMOVE_PARAMETER"
    | "CUSTOM";
  parameters: Record<string, any>;
  enabled: boolean;
}

export interface CustomFilter {
  id: string;
  name: string;
  type: "GEO" | "DEVICE" | "TIME" | "IP" | "REFERRER" | "CUSTOM";
  conditions: SmartLinkCondition[];
  action: "ALLOW" | "BLOCK" | "REDIRECT";
  redirectUrl?: string;
  enabled: boolean;
}

export interface TrackingPixel {
  id: string;
  name: string;
  url: string;
  position: "BEFORE_REDIRECT" | "AFTER_REDIRECT" | "ON_CONVERSION";
  parameters: Record<string, string>;
  enabled: boolean;
}

export interface PostbackUrl {
  id: string;
  name: string;
  url: string;
  method: "GET" | "POST";
  parameters: Record<string, string>;
  headers: Record<string, string>;
  enabled: boolean;
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
  conditions: SmartLinkCondition[];
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

export interface SmartLinkStats {
  totalClicks: number;
  uniqueClicks: number;
  conversions: number;
  revenue: number;
  commission: number;
  conversionRate: number;
  lastClick?: Date;
  lastConversion?: Date;
  byTarget: Record<string, number>;
  byCountry: Record<string, number>;
  byDevice: Record<string, number>;
  bySource: Record<string, number>;
  byHour: Record<string, number>;
  byDay: Record<string, number>;
}

export interface SmartLinkEvent {
  id: string;
  smartLinkId: string;
  targetId?: string;
  ipAddress: string;
  userAgent: string;
  referrer?: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  timestamp: Date;
  data: any;
}

export interface SmartLinkConversion {
  id: string;
  smartLinkId: string;
  smartLinkEventId: string;
  targetId?: string;
  value: number;
  commission: number;
  timestamp: Date;
  data: any;
}

export class SmartLinksModel {
  static async create(data: any): Promise<any> {
    const shortCode = await this.generateShortCode(data.accountId!);

    return (await prisma.smartLink.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        description: data.description || "",
        baseUrl: data.baseUrl!,
        shortCode,
        type: data.type || "DYNAMIC",
        status: data.status || "ACTIVE",
        settings: (data.settings || {
          clickTracking: true,
          conversionTracking: true,
          fraudDetection: false,
          geoBlocking: false,
          deviceFiltering: false,
          timeFiltering: false,
          ipFiltering: false,
          referrerFiltering: false,
          customFilters: [],
          redirectDelay: 0,
          redirectMethod: "IMMEDIATE",
          trackingPixels: [],
          postbackUrls: [],
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
        targets: (data.targets || []) as any,
        rules: (data.rules || []) as any,
        stats: {
          totalClicks: 0,
          uniqueClicks: 0,
          conversions: 0,
          revenue: 0,
          commission: 0,
          conversionRate: 0,
          byTarget: {},
          byCountry: {},
          byDevice: {},
          bySource: {},
          byHour: {},
          byDay: {},
        } as any,
      },
    })) as unknown as any;
  }

  static async findById(id: string): Promise<any | null> {
    return (await prisma.smartLink.findUnique({
      where: { id },
    })) as unknown as any | null;
  }

  static async findByShortCode(shortCode: string): Promise<any | null> {
    return (await prisma.smartLink.findFirst({
      where: {
        shortCode,
        status: "ACTIVE",
      },
    })) as unknown as any | null;
  }

  static async update(id: string, data: any): Promise<any> {
    return (await prisma.smartLink.update({
      where: { id },
      data: {
        ...data,
        settings: data.settings as any,
        targets: data.targets as any,
        rules: data.rules as any,
        stats: data.stats as any,
        updatedAt: new Date(),
      },
    })) as unknown as any;
  }

  static async delete(id: string): Promise<void> {
    await prisma.smartLink.delete({
      where: { id },
    });
  }

  static async list(accountId: string, filters: any = {}): Promise<any[]> {
    const where: any = { accountId };

    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;

    return (await prisma.smartLink.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })) as unknown as any[];
  }

  static async processSmartLink(
    shortCode: string,
    requestData: any
  ): Promise<{
    redirect: boolean;
    targetUrl?: string;
    targetId?: string;
    reason?: string;
  }> {
    const smartLink = await this.findByShortCode(shortCode);
    if (!smartLink) {
      return { redirect: false, reason: "Smart link not found" };
    }

    // Check if smart link is active
    if (smartLink.status !== "ACTIVE") {
      return { redirect: false, reason: "Smart link is not active" };
    }

    // Apply filters
    const filterResult = await this.applyFilters(smartLink, requestData);
    if (!filterResult.allowed) {
      return { redirect: false, reason: filterResult.reason };
    }

    // Apply rules
    const ruleResult = await this.applyRules(smartLink, requestData);
    if (ruleResult.blocked) {
      return { redirect: false, reason: ruleResult.reason };
    }

    // Select target
    const target = await this.selectTarget(smartLink, requestData);
    if (!target) {
      return { redirect: false, reason: "No suitable target found" };
    }

    // Record click
    if ((smartLink.settings as any).clickTracking) {
      await this.recordClick(smartLink.id, target.id, requestData);
    }

    // Fire tracking pixels
    if ((smartLink.settings as any).trackingPixels) {
      await this.fireTrackingPixels(
        (smartLink.settings as any).trackingPixels,
        requestData
      );
    }

    // Build target URL
    let targetUrl = target.url;

    // Add tracking parameters
    targetUrl = this.addTrackingParameters(
      targetUrl,
      smartLink,
      target,
      requestData
    );

    return { redirect: true, targetUrl, targetId: target.id };
  }

  private static async applyFilters(
    smartLink: any,
    requestData: any
  ): Promise<{ allowed: boolean; reason?: string }> {
    const settings = smartLink.settings as any;

    // Geo blocking
    if (settings.geoBlocking) {
      const country = requestData.country;
      if (country && this.isCountryBlocked(country)) {
        return { allowed: false, reason: "Country blocked" };
      }
    }

    // Device filtering
    if (settings.deviceFiltering) {
      const device = requestData.device;
      if (device && this.isDeviceBlocked(device)) {
        return { allowed: false, reason: "Device blocked" };
      }
    }

    // Time filtering
    if (settings.timeFiltering) {
      const hour = new Date().getHours();
      if (this.isTimeBlocked(hour)) {
        return { allowed: false, reason: "Time blocked" };
      }
    }

    // IP filtering
    if (settings.ipFiltering) {
      const ipAddress = requestData.ipAddress;
      if (ipAddress && this.isIPBlocked(ipAddress)) {
        return { allowed: false, reason: "IP blocked" };
      }
    }

    // Referrer filtering
    if (settings.referrerFiltering) {
      const referrer = requestData.referrer;
      if (referrer && this.isReferrerBlocked(referrer)) {
        return { allowed: false, reason: "Referrer blocked" };
      }
    }

    // Custom filters
    for (const filter of settings.customFilters) {
      if (!filter.enabled) continue;

      const conditionResult = this.evaluateConditions(
        filter.conditions,
        requestData
      );
      if (conditionResult) {
        switch (filter.action) {
          case "BLOCK":
            return {
              allowed: false,
              reason: `Blocked by filter: ${filter.name}`,
            };
          case "REDIRECT":
            return {
              allowed: true,
              reason: `Redirected by filter: ${filter.name}`,
            };
        }
      }
    }

    return { allowed: true };
  }

  private static async applyRules(
    smartLink: any,
    requestData: any
  ): Promise<{ blocked: boolean; reason?: string }> {
    const rules = (smartLink.rules as any).sort(
      (a, b) => b.priority - a.priority
    );

    for (const rule of rules) {
      if (!rule.enabled) continue;

      const conditionResult = this.evaluateConditions(
        rule.conditions,
        requestData
      );
      if (conditionResult) {
        for (const action of rule.actions) {
          if (!action.enabled) continue;

          switch (action.type) {
            case "BLOCK":
              return { blocked: true, reason: `Blocked by rule: ${rule.name}` };
            case "REDIRECT":
              return {
                blocked: false,
                reason: `Redirected by rule: ${rule.name}`,
              };
            case "MODIFY_URL":
              // Implement URL modification
              break;
            case "ADD_PARAMETER":
              // Implement parameter addition
              break;
            case "REMOVE_PARAMETER":
              // Implement parameter removal
              break;
          }
        }
      }
    }

    return { blocked: false };
  }

  private static async selectTarget(
    smartLink: any,
    requestData: any
  ): Promise<SmartLinkTarget | null> {
    const activeTargets = (smartLink.targets as any).filter((t) => t.isActive);

    if (activeTargets.length === 0) {
      return null;
    }

    // Find targets that match conditions
    const matchingTargets = activeTargets.filter((target) => {
      if (target.conditions.length === 0) return true;
      return this.evaluateConditions(target.conditions, requestData);
    });

    if (matchingTargets.length === 0) {
      // Return default target if no matches
      return activeTargets.find((t) => t.isDefault) || null;
    }

    // Select target based on type
    switch (smartLink.type) {
      case "A_B_TEST":
        return this.selectABTestTarget(matchingTargets, requestData);
      case "GEO_TARGETED":
        return this.selectGeoTargetedTarget(matchingTargets, requestData);
      case "DEVICE_TARGETED":
        return this.selectDeviceTargetedTarget(matchingTargets, requestData);
      case "TIME_TARGETED":
        return this.selectTimeTargetedTarget(matchingTargets, requestData);
      default:
        return matchingTargets[0];
    }
  }

  private static selectABTestTarget(
    targets: SmartLinkTarget[],
    requestData: any
  ): SmartLinkTarget {
    // Simple A/B test selection based on weights
    const totalWeight = targets.reduce((sum, t) => sum + t.weight, 0);
    let random = Math.random() * totalWeight;

    for (const target of targets) {
      random -= target.weight;
      if (random <= 0) {
        return target;
      }
    }

    return targets[0];
  }

  private static selectGeoTargetedTarget(
    targets: SmartLinkTarget[],
    requestData: any
  ): SmartLinkTarget {
    const country = requestData.country;

    // Find target that matches country
    for (const target of targets) {
      for (const condition of target.conditions) {
        if (
          condition.field === "country" &&
          condition.operator === "EQUALS" &&
          condition.value === country
        ) {
          return target;
        }
      }
    }

    // Return default target
    return targets.find((t) => t.isDefault) || targets[0];
  }

  private static selectDeviceTargetedTarget(
    targets: SmartLinkTarget[],
    requestData: any
  ): SmartLinkTarget {
    const device = requestData.device;

    // Find target that matches device
    for (const target of targets) {
      for (const condition of target.conditions) {
        if (
          condition.field === "device" &&
          condition.operator === "EQUALS" &&
          condition.value === device
        ) {
          return target;
        }
      }
    }

    // Return default target
    return targets.find((t) => t.isDefault) || targets[0];
  }

  private static selectTimeTargetedTarget(
    targets: SmartLinkTarget[],
    requestData: any
  ): SmartLinkTarget {
    const hour = new Date().getHours();

    // Find target that matches time
    for (const target of targets) {
      for (const condition of target.conditions) {
        if (
          condition.field === "hour" &&
          condition.operator === "EQUALS" &&
          condition.value === hour
        ) {
          return target;
        }
      }
    }

    // Return default target
    return targets.find((t) => t.isDefault) || targets[0];
  }

  private static evaluateConditions(
    conditions: SmartLinkCondition[],
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
    condition: SmartLinkCondition,
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
      case "GREATER_THAN":
        return Number(compareValue) > Number(compareConditionValue);
      case "LESS_THAN":
        return Number(compareValue) < Number(compareConditionValue);
      case "IN":
        return Array.isArray(conditionValue) && conditionValue.includes(value);
      case "NOT_IN":
        return Array.isArray(conditionValue) && !conditionValue.includes(value);
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

  private static isCountryBlocked(country: string): boolean {
    const blockedCountries = ["XX", "YY"];
    return blockedCountries.includes(country);
  }

  private static isDeviceBlocked(device: string): boolean {
    const blockedDevices = ["bot", "crawler"];
    return blockedDevices.includes(device.toLowerCase());
  }

  private static isTimeBlocked(hour: number): boolean {
    return hour < 6 || hour > 22;
  }

  private static isIPBlocked(ipAddress: string): boolean {
    return false;
  }

  private static isReferrerBlocked(referrer: string): boolean {
    const blockedReferrers = ["spam.com", "malicious.com"];
    return blockedReferrers.some((blocked) => referrer.includes(blocked));
  }

  private static async recordClick(
    smartLinkId: string,
    targetId: string,
    requestData: any
  ): Promise<SmartLinkEvent> {
    return (await prisma.smartLinkEvent.create({
      data: {
        smartLinkId,
        clickId: Math.random().toString(36).substring(2, 15),
        targetId,
        ipAddress: requestData.ipAddress,
        userAgent: requestData.userAgent,
        referrer: requestData.referrer,
        country: requestData.country,
        city: requestData.city,
        device: requestData.device,
        browser: requestData.browser,
        os: requestData.os,
        timestamp: new Date(),
        data: requestData as any,
      },
    })) as unknown as SmartLinkEvent;
  }

  private static async fireTrackingPixels(
    pixels: TrackingPixel[],
    requestData: any
  ): Promise<void> {
    for (const pixel of pixels) {
      if (!pixel.enabled) continue;

      if (pixel.position === "BEFORE_REDIRECT") {
        await this.firePixel(pixel, requestData);
      }
    }
  }

  private static async firePixel(
    pixel: TrackingPixel,
    data: any
  ): Promise<void> {
    let url = pixel.url;
    for (const [key, value] of Object.entries(pixel.parameters)) {
      const placeholder = `{{${key}}}`;
      url = url.replace(
        new RegExp(placeholder, "g"),
        String(data[key] || value)
      );
    }

    console.log(`Firing pixel: ${url}`);
  }

  private static addTrackingParameters(
    targetUrl: string,
    smartLink: any,
    target: SmartLinkTarget,
    requestData: any
  ): string {
    const urlObj = new URL(targetUrl);

    // Add smart link tracking parameters
    urlObj.searchParams.set("sl_id", smartLink.id);
    urlObj.searchParams.set("sl_target", target.id);
    urlObj.searchParams.set("sl_timestamp", Date.now().toString());

    // Add request data parameters
    if (requestData.ipAddress)
      urlObj.searchParams.set("sl_ip", requestData.ipAddress);
    if (requestData.country)
      urlObj.searchParams.set("sl_country", requestData.country);
    if (requestData.device)
      urlObj.searchParams.set("sl_device", requestData.device);
    if (requestData.referrer)
      urlObj.searchParams.set("sl_referrer", requestData.referrer);

    return urlObj.toString();
  }

  static async recordConversion(
    smartLinkId: string,
    targetId: string,
    conversionData: any
  ): Promise<SmartLinkConversion> {
    const smartLink = await this.findById(smartLinkId);
    if (!smartLink) {
      throw new Error("Smart link not found");
    }

    // Find the corresponding click event
    const clickEvent = await prisma.smartLinkEvent.findFirst({
      where: {
        smartLinkId,
        targetId,
      },
      orderBy: { timestamp: "desc" },
    });

    if (!clickEvent) {
      throw new Error("Click event not found");
    }

    // Create conversion event
    const conversionEvent = (await prisma.smartLinkConversion.create({
      data: {
        smartLinkId,
        smartLinkEventId: clickEvent.id,
        eventId: Math.random().toString(36).substring(2, 15),
        value: conversionData.value || 0,
        commission: conversionData.commission || 0,
        timestamp: new Date(),
        data: conversionData as any,
      },
    })) as unknown as SmartLinkConversion;

    // Update smart link stats
    await this.updateStats(smartLinkId);

    // Fire postback URLs
    if ((smartLink.settings as any).postbackUrls) {
      await this.firePostbacks(
        (smartLink.settings as any).postbackUrls,
        conversionData
      );
    }

    return conversionEvent;
  }

  private static async updateStats(smartLinkId: string): Promise<void> {
    const smartLink = await this.findById(smartLinkId);
    if (!smartLink) return;

    // Get click and conversion counts
    const totalClicks = await prisma.smartLinkEvent.count({
      where: { smartLinkId },
    });

    const uniqueClicks = await prisma.smartLinkEvent
      .groupBy({
        by: ["ipAddress"],
        where: { smartLinkId },
      })
      .then((result) => result.length);

    const conversions = await prisma.smartLinkConversion.count({
      where: { smartLinkId },
    });

    const revenue = await prisma.smartLinkConversion.aggregate({
      where: { smartLinkId },
      _sum: { value: true },
    });

    const commission = await prisma.smartLinkConversion.aggregate({
      where: { smartLinkId },
      _sum: { commission: true },
    });

    // Update stats
    const stats: SmartLinkStats = {
      ...(smartLink.stats as any),
      totalClicks,
      uniqueClicks,
      conversions,
      revenue: revenue._sum.value || 0,
      commission: commission._sum.commission || 0,
      conversionRate: totalClicks > 0 ? (conversions / totalClicks) * 100 : 0,
    };

    await this.update(smartLinkId, { stats });
  }

  private static async firePostbacks(
    postbacks: PostbackUrl[],
    data: any
  ): Promise<void> {
    for (const postback of postbacks) {
      if (!postback.enabled) continue;

      let url = postback.url;
      for (const [key, value] of Object.entries(postback.parameters)) {
        const placeholder = `{{${key}}}`;
        url = url.replace(
          new RegExp(placeholder, "g"),
          String(data[key] || value)
        );
      }

      console.log(`Firing postback: ${url}`);
    }
  }

  private static async generateShortCode(accountId: string): Promise<string> {
    let shortCode: string;
    let exists = true;

    while (exists) {
      shortCode = Math.random().toString(36).substring(2, 8);
      const existing = await prisma.smartLink.findFirst({
        where: { shortCode },
      });
      exists = !!existing;
    }

    return shortCode;
  }

  static async getSmartLinkStats(
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

    const smartLinks = await this.list(accountId);
    const totalClicks = await prisma.smartLinkEvent.count({
      where: { smartLink: { accountId } },
    });
    const totalConversions = await prisma.smartLinkConversion.count({
      where: { smartLink: { accountId } },
    });

    const stats = {
      totalLinks: smartLinks.length,
      activeLinks: smartLinks.filter((l) => l.status === "ACTIVE").length,
      totalClicks,
      totalConversions,
      totalRevenue: smartLinks.reduce(
        (sum, l) => sum + (l.stats as any).revenue,
        0
      ),
      totalCommission: smartLinks.reduce(
        (sum, l) => sum + (l.stats as any).commission,
        0
      ),
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byTarget: {} as Record<string, any>,
    };

    // Aggregate by type and status
    smartLinks.forEach((link) => {
      stats.byType[link.type] = (stats.byType[link.type] || 0) + 1;
      stats.byStatus[link.status] = (stats.byStatus[link.status] || 0) + 1;
    });

    // Aggregate by target
    for (const link of smartLinks) {
      for (const target of link.targets as any) {
        if (!stats.byTarget[target.id]) {
          stats.byTarget[target.id] = {
            name: target.name,
            clicks: 0,
            conversions: 0,
            revenue: 0,
          };
        }
        stats.byTarget[target.id].clicks +=
          (link.stats as any).byTarget[target.id] || 0;
      }
    }

    return stats;
  }

  static async getSmartLinksDashboard(accountId: string): Promise<any> {
    const smartLinks = await this.list(accountId);
    const stats = await this.getSmartLinkStats(accountId);

    return {
      smartLinks,
      stats,
    };
  }

  static async createDefaultSmartLinks(accountId: string): Promise<any[]> {
    const defaultSmartLinks = [
      {
        name: "Mobile vs Desktop Redirect",
        description:
          "Redirect mobile users to mobile site, desktop users to desktop site",
        baseUrl: "https://example.com",
        type: "DEVICE_TARGETED" as const,
        targets: [
          {
            id: "mobile",
            name: "Mobile Site",
            url: "https://m.example.com",
            weight: 1,
            conditions: [
              {
                field: "device",
                operator: "EQUALS",
                value: "mobile",
                logic: "AND",
                caseSensitive: false,
              },
            ],
            isDefault: false,
            isActive: true,
          },
          {
            id: "desktop",
            name: "Desktop Site",
            url: "https://www.example.com",
            weight: 1,
            conditions: [],
            isDefault: true,
            isActive: true,
          },
        ],
      },
      {
        name: "Geo-Targeted Landing Pages",
        description: "Redirect users to country-specific landing pages",
        baseUrl: "https://example.com",
        type: "GEO_TARGETED" as const,
        targets: [
          {
            id: "us",
            name: "US Landing Page",
            url: "https://us.example.com",
            weight: 1,
            conditions: [
              {
                field: "country",
                operator: "EQUALS",
                value: "US",
                logic: "AND",
                caseSensitive: false,
              },
            ],
            isDefault: false,
            isActive: true,
          },
          {
            id: "uk",
            name: "UK Landing Page",
            url: "https://uk.example.com",
            weight: 1,
            conditions: [
              {
                field: "country",
                operator: "EQUALS",
                value: "GB",
                logic: "AND",
                caseSensitive: false,
              },
            ],
            isDefault: false,
            isActive: true,
          },
          {
            id: "default",
            name: "Default Landing Page",
            url: "https://www.example.com",
            weight: 1,
            conditions: [],
            isDefault: true,
            isActive: true,
          },
        ],
      },
    ];

    const createdSmartLinks: any[] = [];
    for (const smartLinkData of defaultSmartLinks) {
      const smartLink = await this.create({
        accountId,
        ...smartLinkData,
      });
      createdSmartLinks.push(smartLink);
    }

    return createdSmartLinks;
  }
}
