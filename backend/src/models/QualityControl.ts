import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface QualityRule {
  id: string;
  name: string;
  description: string;
  type:
    | "TRAFFIC_QUALITY"
    | "CONVERSION_QUALITY"
    | "AFFILIATE_QUALITY"
    | "OFFER_QUALITY";
  conditions: QualityCondition[];
  actions: QualityAction[];
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export interface QualityCondition {
  field: string;
  operator:
    | "EQUALS"
    | "NOT_EQUALS"
    | "GREATER_THAN"
    | "LESS_THAN"
    | "BETWEEN"
    | "IN"
    | "NOT_IN";
  value: any;
  weight: number;
}

export interface QualityAction {
  type:
    | "APPROVE"
    | "REJECT"
    | "FLAG"
    | "REQUIRE_REVIEW"
    | "PAUSE_AFFILIATE"
    | "SEND_NOTIFICATION";
  parameters: Record<string, any>;
}

export interface QualityCheck {
  id: string;
  ruleId: string;
  type: string;
  data: any;
  score: number;
  status: "PASSED" | "FAILED" | "REVIEW_REQUIRED";
  action: string;
  affiliateId?: string;
  clickId?: string;
  conversionId?: string;
  offerId?: string;
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export interface QualityMetrics {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  reviewRequired: number;
  passRate: number;
  byType: Record<string, any>;
  byAffiliate: Record<string, any>;
  byOffer: Record<string, any>;
}

export class QualityControlModel {
  static async createRule(data: any): Promise<any> {
    return (await prisma.qualityRule.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        description: data.description || "",
        conditions: (data.conditions || []) as any,
        actions: (data.actions || []) as any,
        status: data.status || "ACTIVE",
      },
    })) as unknown as any;
  }

  static async findRuleById(id: string): Promise<any | null> {
    return (await prisma.qualityRule.findUnique({
      where: { id },
    })) as unknown as any | null;
  }

  static async updateRule(id: string, data: any): Promise<any> {
    return (await prisma.qualityRule.update({
      where: { id },
      data: {
        ...data,
        conditions: data.conditions as any,
        actions: data.actions as any,
        updatedAt: new Date(),
      },
    })) as unknown as any;
  }

  static async deleteRule(id: string): Promise<void> {
    await prisma.qualityRule.delete({
      where: { id },
    });
  }

  static async listRules(filters: any = {}): Promise<any[]> {
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.accountId) where.accountId = filters.accountId;

    return (await prisma.qualityRule.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })) as unknown as any[];
  }

  static async performQualityCheck(
    data: any,
    type: string,
    affiliateId?: string,
    clickId?: string,
    conversionId?: string,
    offerId?: string
  ): Promise<any[]> {
    const activeRules = await this.listRules({ status: "ACTIVE" });
    const qualityChecks: any[] = [];

    for (const rule of activeRules) {
      const score = this.calculateQualityScore(rule, data);
      const status = this.determineQualityStatus(score, rule);
      const action = this.executeQualityActions(rule.actions as any, data);

      const qualityCheck = (await prisma.qualityCheck.create({
        data: {
          ruleId: rule.id,
          affiliateId: affiliateId || "",
          result: status,
          data: data as any,
        },
      })) as unknown as any;

      qualityChecks.push(qualityCheck);
    }

    return qualityChecks;
  }

  private static calculateQualityScore(rule: any, data: any): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const condition of rule.conditions as any) {
      const conditionScore = this.evaluateCondition(condition, data);
      totalScore += conditionScore * condition.weight;
      totalWeight += condition.weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private static evaluateCondition(
    condition: QualityCondition,
    data: any
  ): number {
    const fieldValue = this.getFieldValue(data, condition.field);

    switch (condition.operator) {
      case "EQUALS":
        return fieldValue === condition.value ? 1 : 0;
      case "NOT_EQUALS":
        return fieldValue !== condition.value ? 1 : 0;
      case "GREATER_THAN":
        return Number(fieldValue) > Number(condition.value) ? 1 : 0;
      case "LESS_THAN":
        return Number(fieldValue) < Number(condition.value) ? 1 : 0;
      case "BETWEEN":
        const [min, max] = Array.isArray(condition.value)
          ? condition.value
          : [0, 0];
        return Number(fieldValue) >= min && Number(fieldValue) <= max ? 1 : 0;
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

  private static determineQualityStatus(
    score: number,
    rule: any
  ): "PASSED" | "FAILED" | "REVIEW_REQUIRED" {
    if (score >= 0.8) return "PASSED";
    if (score >= 0.5) return "REVIEW_REQUIRED";
    return "FAILED";
  }

  private static executeQualityActions(
    actions: QualityAction[],
    data: any
  ): string {
    const executedActions: string[] = [];

    for (const action of actions) {
      switch (action.type) {
        case "APPROVE":
          executedActions.push("APPROVED");
          break;
        case "REJECT":
          executedActions.push("REJECTED");
          break;
        case "FLAG":
          executedActions.push("FLAGGED");
          break;
        case "REQUIRE_REVIEW":
          executedActions.push("REVIEW_REQUIRED");
          break;
        case "PAUSE_AFFILIATE":
          executedActions.push("AFFILIATE_PAUSED");
          break;
        case "SEND_NOTIFICATION":
          executedActions.push("NOTIFICATION_SENT");
          break;
      }
    }

    return executedActions.join(", ");
  }

  static async getQualityChecks(
    filters: any = {},
    page: number = 1,
    limit: number = 50
  ): Promise<any[]> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.result) where.result = filters.result;
    if (filters.affiliateId) where.affiliateId = filters.affiliateId;
    if (filters.startDate && filters.endDate) {
      where.createdAt = {
        gte: filters.startDate,
        lte: filters.endDate,
      };
    }

    return (await prisma.qualityCheck.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    })) as unknown as any[];
  }

  static async updateQualityCheckStatus(
    id: string,
    status: string,
    reviewedBy: string
  ): Promise<any> {
    return (await prisma.qualityCheck.update({
      where: { id },
      data: {
        result: status,
        updatedAt: new Date(),
      },
    })) as unknown as any;
  }

  static async getQualityMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<QualityMetrics> {
    const where: any = {};

    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const checks = await prisma.qualityCheck.findMany({
      where,
    });

    const metrics: QualityMetrics = {
      totalChecks: checks.length,
      passedChecks: 0,
      failedChecks: 0,
      reviewRequired: 0,
      passRate: 0,
      byType: {},
      byAffiliate: {},
      byOffer: {},
    };

    // Count by status
    checks.forEach((check) => {
      switch (check.result) {
        case "PASSED":
          metrics.passedChecks++;
          break;
        case "FAILED":
          metrics.failedChecks++;
          break;
        case "REVIEW_REQUIRED":
          metrics.reviewRequired++;
          break;
      }

      // By affiliate
      if (check.affiliateId) {
        if (!metrics.byAffiliate[check.affiliateId]) {
          metrics.byAffiliate[check.affiliateId] = {
            total: 0,
            passed: 0,
            failed: 0,
            review: 0,
            name: "Unknown",
          };
        }
        metrics.byAffiliate[check.affiliateId].total++;
        if (check.result === "PASSED")
          metrics.byAffiliate[check.affiliateId].passed++;
        else if (check.result === "FAILED")
          metrics.byAffiliate[check.affiliateId].failed++;
        else if (check.result === "REVIEW_REQUIRED")
          metrics.byAffiliate[check.affiliateId].review++;
      }
    });

    // Calculate pass rate
    metrics.passRate =
      metrics.totalChecks > 0
        ? (metrics.passedChecks / metrics.totalChecks) * 100
        : 0;

    return metrics;
  }

  static async createDefaultRules(accountId: string): Promise<any[]> {
    const defaultRules = [
      {
        accountId,
        name: "Traffic Quality Check",
        description: "Checks for high-quality traffic indicators",
        conditions: [
          {
            field: "bounce_rate",
            operator: "LESS_THAN",
            value: 0.7,
            weight: 1,
          },
          {
            field: "session_duration",
            operator: "GREATER_THAN",
            value: 30,
            weight: 1,
          },
          {
            field: "pages_per_session",
            operator: "GREATER_THAN",
            value: 2,
            weight: 1,
          },
        ],
        actions: [{ type: "APPROVE", parameters: {} }],
      },
      {
        accountId,
        name: "Conversion Quality Check",
        description: "Validates conversion quality and legitimacy",
        conditions: [
          {
            field: "conversion_time",
            operator: "GREATER_THAN",
            value: 60,
            weight: 1,
          },
          {
            field: "conversion_value",
            operator: "GREATER_THAN",
            value: 0,
            weight: 1,
          },
          {
            field: "customer_info_complete",
            operator: "EQUALS",
            value: true,
            weight: 1,
          },
        ],
        actions: [{ type: "APPROVE", parameters: {} }],
      },
      {
        accountId,
        name: "Affiliate Quality Check",
        description: "Monitors affiliate performance and compliance",
        conditions: [
          {
            field: "conversion_rate",
            operator: "GREATER_THAN",
            value: 0.01,
            weight: 1,
          },
          {
            field: "complaint_count",
            operator: "LESS_THAN",
            value: 5,
            weight: 1,
          },
          {
            field: "compliance_score",
            operator: "GREATER_THAN",
            value: 0.8,
            weight: 1,
          },
        ],
        actions: [{ type: "APPROVE", parameters: {} }],
      },
    ];

    const createdRules: any[] = [];
    for (const ruleData of defaultRules) {
      const rule = await this.createRule(ruleData);
      createdRules.push(rule);
    }

    return createdRules;
  }
}
