import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface TrackingSettings {
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
  landingPage: string;
  fallbackUrl?: string;
  trackingPixels: TrackingPixel[];
  postbackUrls: PostbackUrl[];
}

export interface TrackingParameter {
  id: string;
  name: string;
  value: string;
  type: "STATIC" | "DYNAMIC" | "AFFILIATE" | "OFFER" | "CUSTOM";
  required: boolean;
  defaultValue?: string;
  validation?: ParameterValidation;
}

export interface ParameterValidation {
  type: "REGEX" | "LENGTH" | "FORMAT" | "CUSTOM";
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  message: string;
}

export interface TrackingRule {
  id: string;
  name: string;
  conditions: TrackingCondition[];
  actions: TrackingAction[];
  priority: number;
  enabled: boolean;
}

export interface TrackingCondition {
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
}

export interface TrackingAction {
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
  conditions: TrackingCondition[];
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

export interface TrackingStats {
  totalClicks: number;
  uniqueClicks: number;
  conversions: number;
  revenue: number;
  commission: number;
  conversionRate: number;
  lastClick?: Date;
  lastConversion?: Date;
  byCountry: Record<string, number>;
  byDevice: Record<string, number>;
  bySource: Record<string, number>;
  byHour: Record<string, number>;
  byDay: Record<string, number>;
}

export interface ClickEvent {
  id: string;
  trackingLinkId: string;
  affiliateId: string;
  offerId: string;
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

export interface ConversionEvent {
  id: string;
  trackingLinkId: string;
  clickEventId: string;
  affiliateId: string;
  offerId: string;
  value: number;
  commission: number;
  timestamp: Date;
  data: any;
}

export class TrackingLinksModel {
  static async create(data: any): Promise<any> {
    const trackingUrl = await this.generateTrackingUrl(
      data.accountId!,
      data.affiliateId!,
      data.offerId!
    );

    const result = await prisma.trackingLink.create({
      data: {
        accountId: data.accountId!,
        affiliateId: data.affiliateId!,
        offerId: data.offerId!,
        name: data.name!,
        description: data.description || "",
        originalUrl: data.originalUrl!,
        trackingUrl,
        shortCode: data.shortCode || Math.random().toString(36).substring(2, 8),
        type: data.type || "STANDARD",
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
          landingPage: data.originalUrl!,
          trackingPixels: [],
          postbackUrls: [],
        }) as any,
        parameters: (data.parameters || []) as any,
        rules: (data.rules || []) as any,
        stats: {
          totalClicks: 0,
          uniqueClicks: 0,
          conversions: 0,
          revenue: 0,
          commission: 0,
          conversionRate: 0,
          byCountry: {},
          byDevice: {},
          bySource: {},
          byHour: {},
          byDay: {},
        } as any,
      },
    });
    return result;
  }

  static async findById(id: string): Promise<any | null> {
    return await prisma.trackingLink.findUnique({
      where: { id },
    });
  }

  static async findByTrackingUrl(trackingUrl: string): Promise<any | null> {
    return await prisma.trackingLink.findFirst({
      where: {
        trackingUrl,
        status: "ACTIVE",
      },
    });
  }

  static async update(id: string, data: any): Promise<any> {
    return await prisma.trackingLink.update({
      where: { id },
      data: {
        ...data,
        settings: data.settings as any,
        parameters: data.parameters as any,
        rules: data.rules as any,
        stats: data.stats as any,
        updatedAt: new Date(),
      },
    });
  }

  static async delete(id: string): Promise<void> {
    await prisma.trackingLink.delete({
      where: { id },
    });
  }

  static async list(accountId: string, filters: any = {}): Promise<any[]> {
    const where: any = { accountId };

    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.affiliateId) where.affiliateId = filters.affiliateId;
    if (filters.offerId) where.offerId = filters.offerId;

    return await prisma.trackingLink.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  static async processClick(
    trackingUrl: string,
    clickData: any
  ): Promise<{ redirect: boolean; url?: string; reason?: string }> {
    const trackingLink = await this.findByTrackingUrl(trackingUrl);
    if (!trackingLink) {
      return { redirect: false, reason: "Tracking link not found" };
    }

    // Check if link is active
    if (trackingLink.status !== "ACTIVE") {
      return { redirect: false, reason: "Tracking link is not active" };
    }

    // Apply filters
    const filterResult = await this.applyFilters(trackingLink, clickData);
    if (!filterResult.allowed) {
      return { redirect: false, reason: filterResult.reason };
    }

    // Apply rules
    const ruleResult = await this.applyRules(trackingLink, clickData);

    // Record click
    if ((trackingLink.settings as any).clickTracking) {
      await this.recordClick(trackingLink.id, clickData);
    }

    // Fire tracking pixels
    if ((trackingLink.settings as any).trackingPixels) {
      await this.fireTrackingPixels(
        (trackingLink.settings as any).trackingPixels,
        clickData
      );
    }

    // Determine redirect URL
    let redirectUrl =
      ruleResult.redirectUrl || (trackingLink.settings as any).landingPage;

    // Add tracking parameters
    redirectUrl = this.addTrackingParameters(
      redirectUrl,
      trackingLink,
      clickData
    );

    return { redirect: true, url: redirectUrl };
  }

  private static async applyFilters(
    trackingLink: any,
    clickData: any
  ): Promise<{ allowed: boolean; reason?: string }> {
    const settings = trackingLink.settings;

    // Geo blocking
    if ((settings as any).geoBlocking) {
      const country = clickData.country;
      if (country && this.isCountryBlocked(country)) {
        return { allowed: false, reason: "Country blocked" };
      }
    }

    // Device filtering
    if ((settings as any).deviceFiltering) {
      const device = clickData.device;
      if (device && this.isDeviceBlocked(device)) {
        return { allowed: false, reason: "Device blocked" };
      }
    }

    // Time filtering
    if ((settings as any).timeFiltering) {
      const hour = new Date().getHours();
      if (this.isTimeBlocked(hour)) {
        return { allowed: false, reason: "Time blocked" };
      }
    }

    // IP filtering
    if ((settings as any).ipFiltering) {
      const ipAddress = clickData.ipAddress;
      if (ipAddress && this.isIPBlocked(ipAddress)) {
        return { allowed: false, reason: "IP blocked" };
      }
    }

    // Referrer filtering
    if ((settings as any).referrerFiltering) {
      const referrer = clickData.referrer;
      if (referrer && this.isReferrerBlocked(referrer)) {
        return { allowed: false, reason: "Referrer blocked" };
      }
    }

    // Custom filters
    for (const filter of (settings as any).customFilters) {
      if (!filter.enabled) continue;

      const conditionResult = this.evaluateConditions(
        filter.conditions,
        clickData
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
    trackingLink: any,
    clickData: any
  ): Promise<{ redirectUrl?: string }> {
    const rules = (trackingLink.rules as any).sort(
      (a, b) => b.priority - a.priority
    );

    for (const rule of rules) {
      if (!rule.enabled) continue;

      const conditionResult = this.evaluateConditions(
        rule.conditions,
        clickData
      );
      if (conditionResult) {
        for (const action of rule.actions) {
          if (!action.enabled) continue;

          switch (action.type) {
            case "REDIRECT":
              return { redirectUrl: action.parameters.url };
            case "BLOCK":
              return { redirectUrl: undefined };
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

    return {};
  }

  private static evaluateConditions(
    conditions: TrackingCondition[],
    data: any
  ): boolean {
    if (conditions.length === 0) return true;

    let result = true;
    let logic = "AND";

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, data);

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
    condition: TrackingCondition,
    data: any
  ): boolean {
    const value = this.getFieldValue(data, condition.field);

    switch (condition.operator) {
      case "EQUALS":
        return value === condition.value;
      case "NOT_EQUALS":
        return value !== condition.value;
      case "CONTAINS":
        return String(value).includes(String(condition.value));
      case "GREATER_THAN":
        return Number(value) > Number(condition.value);
      case "LESS_THAN":
        return Number(value) < Number(condition.value);
      case "IN":
        return (
          Array.isArray(condition.value) && condition.value.includes(value)
        );
      case "NOT_IN":
        return (
          Array.isArray(condition.value) && !condition.value.includes(value)
        );
      case "REGEX":
        try {
          const regex = new RegExp(condition.value);
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
    // Implement country blocking logic
    const blockedCountries = ["XX", "YY"]; // Example blocked countries
    return blockedCountries.includes(country);
  }

  private static isDeviceBlocked(device: string): boolean {
    // Implement device blocking logic
    const blockedDevices = ["bot", "crawler"]; // Example blocked devices
    return blockedDevices.includes(device.toLowerCase());
  }

  private static isTimeBlocked(hour: number): boolean {
    // Implement time blocking logic
    return hour < 6 || hour > 22; // Block between 10 PM and 6 AM
  }

  private static isIPBlocked(ipAddress: string): boolean {
    // Implement IP blocking logic
    // Check against blacklist, VPN detection, etc.
    return false;
  }

  private static isReferrerBlocked(referrer: string): boolean {
    // Implement referrer blocking logic
    const blockedReferrers = ["spam.com", "malicious.com"];
    return blockedReferrers.some((blocked) => referrer.includes(blocked));
  }

  private static async recordClick(
    trackingLinkId: string,
    clickData: any
  ): Promise<ClickEvent> {
    return (await prisma.clickEvent.create({
      data: {
        trackingLinkId,
        affiliateId: clickData.affiliateId,
        offerId: clickData.offerId,
        ipAddress: clickData.ipAddress,
        userAgent: clickData.userAgent,
        referrer: clickData.referrer,
        country: clickData.country,
        city: clickData.city,
        device: clickData.device,
        browser: clickData.browser,
        os: clickData.os,
        timestamp: new Date(),
        data: clickData as any,
      },
    })) as unknown as ClickEvent;
  }

  private static async fireTrackingPixels(
    pixels: TrackingPixel[],
    clickData: any
  ): Promise<void> {
    for (const pixel of pixels) {
      if (!pixel.enabled) continue;

      if (pixel.position === "BEFORE_REDIRECT") {
        // Fire pixel before redirect
        await this.firePixel(pixel, clickData);
      }
    }
  }

  private static async firePixel(
    pixel: TrackingPixel,
    data: any
  ): Promise<void> {
    // Implement pixel firing logic
    // Replace parameters in pixel URL
    let url = pixel.url;
    for (const [key, value] of Object.entries(pixel.parameters)) {
      const placeholder = `{{${key}}}`;
      url = url.replace(
        new RegExp(placeholder, "g"),
        String(data[key] || value)
      );
    }

    // Fire pixel (implement actual HTTP request)
    console.log(`Firing pixel: ${url}`);
  }

  private static addTrackingParameters(
    url: string,
    trackingLink: any,
    clickData: any
  ): string {
    const urlObj = new URL(url);

    // Add tracking parameters
    for (const param of trackingLink.parameters as any) {
      let value = param.value;

      switch (param.type) {
        case "DYNAMIC":
          value =
            this.getFieldValue(clickData, param.name) ||
            param.defaultValue ||
            "";
          break;
        case "AFFILIATE":
          value = clickData.affiliateId || "";
          break;
        case "OFFER":
          value = clickData.offerId || "";
          break;
        case "CUSTOM":
          value = this.evaluateCustomParameter(param.value, clickData);
          break;
      }

      if (value) {
        urlObj.searchParams.set(param.name, value);
      }
    }

    return urlObj.toString();
  }

  private static evaluateCustomParameter(formula: string, data: any): string {
    // Implement custom parameter evaluation
    let result = formula;
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, "g"), String(value));
    }
    return result;
  }

  static async recordConversion(
    trackingLinkId: string,
    conversionData: any
  ): Promise<ConversionEvent> {
    const trackingLink = await this.findById(trackingLinkId);
    if (!trackingLink) {
      throw new Error("Tracking link not found");
    }

    // Find the corresponding click event
    const clickEvent = await prisma.clickEvent.findFirst({
      where: {
        trackingLinkId,
        affiliateId: conversionData.affiliateId,
        offerId: conversionData.offerId,
      },
      orderBy: { timestamp: "desc" },
    });

    if (!clickEvent) {
      throw new Error("Click event not found");
    }

    // Create conversion event
    const conversionEvent = (await prisma.conversionEvent.create({
      data: {
        trackingLinkId,
        clickEventId: clickEvent.id,
        affiliateId: conversionData.affiliateId,
        offerId: conversionData.offerId,
        value: conversionData.value || 0,
        commission: conversionData.commission || 0,
        timestamp: new Date(),
        data: conversionData as any,
      },
    })) as unknown as ConversionEvent;

    // Update tracking link stats
    await this.updateStats(trackingLinkId);

    // Fire postback URLs
    if ((trackingLink.settings as any).postbackUrls) {
      await this.firePostbacks(
        (trackingLink.settings as any).postbackUrls,
        conversionData
      );
    }

    return conversionEvent;
  }

  private static async updateStats(trackingLinkId: string): Promise<void> {
    const trackingLink = await this.findById(trackingLinkId);
    if (!trackingLink) return;

    // Get click and conversion counts
    const totalClicks = await prisma.clickEvent.count({
      where: { trackingLinkId },
    });

    const uniqueClicks = await prisma.clickEvent
      .groupBy({
        by: ["ipAddress"],
        where: { trackingLinkId },
      })
      .then((result) => result.length);

    const conversions = await prisma.conversionEvent.count({
      where: { trackingLinkId },
    });

    const revenue = await prisma.conversionEvent.aggregate({
      where: { trackingLinkId },
      _sum: { value: true },
    });

    const commission = await prisma.conversionEvent.aggregate({
      where: { trackingLinkId },
      _sum: { commission: true },
    });

    // Update stats
    const stats: TrackingStats = {
      ...(trackingLink.stats as any),
      totalClicks,
      uniqueClicks,
      conversions,
      revenue: revenue._sum.value || 0,
      commission: commission._sum.commission || 0,
      conversionRate: totalClicks > 0 ? (conversions / totalClicks) * 100 : 0,
    };

    await this.update(trackingLinkId, { stats: stats as any });
  }

  private static async firePostbacks(
    postbacks: PostbackUrl[],
    data: any
  ): Promise<void> {
    for (const postback of postbacks) {
      if (!postback.enabled) continue;

      // Replace parameters in postback URL
      let url = postback.url;
      for (const [key, value] of Object.entries(postback.parameters)) {
        const placeholder = `{{${key}}}`;
        url = url.replace(
          new RegExp(placeholder, "g"),
          String(data[key] || value)
        );
      }

      // Fire postback (implement actual HTTP request)
      console.log(`Firing postback: ${url}`);
    }
  }

  static async generateTrackingUrl(
    accountId: string,
    affiliateId: string,
    offerId: string
  ): Promise<string> {
    const baseUrl =
      process.env.TRACKING_BASE_URL || "https://track.example.com";
    const path = `/${accountId}/${affiliateId}/${offerId}`;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);

    return `${baseUrl}${path}/${timestamp}-${random}`;
  }

  static async generateShortUrl(trackingUrl: string): Promise<string> {
    // Implement short URL generation
    // This is a simplified implementation
    const shortCode = Math.random().toString(36).substring(2, 8);
    const baseUrl = process.env.SHORT_URL_BASE || "https://short.example.com";

    return `${baseUrl}/${shortCode}`;
  }

  static async getTrackingStats(
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

    const trackingLinks = await this.list(accountId);
    const totalClicks = await prisma.clickEvent.count({
      where: { trackingLink: { accountId } },
    });
    const totalConversions = await prisma.conversionEvent.count({
      where: { trackingLink: { accountId } },
    });

    const stats = {
      totalLinks: trackingLinks.length,
      activeLinks: trackingLinks.filter((l) => l.status === "ACTIVE").length,
      totalClicks,
      totalConversions,
      totalRevenue: trackingLinks.reduce(
        (sum, l) => sum + (l.stats as any).revenue,
        0
      ),
      totalCommission: trackingLinks.reduce(
        (sum, l) => sum + (l.stats as any).commission,
        0
      ),
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byAffiliate: {} as Record<string, any>,
      byOffer: {} as Record<string, any>,
    };

    // Aggregate by type, status, affiliate, and offer
    trackingLinks.forEach((link) => {
      stats.byType[link.type] = (stats.byType[link.type] || 0) + 1;
      stats.byStatus[link.status] = (stats.byStatus[link.status] || 0) + 1;

      if (!stats.byAffiliate[link.affiliateId]) {
        stats.byAffiliate[link.affiliateId] = {
          links: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
        };
      }
      stats.byAffiliate[link.affiliateId].links++;
      stats.byAffiliate[link.affiliateId].clicks += (
        link.stats as any
      ).totalClicks;
      stats.byAffiliate[link.affiliateId].conversions += (
        link.stats as any
      ).conversions;
      stats.byAffiliate[link.affiliateId].revenue += (
        link.stats as any
      ).revenue;

      if (!stats.byOffer[link.offerId]) {
        stats.byOffer[link.offerId] = {
          links: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
        };
      }
      stats.byOffer[link.offerId].links++;
      stats.byOffer[link.offerId].clicks += (link.stats as any).totalClicks;
      stats.byOffer[link.offerId].conversions += (
        link.stats as any
      ).conversions;
      stats.byOffer[link.offerId].revenue += (link.stats as any).revenue;
    });

    return stats;
  }

  static async getTrackingLinksDashboard(accountId: string): Promise<any> {
    const links = await this.list(accountId);
    const stats = await this.getTrackingStats(accountId);

    return {
      links,
      stats,
    };
  }
}
