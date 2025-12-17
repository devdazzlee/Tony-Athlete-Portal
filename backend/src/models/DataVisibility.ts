import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface DataVisibilityRule {
  id: string;
  accountId: string;
  name: string;
  description: string;
  type:
    | "AFFILIATE_DATA"
    | "FINANCIAL_DATA"
    | "PERFORMANCE_DATA"
    | "PERSONAL_DATA"
    | "SYSTEM_DATA";
  scope: "GLOBAL" | "ROLE_BASED" | "USER_BASED" | "AFFILIATE_BASED";
  conditions: VisibilityCondition[];
  permissions: VisibilityPermissions;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export interface VisibilityCondition {
  field: string;
  operator:
    | "EQUALS"
    | "NOT_EQUALS"
    | "IN"
    | "NOT_IN"
    | "GREATER_THAN"
    | "LESS_THAN"
    | "CONTAINS";
  value: any;
  logic: "AND" | "OR";
}

export interface VisibilityPermissions {
  view: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
  share: boolean;
  restrictedFields: string[];
  allowedRoles: string[];
  allowedUsers: string[];
  allowedAffiliates: string[];
}

export interface DataAccessLog {
  id: string;
  userId: string;
  resourceType: string;
  resourceId: string;
  action: "VIEW" | "EDIT" | "DELETE" | "EXPORT" | "SHARE";
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  reason?: string;
}

export interface DataMaskingRule {
  id: string;
  accountId: string;
  field: string;
  type: "PARTIAL" | "FULL" | "HASH" | "ENCRYPT" | "REDACT";
  pattern: string;
  replacement: string;
  conditions: VisibilityCondition[];
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export class DataVisibilityModel {
  static async createRule(
    data: Partial<DataVisibilityRule>
  ): Promise<DataVisibilityRule> {
    return (await (prisma as any).dataVisibilityRule.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        description: data.description || "",
        type: data.type!,
        scope: data.scope!,
        conditions: data.conditions || [],
        permissions: data.permissions || {
          view: true,
          edit: false,
          delete: false,
          export: false,
          share: false,
          restrictedFields: [],
          allowedRoles: [],
          allowedUsers: [],
          allowedAffiliates: [],
        },
        status: data.status || "ACTIVE",
      },
    })) as DataVisibilityRule;
  }

  static async findById(id: string): Promise<DataVisibilityRule | null> {
    return (await (prisma as any).dataVisibilityRule.findUnique({
      where: { id },
    })) as DataVisibilityRule | null;
  }

  static async update(
    id: string,
    data: Partial<DataVisibilityRule>
  ): Promise<DataVisibilityRule> {
    return (await (prisma as any).dataVisibilityRule.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as DataVisibilityRule;
  }

  static async delete(id: string): Promise<void> {
    await (prisma as any).dataVisibilityRule.delete({
      where: { id },
    });
  }

  static async list(
    accountId: string,
    filters: any = {}
  ): Promise<DataVisibilityRule[]> {
    const where: any = { accountId };

    if (filters.type) where.type = filters.type;
    if (filters.scope) where.scope = filters.scope;
    if (filters.status) where.status = filters.status;

    return (await (prisma as any).dataVisibilityRule.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })) as DataVisibilityRule[];
  }

  static async checkAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string,
    userRole: string,
    affiliateId?: string
  ): Promise<{ allowed: boolean; reason?: string; maskedFields?: string[] }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { allowed: false, reason: "User not found" };
    }

    // Get applicable rules
    const rules = await (prisma as any).dataVisibilityRule.findMany({
      where: {
        accountId: user.id, // This should be accountId
        status: "ACTIVE",
      },
    });

    let allowed = false;
    let reason = "No matching rules found";
    const maskedFields: string[] = [];

    for (const rule of rules) {
      // Check if rule applies to this resource type
      if (rule.type !== resourceType.toUpperCase() && rule.type !== "GLOBAL") {
        continue;
      }

      // Check scope
      if (rule.scope === "ROLE_BASED") {
        if (!rule.permissions.allowedRoles.includes(userRole)) {
          continue;
        }
      } else if (rule.scope === "USER_BASED") {
        if (!rule.permissions.allowedUsers.includes(userId)) {
          continue;
        }
      } else if (rule.scope === "AFFILIATE_BASED" && affiliateId) {
        if (!rule.permissions.allowedAffiliates.includes(affiliateId)) {
          continue;
        }
      }

      // Check conditions
      const conditionsMet = await this.evaluateConditions(
        rule.conditions,
        resourceType,
        resourceId
      );
      if (!conditionsMet) {
        continue;
      }

      // Check action permissions
      const permissions = rule.permissions;
      switch (action.toUpperCase()) {
        case "VIEW":
          if (permissions.view) {
            allowed = true;
            reason = "Access granted by rule";
          }
          break;
        case "EDIT":
          if (permissions.edit) {
            allowed = true;
            reason = "Edit access granted by rule";
          }
          break;
        case "DELETE":
          if (permissions.delete) {
            allowed = true;
            reason = "Delete access granted by rule";
          }
          break;
        case "EXPORT":
          if (permissions.export) {
            allowed = true;
            reason = "Export access granted by rule";
          }
          break;
        case "SHARE":
          if (permissions.share) {
            allowed = true;
            reason = "Share access granted by rule";
          }
          break;
      }

      // Collect restricted fields
      if (allowed && permissions.restrictedFields) {
        maskedFields.push(...permissions.restrictedFields);
      }
    }

    // Log access attempt
    await this.logAccess(
      userId,
      resourceType,
      resourceId,
      action,
      "127.0.0.1",
      "System",
      allowed,
      reason
    );

    return { allowed, reason, maskedFields };
  }

  private static async evaluateConditions(
    conditions: VisibilityCondition[],
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    if (conditions.length === 0) {
      return true;
    }

    let result = true;
    let logic = "AND";

    for (const condition of conditions) {
      const conditionResult = await this.evaluateCondition(
        condition,
        resourceType,
        resourceId
      );

      if (logic === "AND") {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      logic = condition.logic;
    }

    return result;
  }

  private static async evaluateCondition(
    condition: VisibilityCondition,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    // This would need to be implemented based on the specific resource type
    // For now, return true as a placeholder
    return true;
  }

  static async logAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    reason?: string
  ): Promise<DataAccessLog> {
    return (await (prisma as any).dataAccessLog.create({
      data: {
        userId,
        resourceType,
        resourceId,
        action: action as any,
        ipAddress,
        userAgent,
        timestamp: new Date(),
        success,
        reason,
      },
    })) as DataAccessLog;
  }

  static async getAccessLogs(
    filters: any = {},
    page: number = 1,
    limit: number = 50
  ): Promise<DataAccessLog[]> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.resourceType) where.resourceType = filters.resourceType;
    if (filters.action) where.action = filters.action;
    if (filters.success !== undefined) where.success = filters.success;
    if (filters.startDate && filters.endDate) {
      where.timestamp = {
        gte: filters.startDate,
        lte: filters.endDate,
      };
    }

    return (await (prisma as any).dataAccessLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { timestamp: "desc" },
    })) as DataAccessLog[];
  }

  static async createMaskingRule(
    data: Partial<DataMaskingRule>
  ): Promise<DataMaskingRule> {
    return (await (prisma as any).dataMaskingRule.create({
      data: {
        accountId: data.accountId!,
        field: data.field!,
        type: data.type!,
        pattern: data.pattern || "",
        replacement: data.replacement || "***",
        conditions: data.conditions || [],
        status: data.status || "ACTIVE",
      },
    })) as DataMaskingRule;
  }

  static async findMaskingRuleById(
    id: string
  ): Promise<DataMaskingRule | null> {
    return (await (prisma as any).dataMaskingRule.findUnique({
      where: { id },
    })) as DataMaskingRule | null;
  }

  static async updateMaskingRule(
    id: string,
    data: Partial<DataMaskingRule>
  ): Promise<DataMaskingRule> {
    return (await (prisma as any).dataMaskingRule.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as DataMaskingRule;
  }

  static async deleteMaskingRule(id: string): Promise<void> {
    await (prisma as any).dataMaskingRule.delete({
      where: { id },
    });
  }

  static async listMaskingRules(
    accountId: string,
    filters: any = {}
  ): Promise<DataMaskingRule[]> {
    const where: any = { accountId };

    if (filters.field) where.field = filters.field;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;

    return (await (prisma as any).dataMaskingRule.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })) as DataMaskingRule[];
  }

  static async applyMasking(
    data: any,
    userId: string,
    userRole: string
  ): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return data;
    }

    const maskingRules = await (prisma as any).dataMaskingRule.findMany({
      where: {
        accountId: user.id, // This should be accountId
        status: "ACTIVE",
      },
    });

    const maskedData = { ...data };

    for (const rule of maskingRules) {
      if (maskedData[rule.field]) {
        maskedData[rule.field] = this.maskValue(maskedData[rule.field], rule);
      }
    }

    return maskedData;
  }

  private static maskValue(value: any, rule: DataMaskingRule): string {
    const stringValue = String(value);

    switch (rule.type) {
      case "PARTIAL":
        if (stringValue.length <= 4) {
          return rule.replacement;
        }
        return (
          stringValue.substring(0, 2) +
          rule.replacement +
          stringValue.substring(stringValue.length - 2)
        );

      case "FULL":
        return rule.replacement;

      case "HASH":
        const crypto = require("crypto");
        return crypto
          .createHash("sha256")
          .update(stringValue)
          .digest("hex")
          .substring(0, 8);

      case "ENCRYPT":
        // Implementation for encryption
        return "ENCRYPTED_" + stringValue.substring(0, 4);

      case "REDACT":
        return stringValue.replace(
          new RegExp(rule.pattern, "g"),
          rule.replacement
        );

      default:
        return stringValue;
    }
  }

  static async getDataVisibilityStats(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const where: any = {};

    if (startDate && endDate) {
      where.timestamp = {
        gte: startDate,
        lte: endDate,
      };
    }

    const accessLogs = await (prisma as any).dataAccessLog.findMany({
      where,
    });

    const stats = {
      totalAccessAttempts: accessLogs.length,
      successfulAccess: accessLogs.filter((log) => log.success).length,
      failedAccess: accessLogs.filter((log) => !log.success).length,
      byAction: {} as Record<string, number>,
      byResourceType: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
      topUsers: [] as Array<{ userId: string; count: number }>,
      topResources: [] as Array<{ resourceType: string; count: number }>,
    };

    // Count by action
    accessLogs.forEach((log) => {
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
      stats.byResourceType[log.resourceType] =
        (stats.byResourceType[log.resourceType] || 0) + 1;
      stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;
    });

    // Top users
    stats.topUsers = Object.entries(stats.byUser)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top resources
    stats.topResources = Object.entries(stats.byResourceType)
      .map(([resourceType, count]) => ({ resourceType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  static async createDefaultRules(
    accountId: string
  ): Promise<DataVisibilityRule[]> {
    const defaultRules = [
      {
        name: "Admin Full Access",
        description: "Administrators have full access to all data",
        type: "SYSTEM_DATA" as const,
        scope: "ROLE_BASED" as const,
        conditions: [],
        permissions: {
          view: true,
          edit: true,
          delete: true,
          export: true,
          share: true,
          restrictedFields: [],
          allowedRoles: ["ADMIN"],
          allowedUsers: [],
          allowedAffiliates: [],
        },
      },
      {
        name: "Manager Limited Access",
        description: "Managers have limited access to affiliate data",
        type: "AFFILIATE_DATA" as const,
        scope: "ROLE_BASED" as const,
        conditions: [],
        permissions: {
          view: true,
          edit: true,
          delete: false,
          export: true,
          share: false,
          restrictedFields: ["ssn", "bankAccount", "taxId"],
          allowedRoles: ["MANAGER"],
          allowedUsers: [],
          allowedAffiliates: [],
        },
      },
      {
        name: "Affiliate Own Data",
        description: "Affiliates can only view their own data",
        type: "AFFILIATE_DATA" as const,
        scope: "USER_BASED" as const,
        conditions: [],
        permissions: {
          view: true,
          edit: true,
          delete: false,
          export: false,
          share: false,
          restrictedFields: ["ssn", "bankAccount"],
          allowedRoles: ["AFFILIATE"],
          allowedUsers: [],
          allowedAffiliates: [],
        },
      },
    ];

    const createdRules: DataVisibilityRule[] = [];
    for (const ruleData of defaultRules) {
      const rule = await this.createRule({
        accountId,
        ...ruleData,
      } as any);
      createdRules.push(rule);
    }

    return createdRules;
  }

  static async createDefaultMaskingRules(
    accountId: string
  ): Promise<DataMaskingRule[]> {
    const defaultRules = [
      {
        field: "ssn",
        type: "PARTIAL" as const,
        pattern: "",
        replacement: "***-**-****",
        conditions: [],
      },
      {
        field: "bankAccount",
        type: "PARTIAL" as const,
        pattern: "",
        replacement: "****",
        conditions: [],
      },
      {
        field: "taxId",
        type: "PARTIAL" as const,
        pattern: "",
        replacement: "***-**-****",
        conditions: [],
      },
      {
        field: "phone",
        type: "PARTIAL" as const,
        pattern: "",
        replacement: "***-***-****",
        conditions: [],
      },
    ];

    const createdRules: DataMaskingRule[] = [];
    for (const ruleData of defaultRules) {
      const rule = await this.createMaskingRule({
        accountId,
        ...ruleData,
      } as any);
      createdRules.push(rule);
    }

    return createdRules;
  }

  static async exportDataVisibilityConfig(accountId: string): Promise<any> {
    const rules = await this.list(accountId);
    const maskingRules = await this.listMaskingRules(accountId);

    return {
      rules,
      maskingRules,
      exportedAt: new Date().toISOString(),
    };
  }

  static async importDataVisibilityConfig(
    accountId: string,
    config: any
  ): Promise<void> {
    // Import rules
    if (config.rules) {
      for (const ruleData of config.rules) {
        await this.createRule({
          accountId,
          ...ruleData,
        } as any);
      }
    }

    // Import masking rules
    if (config.maskingRules) {
      for (const maskingRuleData of config.maskingRules) {
        await this.createMaskingRule({
          accountId,
          ...maskingRuleData,
        } as any);
      }
    }
  }
}
