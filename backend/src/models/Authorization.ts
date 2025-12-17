import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface Role {
  id: string;
  accountId: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  isDefault: boolean;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  conditions?: PermissionCondition[];
  granted: boolean;
}

export interface PermissionCondition {
  field: string;
  operator:
    | "EQUALS"
    | "NOT_EQUALS"
    | "CONTAINS"
    | "IN"
    | "NOT_IN"
    | "OWNER"
    | "SAME_ACCOUNT";
  value: any;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  accountId: string;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface AccessControl {
  id: string;
  accountId: string;
  resource: string;
  resourceId: string;
  userId?: string;
  roleId?: string;
  permissions: string[];
  conditions: AccessCondition[];
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export interface AccessCondition {
  field: string;
  operator:
    | "EQUALS"
    | "NOT_EQUALS"
    | "CONTAINS"
    | "IN"
    | "NOT_IN"
    | "OWNER"
    | "SAME_ACCOUNT";
  value: any;
  logic: "AND" | "OR";
}

export interface AuditLog {
  id: string;
  accountId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface Session {
  id: string;
  userId: string;
  accountId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
}

export interface TwoFactorAuth {
  id: string;
  userId: string;
  accountId: string;
  method: "TOTP" | "SMS" | "EMAIL" | "HARDWARE";
  secret?: string;
  backupCodes: string[];
  isEnabled: boolean;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthorizationModel {
  static async createRole(data: Partial<Role>): Promise<Role> {
    return (await prisma.role.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        description: data.description || "",
        permissions: (data.permissions || []) as any,
      } as any,
    })) as any;
  }

  static async findRoleById(id: string): Promise<Role | null> {
    return (await prisma.role.findUnique({
      where: { id },
    })) as any;
  }

  static async findRoleByName(
    accountId: string,
    name: string
  ): Promise<Role | null> {
    return (await prisma.role.findFirst({
      where: {
        accountId,
        name,
      } as any,
    })) as any;
  }

  static async updateRole(id: string, data: Partial<Role>): Promise<Role> {
    return (await prisma.role.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      } as any,
    })) as any;
  }

  static async deleteRole(id: string): Promise<void> {
    await prisma.role.delete({
      where: { id },
    });
  }

  static async listRoles(
    accountId: string,
    filters: any = {}
  ): Promise<Role[]> {
    const where: any = { accountId };

    if (filters.status) where.status = filters.status;
    if (filters.isSystem !== undefined) where.isSystem = filters.isSystem;
    if (filters.isDefault !== undefined) where.isDefault = filters.isDefault;

    return (await prisma.role.findMany({
      where,
      orderBy: { name: "asc" },
    })) as any;
  }

  static async assignRole(
    userId: string,
    roleId: string,
    accountId: string,
    grantedBy: string,
    expiresAt?: Date
  ): Promise<UserRole> {
    return (await prisma.userRoleAssignment.create({
      data: {
        userId,
        roleId,
        accountId,
        assignedAt: new Date(),
      },
    })) as any;
  }

  static async revokeRole(userRoleId: string): Promise<void> {
    await prisma.userRoleAssignment.update({
      where: { id: userRoleId },
      data: {} as any,
    });
  }

  static async getUserRoles(
    userId: string,
    accountId: string
  ): Promise<UserRole[]> {
    return (await prisma.userRoleAssignment.findMany({
      where: {
        userId,
        accountId,
      } as any,
    })) as any;
  }

  static async checkPermission(
    userId: string,
    accountId: string,
    resource: string,
    action: string,
    resourceId?: string,
    context?: any
  ): Promise<boolean> {
    // Get user roles
    const userRoles = await this.getUserRoles(userId, accountId);

    // Check if user has any role with the required permission
    for (const userRole of userRoles) {
      const role = (userRole as any).role || {};

      for (const permission of role.permissions) {
        if (
          permission.resource === resource &&
          permission.action === action &&
          permission.granted
        ) {
          // Check permission conditions
          if (
            this.evaluatePermissionConditions(
              permission.conditions || [],
              context,
              resourceId
            )
          ) {
            return true;
          }
        }
      }
    }

    // Check direct access controls
    const accessControls = await this.getAccessControls(
      userId,
      accountId,
      resource,
      resourceId
    );
    for (const accessControl of accessControls) {
      if (accessControl.permissions.includes(action)) {
        if (
          this.evaluateAccessConditions(
            accessControl.conditions,
            context,
            resourceId
          )
        ) {
          return true;
        }
      }
    }

    return false;
  }

  private static evaluatePermissionConditions(
    conditions: PermissionCondition[],
    context: any,
    resourceId?: string
  ): boolean {
    if (conditions.length === 0) return true;

    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, context, resourceId)) {
        return false;
      }
    }

    return true;
  }

  private static evaluateAccessConditions(
    conditions: AccessCondition[],
    context: any,
    resourceId?: string
  ): boolean {
    if (conditions.length === 0) return true;

    let result = true;
    let logic = "AND";

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(
        condition,
        context,
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

  private static evaluateCondition(
    condition: PermissionCondition | AccessCondition,
    context: any,
    resourceId?: string
  ): boolean {
    let value: any;

    switch (condition.operator) {
      case "OWNER":
        return context?.userId === context?.ownerId;
      case "SAME_ACCOUNT":
        return context?.accountId === context?.resourceAccountId;
      default:
        value = this.getFieldValue(context, condition.field);
        break;
    }

    switch (condition.operator) {
      case "EQUALS":
        return value === condition.value;
      case "NOT_EQUALS":
        return value !== condition.value;
      case "CONTAINS":
        return String(value).includes(String(condition.value));
      case "IN":
        return (
          Array.isArray(condition.value) && condition.value.includes(value)
        );
      case "NOT_IN":
        return (
          Array.isArray(condition.value) && !condition.value.includes(value)
        );
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

  static async createAccessControl(
    data: Partial<AccessControl>
  ): Promise<AccessControl> {
    return (await prisma.accessControl.create({
      data: {
        accountId: data.accountId!,
        resource: data.resource!,
        userId: data.userId,
        roleId: data.roleId,
        permissions: data.permissions || [],
        conditions: data.conditions || [],
        status: data.status || "ACTIVE",
      } as any,
    })) as any;
  }

  static async getAccessControls(
    userId: string,
    accountId: string,
    resource: string,
    resourceId?: string
  ): Promise<AccessControl[]> {
    const where: any = {
      accountId,
      resource,
      status: "ACTIVE",
    };

    if (resourceId) {
      where.resourceId = resourceId;
    }

    where.OR = [
      { userId },
      { roleId: { in: await this.getUserRoleIds(userId, accountId) } },
    ];

    return (await prisma.accessControl.findMany({
      where,
    })) as any;
  }

  private static async getUserRoleIds(
    userId: string,
    accountId: string
  ): Promise<string[]> {
    const userRoles = await this.getUserRoles(userId, accountId);
    return userRoles.map((ur) => ur.roleId);
  }

  static async createAuditLog(data: Partial<AuditLog>): Promise<AuditLog> {
    return (await prisma.auditLog.create({
      data: {
        accountId: data.accountId!,
        userId: data.userId!,
        action: data.action!,
        resource: data.resource!,
        resourceId: data.resourceId!,
        details: data.details || {},
        ipAddress: data.ipAddress!,
        userAgent: data.userAgent!,
        timestamp: data.timestamp || new Date(),
      },
    })) as AuditLog;
  }

  static async getAuditLogs(
    accountId: string,
    filters: any = {},
    page: number = 1,
    limit: number = 50
  ): Promise<AuditLog[]> {
    const skip = (page - 1) * limit;
    const where: any = { accountId };

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.resource) where.resource = filters.resource;
    if (filters.resourceId) where.resourceId = filters.resourceId;
    if (filters.startDate && filters.endDate) {
      where.timestamp = {
        gte: filters.startDate,
        lte: filters.endDate,
      };
    }

    return (await prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { timestamp: "desc" },
    })) as AuditLog[];
  }

  static async createSession(data: Partial<Session>): Promise<Session> {
    return (await prisma.session.create({
      data: {
        userId: data.userId!,
        token: data.token!,
        refreshToken: data.refreshToken!,
        expiresAt: data.expiresAt!,
        ipAddress: data.ipAddress!,
        userAgent: data.userAgent!,
      } as any,
    })) as Session;
  }

  static async findSessionByToken(token: string): Promise<Session | null> {
    return (await prisma.session.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      } as any,
    })) as Session | null;
  }

  static async updateSessionActivity(sessionId: string): Promise<Session> {
    return (await prisma.session.update({
      where: { id: sessionId },
      data: {},
    })) as Session;
  }

  static async revokeSession(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: {} as any,
    });
  }

  static async revokeAllUserSessions(
    userId: string,
    accountId: string
  ): Promise<void> {
    await prisma.session.updateMany({
      where: {
        userId,
      } as any,
      data: {} as any,
    });
  }

  static async createTwoFactorAuth(
    data: Partial<TwoFactorAuth>
  ): Promise<TwoFactorAuth> {
    return (await prisma.twoFactorAuth.create({
      data: {
        userId: data.userId!,
        method: data.method!,
        secret: data.secret,
        backupCodes: data.backupCodes || [],
        isEnabled: data.isEnabled || false,
      } as any,
    })) as TwoFactorAuth;
  }

  static async findTwoFactorAuthByUser(
    userId: string,
    accountId: string
  ): Promise<TwoFactorAuth | null> {
    return (await prisma.twoFactorAuth.findFirst({
      where: {
        userId,
      } as any,
    })) as TwoFactorAuth | null;
  }

  static async updateTwoFactorAuth(
    id: string,
    data: Partial<TwoFactorAuth>
  ): Promise<TwoFactorAuth> {
    return (await prisma.twoFactorAuth.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as TwoFactorAuth;
  }

  static async deleteTwoFactorAuth(id: string): Promise<void> {
    await prisma.twoFactorAuth.delete({
      where: { id },
    });
  }

  static async generateBackupCodes(): Promise<string[]> {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 8).toUpperCase());
    }
    return codes;
  }

  static async verifyTwoFactorCode(
    userId: string,
    accountId: string,
    code: string
  ): Promise<boolean> {
    const twoFactor = await this.findTwoFactorAuthByUser(userId, accountId);
    if (!twoFactor || !twoFactor.isEnabled) {
      return false;
    }

    // Check backup codes first
    if (twoFactor.backupCodes.includes(code)) {
      // Remove used backup code
      const updatedCodes = twoFactor.backupCodes.filter((c) => c !== code);
      await this.updateTwoFactorAuth(twoFactor.id, {
        backupCodes: updatedCodes,
        lastUsed: new Date(),
      });
      return true;
    }

    // Verify TOTP code
    if (twoFactor.method === "TOTP" && twoFactor.secret) {
      const isValid = this.verifyTOTPCode(twoFactor.secret, code);
      if (isValid) {
        await this.updateTwoFactorAuth(twoFactor.id, {
          lastUsed: new Date(),
        });
      }
      return isValid;
    }

    return false;
  }

  private static verifyTOTPCode(secret: string, code: string): boolean {
    // Implement TOTP verification
    // This is a simplified implementation - use a proper TOTP library in production
    const crypto = require("crypto");
    const time = Math.floor(Date.now() / 1000 / 30);
    const key = Buffer.from(secret, "base64");

    for (let i = -1; i <= 1; i++) {
      const timeStep = time + i;
      const hmac = crypto.createHmac("sha1", key);
      hmac.update(Buffer.from(timeStep.toString(16).padStart(16, "0"), "hex"));
      const hash = hmac.digest();
      const offset = hash[hash.length - 1] & 0xf;
      const binary =
        ((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff);
      const totp = (binary % 1000000).toString().padStart(6, "0");

      if (totp === code) {
        return true;
      }
    }

    return false;
  }

  static async getAuthorizationStats(accountId: string): Promise<any> {
    const roles = await this.listRoles(accountId);
    const userRoles = await prisma.userRoleAssignment.count({
      where: { accountId } as any,
    });
    const sessions = await prisma.session.count({
      where: {} as any,
    });
    const twoFactorUsers = await prisma.twoFactorAuth.count({
      where: { isEnabled: true } as any,
    });

    const stats = {
      totalRoles: roles.length,
      activeRoles: roles.filter((r) => r.status === "ACTIVE").length,
      totalUserRoles: userRoles,
      activeSessions: sessions,
      twoFactorUsers,
      byRole: {} as Record<string, number>,
      byPermission: {} as Record<string, number>,
    };

    // Count users by role
    for (const role of roles) {
      const count = await prisma.userRoleAssignment.count({
        where: { roleId: role.id } as any,
      });
      stats.byRole[role.name] = count;
    }

    // Count permissions
    for (const role of roles) {
      for (const permission of role.permissions) {
        const key = `${permission.resource}:${permission.action}`;
        stats.byPermission[key] = (stats.byPermission[key] || 0) + 1;
      }
    }

    return stats;
  }

  static async createDefaultRoles(accountId: string): Promise<Role[]> {
    const defaultRoles = [
      {
        name: "Super Admin",
        description: "Full system access",
        permissions: [{ id: "all", resource: "*", action: "*", granted: true }],
        isSystem: true,
        isDefault: true,
      },
      {
        name: "Admin",
        description: "Account administration",
        permissions: [
          {
            id: "affiliates_manage",
            resource: "affiliates",
            action: "manage",
            granted: true,
          },
          {
            id: "offers_manage",
            resource: "offers",
            action: "manage",
            granted: true,
          },
          {
            id: "reports_view",
            resource: "reports",
            action: "view",
            granted: true,
          },
          {
            id: "settings_manage",
            resource: "settings",
            action: "manage",
            granted: true,
          },
        ],
        isSystem: false,
        isDefault: true,
      },
      {
        name: "Affiliate Manager",
        description: "Affiliate management",
        permissions: [
          {
            id: "affiliates_view",
            resource: "affiliates",
            action: "view",
            granted: true,
          },
          {
            id: "affiliates_edit",
            resource: "affiliates",
            action: "edit",
            granted: true,
          },
          {
            id: "offers_view",
            resource: "offers",
            action: "view",
            granted: true,
          },
          {
            id: "reports_view",
            resource: "reports",
            action: "view",
            granted: true,
          },
        ],
        isSystem: false,
        isDefault: true,
      },
      {
        name: "Affiliate",
        description: "Affiliate partner",
        permissions: [
          {
            id: "dashboard_view",
            resource: "dashboard",
            action: "view",
            granted: true,
          },
          {
            id: "links_manage",
            resource: "links",
            action: "manage",
            granted: true,
          },
          {
            id: "reports_view_own",
            resource: "reports",
            action: "view",
            conditions: [
              { field: "affiliateId", operator: "OWNER", value: null },
            ],
            granted: true,
          },
        ],
        isSystem: false,
        isDefault: true,
      },
    ];

    const createdRoles: Role[] = [];
    for (const roleData of defaultRoles) {
      const role = await this.createRole({
        accountId,
        ...roleData,
      } as any);
      createdRoles.push(role);
    }

    return createdRoles;
  }

  static async getAuthorizationDashboard(accountId: string): Promise<any> {
    const roles = await this.listRoles(accountId);
    const stats = await this.getAuthorizationStats(accountId);

    return {
      roles,
      stats,
    };
  }
}
