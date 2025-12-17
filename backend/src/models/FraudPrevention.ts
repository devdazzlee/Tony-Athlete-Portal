import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface FraudRule {
  id: string;
  name: string;
  description: string;
  type:
    | "CLICK_FRAUD"
    | "CONVERSION_FRAUD"
    | "TRAFFIC_QUALITY"
    | "GEO_BLOCKING"
    | "DEVICE_FINGERPRINTING";
  conditions: FraudCondition[];
  actions: FraudAction[];
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export interface FraudCondition {
  field: string;
  operator:
    | "EQUALS"
    | "NOT_EQUALS"
    | "CONTAINS"
    | "NOT_CONTAINS"
    | "GREATER_THAN"
    | "LESS_THAN"
    | "IN"
    | "NOT_IN";
  value: any;
  weight: number;
}

export interface FraudAction {
  type:
    | "BLOCK"
    | "FLAG"
    | "REDIRECT"
    | "NOTIFY"
    | "PAUSE_AFFILIATE"
    | "REJECT_CONVERSION";
  parameters: Record<string, any>;
}

export interface FraudEvent {
  id: string;
  ruleId: string;
  type: string;
  severity: string;
  data: any;
  score: number;
  status: "DETECTED" | "REVIEWED" | "RESOLVED" | "FALSE_POSITIVE";
  action: string;
  ipAddress: string;
  userAgent: string;
  affiliateId?: string;
  clickId?: string;
  conversionId?: string;
  createdAt: Date;
  reviewedAt?: Date;
  resolvedAt?: Date;
}

export interface FraudStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsByStatus: Record<string, number>;
  topAffiliates: Array<{ affiliateId: string; count: number; name: string }>;
  topIPs: Array<{ ip: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
}

export class FraudPreventionModel {
  static async createRule(data: Partial<FraudRule>): Promise<FraudRule> {
    const result = await prisma.fraudRule.create({
      data: {
        name: data.name!,
        description: data.description || "",
        type: data.type!,
        conditions: (data.conditions || []) as any,
        actions: (data.actions || []) as any,
        severity: data.severity || "MEDIUM",
        status: data.status || "ACTIVE",
      },
    });
    return result as unknown as FraudRule;
  }

  static async findRuleById(id: string): Promise<FraudRule | null> {
    const result = await prisma.fraudRule.findUnique({
      where: { id },
    });
    return result as unknown as FraudRule | null;
  }

  static async updateRule(
    id: string,
    data: Partial<FraudRule>
  ): Promise<FraudRule> {
    const result = await prisma.fraudRule.update({
      where: { id },
      data: {
        ...data,
        conditions: data.conditions as any,
        actions: data.actions as any,
      },
    });
    return result as unknown as FraudRule;
  }

  static async deleteRule(id: string): Promise<void> {
    await prisma.fraudRule.delete({
      where: { id },
    });
  }

  static async listRules(filters: any = {}): Promise<FraudRule[]> {
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.severity) where.severity = filters.severity;

    const results = await prisma.fraudRule.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return results as unknown as FraudRule[];
  }

  static async detectFraud(
    data: any,
    ipAddress: string,
    userAgent: string,
    affiliateId?: string,
    clickId?: string,
    conversionId?: string
  ): Promise<FraudEvent[]> {
    const activeRules = await this.listRules({ status: "ACTIVE" });
    const fraudEvents: FraudEvent[] = [];

    for (const rule of activeRules) {
      const score = this.calculateFraudScore(rule, data);

      if (score > 0) {
        const fraudEvent = (await prisma.fraudEvent.create({
          data: {
            ruleId: rule.id,
            type: rule.type,
            severity: rule.severity,
            data: data as any,
            score,
            status: "DETECTED",
            action: this.executeFraudActions(rule.actions, data),
            ipAddress,
            userAgent,
            affiliateId,
            clickId,
            conversionId,
          },
        })) as unknown as FraudEvent;

        fraudEvents.push(fraudEvent);
      }
    }

    return fraudEvents;
  }

  private static calculateFraudScore(rule: FraudRule, data: any): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const condition of rule.conditions) {
      const conditionScore = this.evaluateCondition(condition, data);
      totalScore += conditionScore * condition.weight;
      totalWeight += condition.weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private static evaluateCondition(
    condition: FraudCondition,
    data: any
  ): number {
    const fieldValue = this.getFieldValue(data, condition.field);

    switch (condition.operator) {
      case "EQUALS":
        return fieldValue === condition.value ? 1 : 0;
      case "NOT_EQUALS":
        return fieldValue !== condition.value ? 1 : 0;
      case "CONTAINS":
        return String(fieldValue).includes(String(condition.value)) ? 1 : 0;
      case "NOT_CONTAINS":
        return !String(fieldValue).includes(String(condition.value)) ? 1 : 0;
      case "GREATER_THAN":
        return Number(fieldValue) > Number(condition.value) ? 1 : 0;
      case "LESS_THAN":
        return Number(fieldValue) < Number(condition.value) ? 1 : 0;
      case "IN":
        return Array.isArray(condition.value) &&
          condition.value.includes(fieldValue)
          ? 1
          : 0;
      case "NOT_IN":
        return Array.isArray(condition.value) &&
          !condition.value.includes(fieldValue)
          ? 1
          : 0;
      default:
        return 0;
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

  private static executeFraudActions(
    actions: FraudAction[],
    data: any
  ): string {
    const executedActions: string[] = [];

    for (const action of actions) {
      switch (action.type) {
        case "BLOCK":
          executedActions.push("BLOCKED");
          break;
        case "FLAG":
          executedActions.push("FLAGGED");
          break;
        case "REDIRECT":
          executedActions.push("REDIRECTED");
          break;
        case "NOTIFY":
          executedActions.push("NOTIFIED");
          break;
        case "PAUSE_AFFILIATE":
          executedActions.push("AFFILIATE_PAUSED");
          break;
        case "REJECT_CONVERSION":
          executedActions.push("CONVERSION_REJECTED");
          break;
      }
    }

    return executedActions.join(", ");
  }

  static async getFraudEvents(
    filters: any = {},
    page: number = 1,
    limit: number = 50
  ): Promise<FraudEvent[]> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.severity) where.severity = filters.severity;
    if (filters.affiliateId) where.affiliateId = filters.affiliateId;
    if (filters.startDate && filters.endDate) {
      where.createdAt = {
        gte: filters.startDate,
        lte: filters.endDate,
      };
    }

    const results = await prisma.fraudEvent.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    return results as unknown as FraudEvent[];
  }

  static async updateFraudEventStatus(
    id: string,
    status: string
  ): Promise<FraudEvent> {
    const updateData: any = { status };

    if (status === "REVIEWED") {
      updateData.reviewedAt = new Date();
    } else if (status === "RESOLVED") {
      updateData.resolvedAt = new Date();
    }

    const result = await prisma.fraudEvent.update({
      where: { id },
      data: updateData,
    });
    return result as unknown as FraudEvent;
  }

  static async getFraudStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<FraudStats> {
    const where: any = {};

    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const events = await prisma.fraudEvent.findMany({
      where,
      include: {
        affiliate: {
          include: {
            user: true,
          },
        },
      },
    });

    const stats: FraudStats = {
      totalEvents: events.length,
      eventsByType: {},
      eventsBySeverity: {},
      eventsByStatus: {},
      topAffiliates: [],
      topIPs: [],
      topCountries: [],
    };

    // Count by type, severity, and status
    events.forEach((event) => {
      stats.eventsByType[event.type] =
        (stats.eventsByType[event.type] || 0) + 1;
      stats.eventsBySeverity[event.severity] =
        (stats.eventsBySeverity[event.severity] || 0) + 1;
      stats.eventsByStatus[event.status] =
        (stats.eventsByStatus[event.status] || 0) + 1;
    });

    // Top affiliates
    const affiliateCounts: Record<string, { count: number; name: string }> = {};
    events.forEach((event) => {
      if (event.affiliateId) {
        if (!affiliateCounts[event.affiliateId]) {
          affiliateCounts[event.affiliateId] = {
            count: 0,
            name: event.affiliate?.user
              ? `${event.affiliate.user.firstName} ${event.affiliate.user.lastName}`
              : "Unknown",
          };
        }
        affiliateCounts[event.affiliateId].count++;
      }
    });

    stats.topAffiliates = Object.entries(affiliateCounts)
      .map(([affiliateId, data]) => ({ affiliateId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top IPs
    const ipCounts: Record<string, number> = {};
    events.forEach((event) => {
      ipCounts[event.ipAddress] = (ipCounts[event.ipAddress] || 0) + 1;
    });

    stats.topIPs = Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top countries
    const countryCounts: Record<string, number> = {};
    events.forEach((event) => {
      const eventData = event.data as any;
      const country = eventData?.country || "Unknown";
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });

    stats.topCountries = Object.entries(countryCounts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  static async createDefaultRules(): Promise<FraudRule[]> {
    const defaultRules = [
      {
        name: "High Click Rate Detection",
        description: "Detects unusually high click rates from single IP",
        type: "CLICK_FRAUD" as const,
        conditions: [
          {
            field: "clicks_per_hour",
            operator: "GREATER_THAN" as const,
            value: 100,
            weight: 1,
          },
          {
            field: "ip_address",
            operator: "EQUALS" as const,
            value: "same",
            weight: 1,
          },
        ],
        actions: [{ type: "FLAG" as const, parameters: {} }],
        severity: "HIGH" as const,
      },
      {
        name: "Suspicious User Agent",
        description: "Detects suspicious or bot user agents",
        type: "TRAFFIC_QUALITY" as const,
        conditions: [
          {
            field: "user_agent",
            operator: "CONTAINS" as const,
            value: "bot",
            weight: 1,
          },
          {
            field: "user_agent",
            operator: "EQUALS" as const,
            value: "",
            weight: 1,
          },
        ],
        actions: [{ type: "BLOCK" as const, parameters: {} }],
        severity: "MEDIUM" as const,
      },
      {
        name: "Geo Blocking",
        description: "Blocks traffic from specific countries",
        type: "GEO_BLOCKING" as const,
        conditions: [
          {
            field: "country",
            operator: "IN" as const,
            value: ["CN", "RU", "KP"],
            weight: 1,
          },
        ],
        actions: [{ type: "BLOCK" as const, parameters: {} }],
        severity: "HIGH" as const,
      },
    ];

    const createdRules: FraudRule[] = [];
    for (const ruleData of defaultRules) {
      const rule = await this.createRule(ruleData);
      createdRules.push(rule);
    }

    return createdRules;
  }
}
