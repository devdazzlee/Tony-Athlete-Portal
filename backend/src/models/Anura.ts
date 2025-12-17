import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface AnuraConfig {
  id: string;
  apiKey: string;
  apiSecret: string;
  endpoint: string;
  enabled: boolean;
  settings: AnuraSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnuraSettings {
  fraudThreshold: number;
  qualityThreshold: number;
  autoBlock: boolean;
  notifyOnFraud: boolean;
  notifyOnQuality: boolean;
  webhookUrl?: string;
  customRules: AnuraCustomRule[];
}

export interface AnuraCustomRule {
  name: string;
  condition: string;
  action: "ALLOW" | "BLOCK" | "FLAG" | "REVIEW";
  weight: number;
}

export interface AnuraCheck {
  id: string;
  requestId: string;
  type: "FRAUD" | "QUALITY" | "BOTH";
  data: any;
  result: AnuraResult;
  ipAddress: string;
  userAgent: string;
  affiliateId?: string;
  clickId?: string;
  conversionId?: string;
  timestamp: Date;
}

export interface AnuraResult {
  fraudScore: number;
  qualityScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendations: string[];
  blocked: boolean;
  reason?: string;
  details: any;
}

export interface AnuraStats {
  totalChecks: number;
  fraudDetected: number;
  qualityIssues: number;
  blockedRequests: number;
  allowedRequests: number;
  averageFraudScore: number;
  averageQualityScore: number;
  byRiskLevel: Record<string, number>;
  byAffiliate: Record<string, any>;
  byHour: Record<number, any>;
}

export class AnuraModel {
  static async createConfig(data: Partial<AnuraConfig>): Promise<AnuraConfig> {
    return (await prisma.anuraConfig.create({
      data: {
        accountId: "default",
        apiKey: data.apiKey!,
        settings:
          data.settings ||
          ({
            fraudThreshold: 0.7,
            qualityThreshold: 0.5,
            autoBlock: true,
            notifyOnFraud: true,
            notifyOnQuality: true,
            customRules: [],
          } as any),
        isActive: data.enabled || false,
      } as any,
    })) as any;
  }

  static async getConfig(): Promise<AnuraConfig | null> {
    return (await prisma.anuraConfig.findFirst({
      orderBy: { createdAt: "desc" },
    })) as any;
  }

  static async updateConfig(
    id: string,
    data: Partial<AnuraConfig>
  ): Promise<AnuraConfig> {
    return (await prisma.anuraConfig.update({
      where: { id },
      data: data as any,
    })) as any;
  }

  static async deleteConfig(id: string): Promise<void> {
    await prisma.anuraConfig.delete({
      where: { id },
    });
  }

  static async performAnuraCheck(
    data: any,
    ipAddress: string,
    userAgent: string,
    affiliateId?: string,
    clickId?: string,
    conversionId?: string
  ): Promise<AnuraCheck> {
    const config = await this.getConfig();
    if (!config || !config.enabled) {
      throw new Error("Anura is not configured or enabled");
    }

    const requestId = this.generateRequestId();
    const result = await this.callAnuraAPI(config, data, ipAddress, userAgent);

    const anuraCheck = (await prisma.anuraCheck.create({
      data: {
        affiliateId,
        clickId,
        result: result as any,
        score: 0.5,
        status: "COMPLETED",
      } as any,
    })) as any;

    return anuraCheck;
  }

  private static async callAnuraAPI(
    config: AnuraConfig,
    data: any,
    ipAddress: string,
    userAgent: string
  ): Promise<AnuraResult> {
    try {
      const payload = {
        ip: ipAddress,
        user_agent: userAgent,
        referrer: data.referrer,
        country: data.country,
        device: data.device,
        browser: data.browser,
        os: data.os,
        timestamp: new Date().toISOString(),
        custom_data: data,
      };

      const response = await fetch(`${config.endpoint}/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          "X-API-Secret": config.apiSecret,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          `Anura API error: ${response.status} ${response.statusText}`
        );
      }

      const anuraResponse = await response.json();

      return {
        fraudScore: (anuraResponse as any).fraud_score || 0,
        qualityScore: (anuraResponse as any).quality_score || 0,
        riskLevel: this.calculateRiskLevel(
          (anuraResponse as any).fraud_score,
          (anuraResponse as any).quality_score
        ),
        recommendations: (anuraResponse as any).recommendations || [],
        blocked: this.shouldBlock(anuraResponse, config.settings),
        reason: (anuraResponse as any).reason,
        details: anuraResponse,
      };
    } catch (error: any) {
      // Fallback to default result if API fails
      return {
        fraudScore: 0.5,
        qualityScore: 0.5,
        riskLevel: "MEDIUM",
        recommendations: ["API call failed, manual review recommended"],
        blocked: false,
        reason: "API error",
        details: { error: error.message },
      };
    }
  }

  private static calculateRiskLevel(
    fraudScore: number,
    qualityScore: number
  ): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    const combinedScore = (fraudScore + (1 - qualityScore)) / 2;

    if (combinedScore >= 0.8) return "CRITICAL";
    if (combinedScore >= 0.6) return "HIGH";
    if (combinedScore >= 0.4) return "MEDIUM";
    return "LOW";
  }

  private static shouldBlock(
    anuraResponse: any,
    settings: AnuraSettings
  ): boolean {
    if (!settings.autoBlock) return false;

    const fraudScore = (anuraResponse as any).fraud_score || 0;
    const qualityScore = (anuraResponse as any).quality_score || 0;

    return (
      fraudScore >= settings.fraudThreshold ||
      qualityScore <= settings.qualityThreshold
    );
  }

  private static generateRequestId(): string {
    return `anura_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static async getAnuraChecks(
    filters: any = {},
    page: number = 1,
    limit: number = 50
  ): Promise<AnuraCheck[]> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.type) where.type = filters.type;
    if (filters.affiliateId) where.affiliateId = filters.affiliateId;
    if (filters.riskLevel)
      where.result = { path: ["riskLevel"], equals: filters.riskLevel };
    if (filters.blocked)
      where.result = { path: ["blocked"], equals: filters.blocked };
    if (filters.startDate && filters.endDate) {
      where.timestamp = {
        gte: filters.startDate,
        lte: filters.endDate,
      };
    }

    return (await prisma.anuraCheck.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" } as any,
    })) as any;
  }

  static async getAnuraStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<AnuraStats> {
    const where: any = {};

    if (startDate && endDate) {
      where.timestamp = {
        gte: startDate,
        lte: endDate,
      };
    }

    const checks = (await prisma.anuraCheck.findMany({
      where,
    })) as any;

    const stats: AnuraStats = {
      totalChecks: checks.length,
      fraudDetected: 0,
      qualityIssues: 0,
      blockedRequests: 0,
      allowedRequests: 0,
      averageFraudScore: 0,
      averageQualityScore: 0,
      byRiskLevel: {},
      byAffiliate: {},
      byHour: {},
    };

    let totalFraudScore = 0;
    let totalQualityScore = 0;

    checks.forEach((check) => {
      const result = check.result as any;

      // Count fraud and quality issues
      if (result.fraudScore >= 0.7) stats.fraudDetected++;
      if (result.qualityScore <= 0.5) stats.qualityIssues++;

      // Count blocked/allowed
      if (result.blocked) stats.blockedRequests++;
      else stats.allowedRequests++;

      // Sum scores for averages
      totalFraudScore += result.fraudScore;
      totalQualityScore += result.qualityScore;

      // By risk level
      stats.byRiskLevel[result.riskLevel] =
        (stats.byRiskLevel[result.riskLevel] || 0) + 1;

      // By affiliate
      if (check.affiliateId) {
        if (!stats.byAffiliate[check.affiliateId]) {
          stats.byAffiliate[check.affiliateId] = {
            total: 0,
            fraud: 0,
            quality: 0,
            blocked: 0,
            name: "Unknown",
          };
        }
        stats.byAffiliate[check.affiliateId].total++;
        if (result.fraudScore >= 0.7)
          stats.byAffiliate[check.affiliateId].fraud++;
        if (result.qualityScore <= 0.5)
          stats.byAffiliate[check.affiliateId].quality++;
        if (result.blocked) stats.byAffiliate[check.affiliateId].blocked++;
      }

      // By hour
      const hour = (check as any).timestamp?.getHours() || 0;
      if (!stats.byHour[hour]) {
        stats.byHour[hour] = { total: 0, fraud: 0, quality: 0, blocked: 0 };
      }
      stats.byHour[hour].total++;
      if (result.fraudScore >= 0.7) stats.byHour[hour].fraud++;
      if (result.qualityScore <= 0.5) stats.byHour[hour].quality++;
      if (result.blocked) stats.byHour[hour].blocked++;
    });

    // Calculate averages
    stats.averageFraudScore =
      checks.length > 0 ? totalFraudScore / checks.length : 0;
    stats.averageQualityScore =
      checks.length > 0 ? totalQualityScore / checks.length : 0;

    return stats;
  }

  static async updateAnuraSettings(
    settings: Partial<AnuraSettings>
  ): Promise<AnuraConfig> {
    const config = await this.getConfig();
    if (!config) {
      throw new Error("Anura configuration not found");
    }

    return await this.updateConfig(config.id, {
      settings: { ...config.settings, ...settings },
    });
  }

  static async testAnuraConnection(): Promise<boolean> {
    const config = await this.getConfig();
    if (!config) {
      return false;
    }

    try {
      const response = await fetch(`${config.endpoint}/health`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "X-API-Secret": config.apiSecret,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  static async createCustomRule(rule: AnuraCustomRule): Promise<AnuraConfig> {
    const config = await this.getConfig();
    if (!config) {
      throw new Error("Anura configuration not found");
    }

    const customRules = [...config.settings.customRules, rule];

    return await this.updateConfig(config.id, {
      settings: { ...config.settings, customRules },
    });
  }

  static async removeCustomRule(ruleName: string): Promise<AnuraConfig> {
    const config = await this.getConfig();
    if (!config) {
      throw new Error("Anura configuration not found");
    }

    const customRules = config.settings.customRules.filter(
      (rule) => rule.name !== ruleName
    );

    return await this.updateConfig(config.id, {
      settings: { ...config.settings, customRules },
    });
  }
}
