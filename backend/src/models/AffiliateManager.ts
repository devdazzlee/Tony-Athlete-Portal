import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface AffiliateManager {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  role: "MANAGER" | "SENIOR_MANAGER" | "DIRECTOR" | "VP";
  permissions: ManagerPermissions;
  assignedAffiliates: string[];
  assignedOffers: string[];
  assignedRegions: string[];
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: Date;
  updatedAt: Date;
}

export interface ManagerPermissions {
  affiliates: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    approve: boolean;
    suspend: boolean;
  };
  offers: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    approve: boolean;
  };
  payouts: {
    view: boolean;
    approve: boolean;
    process: boolean;
    reject: boolean;
  };
  reports: {
    view: boolean;
    export: boolean;
    schedule: boolean;
  };
  settings: {
    view: boolean;
    edit: boolean;
  };
  communications: {
    send: boolean;
    view: boolean;
    manage: boolean;
  };
}

export interface ManagerActivity {
  id: string;
  managerId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface ManagerPerformance {
  id: string;
  managerId: string;
  period: string;
  metrics: {
    affiliatesManaged: number;
    newAffiliates: number;
    activeAffiliates: number;
    totalCommissions: number;
    totalPayouts: number;
    averageAffiliateEarnings: number;
    conversionRate: number;
    retentionRate: number;
  };
  createdAt: Date;
}

export class AffiliateManagerModel {
  static async create(
    data: Partial<AffiliateManager>
  ): Promise<AffiliateManager> {
    return (await prisma.affiliateManager.create({
      data: {
        affiliateId: data.userId!,
        managerId: data.userId!,
        accountId: "default",
        status: data.status || "ACTIVE",
      } as any,
    })) as any;
  }

  static async findById(id: string): Promise<AffiliateManager | null> {
    return (await prisma.affiliateManager.findUnique({
      where: { id },
    })) as any;
  }

  static async findByUserId(userId: string): Promise<AffiliateManager | null> {
    return (await prisma.affiliateManager.findUnique({
      where: { affiliateId: userId } as any,
    })) as any;
  }

  static async update(
    id: string,
    data: Partial<AffiliateManager>
  ): Promise<AffiliateManager> {
    return (await prisma.affiliateManager.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as any;
  }

  static async delete(id: string): Promise<void> {
    await prisma.affiliateManager.delete({
      where: { id },
    });
  }

  static async list(
    filters: any = {},
    page: number = 1,
    limit: number = 20
  ): Promise<AffiliateManager[]> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.role) where.role = filters.role;
    if (filters.department) where.department = filters.department;
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search } },
        { lastName: { contains: filters.search } },
        { email: { contains: filters.search } },
      ];
    }

    return (await prisma.affiliateManager.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    })) as any;
  }

  static async assignAffiliate(
    managerId: string,
    affiliateId: string
  ): Promise<AffiliateManager> {
    const manager = await this.findById(managerId);
    if (!manager) {
      throw new Error("Manager not found");
    }

    const assignedAffiliates = [...manager.assignedAffiliates, affiliateId];
    return await this.update(managerId, { assignedAffiliates });
  }

  static async unassignAffiliate(
    managerId: string,
    affiliateId: string
  ): Promise<AffiliateManager> {
    const manager = await this.findById(managerId);
    if (!manager) {
      throw new Error("Manager not found");
    }

    const assignedAffiliates = manager.assignedAffiliates.filter(
      (id) => id !== affiliateId
    );
    return await this.update(managerId, { assignedAffiliates });
  }

  static async assignOffer(
    managerId: string,
    offerId: string
  ): Promise<AffiliateManager> {
    const manager = await this.findById(managerId);
    if (!manager) {
      throw new Error("Manager not found");
    }

    const assignedOffers = [...manager.assignedOffers, offerId];
    return await this.update(managerId, { assignedOffers });
  }

  static async unassignOffer(
    managerId: string,
    offerId: string
  ): Promise<AffiliateManager> {
    const manager = await this.findById(managerId);
    if (!manager) {
      throw new Error("Manager not found");
    }

    const assignedOffers = manager.assignedOffers.filter(
      (id) => id !== offerId
    );
    return await this.update(managerId, { assignedOffers });
  }

  static async updatePermissions(
    managerId: string,
    permissions: Partial<ManagerPermissions>
  ): Promise<AffiliateManager> {
    const manager = await this.findById(managerId);
    if (!manager) {
      throw new Error("Manager not found");
    }

    const updatedPermissions = {
      ...manager.permissions,
      ...permissions,
    };

    return await this.update(managerId, { permissions: updatedPermissions });
  }

  static async recordActivity(
    managerId: string,
    action: string,
    resource: string,
    resourceId: string,
    details: any,
    ipAddress: string,
    userAgent: string
  ): Promise<ManagerActivity> {
    return (await prisma.managerActivity.create({
      data: {
        managerId,
        affiliateId: resourceId,
        type: action,
        description: resource,
        data: details,
      } as any,
    })) as any;
  }

  static async getActivities(
    managerId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<ManagerActivity[]> {
    const skip = (page - 1) * limit;
    return (await prisma.managerActivity.findMany({
      where: { managerId },
      skip,
      take: limit,
      orderBy: { timestamp: "desc" },
    })) as any;
  }

  static async getAssignedAffiliates(
    managerId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any[]> {
    const manager = await this.findById(managerId);
    if (!manager) {
      return [];
    }

    const skip = (page - 1) * limit;
    return await prisma.affiliateProfile.findMany({
      where: {
        id: { in: manager.assignedAffiliates },
      },
      include: {
        user: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  static async getAssignedOffers(
    managerId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any[]> {
    const manager = await this.findById(managerId);
    if (!manager) {
      return [];
    }

    const skip = (page - 1) * limit;
    return await prisma.offer.findMany({
      where: {
        id: { in: manager.assignedOffers },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  static async getManagerStats(
    managerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const manager = await this.findById(managerId);
    if (!manager) {
      return null;
    }

    const where: any = { id: { in: manager.assignedAffiliates } };

    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const affiliates = await prisma.affiliateProfile.findMany({
      where,
    });

    const conversions = await prisma.conversion.findMany({
      where: {
        affiliateId: { in: manager.assignedAffiliates },
      },
    });

    const payouts = await prisma.payout.findMany({
      where: {
        affiliateId: { in: manager.assignedAffiliates },
      },
    });

    const stats = {
      totalAffiliates: affiliates.length,
      activeAffiliates: affiliates.filter((a) => a.status === "ACTIVE").length,
      totalCommissions: conversions.reduce(
        (sum, c) => sum + c.commissionAmount,
        0
      ),
      totalPayouts: payouts.reduce((sum, p) => sum + p.amount, 0),
      averageAffiliateEarnings:
        affiliates.length > 0
          ? affiliates.reduce((sum, a) => sum + a.totalEarnings, 0) /
            affiliates.length
          : 0,
      conversionRate: 0,
      retentionRate: 0,
    };

    // Calculate conversion rate
    const totalClicks = affiliates.reduce((sum, a) => sum + a.totalClicks, 0);
    if (totalClicks > 0) {
      stats.conversionRate = (conversions.length / totalClicks) * 100;
    }

    // Calculate retention rate
    const activeAffiliates = affiliates.filter(
      (a) => a.status === "ACTIVE"
    ).length;
    if (affiliates.length > 0) {
      stats.retentionRate = (activeAffiliates / affiliates.length) * 100;
    }

    return stats;
  }

  static async getPerformanceReport(
    managerId: string,
    period: string
  ): Promise<ManagerPerformance> {
    const manager = await this.findById(managerId);
    if (!manager) {
      throw new Error("Manager not found");
    }

    const stats = await this.getManagerStats(managerId);

    return (await prisma.managerPerformance.create({
      data: {
        managerId,
        period,
        metrics: {
          affiliatesManaged: stats.totalAffiliates,
          newAffiliates: stats.totalAffiliates,
          activeAffiliates: stats.activeAffiliates,
          totalCommissions: stats.totalCommissions,
          totalPayouts: stats.totalPayouts,
          averageAffiliateEarnings: stats.averageAffiliateEarnings,
          conversionRate: stats.conversionRate,
          retentionRate: stats.retentionRate,
        },
      },
    })) as any;
  }

  static async getManagerDashboard(managerId: string): Promise<any> {
    const manager = await this.findById(managerId);
    if (!manager) {
      return null;
    }

    const stats = await this.getManagerStats(managerId);
    const recentActivities = await this.getActivities(managerId, 1, 10);
    const assignedAffiliates = await this.getAssignedAffiliates(
      managerId,
      1,
      5
    );
    const assignedOffers = await this.getAssignedOffers(managerId, 1, 5);

    return {
      manager,
      stats,
      recentActivities,
      assignedAffiliates,
      assignedOffers,
      permissions: manager.permissions,
    };
  }

  static async checkPermission(
    managerId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const manager = await this.findById(managerId);
    if (!manager) {
      return false;
    }

    const permissions = manager.permissions as any;
    return permissions[resource]?.[action] || false;
  }

  static async bulkAssignAffiliates(
    managerId: string,
    affiliateIds: string[]
  ): Promise<AffiliateManager> {
    const manager = await this.findById(managerId);
    if (!manager) {
      throw new Error("Manager not found");
    }

    const assignedAffiliates = [
      ...new Set([...manager.assignedAffiliates, ...affiliateIds]),
    ];
    return await this.update(managerId, { assignedAffiliates });
  }

  static async bulkUnassignAffiliates(
    managerId: string,
    affiliateIds: string[]
  ): Promise<AffiliateManager> {
    const manager = await this.findById(managerId);
    if (!manager) {
      throw new Error("Manager not found");
    }

    const assignedAffiliates = manager.assignedAffiliates.filter(
      (id) => !affiliateIds.includes(id)
    );
    return await this.update(managerId, { assignedAffiliates });
  }

  static async getManagerHierarchy(): Promise<any> {
    const managers = await prisma.affiliateManager.findMany({
      where: { status: "ACTIVE" },
      orderBy: { status: "asc" } as any,
    });

    const hierarchy: any = {};

    managers.forEach((manager) => {
      if (!hierarchy[(manager as any).role]) {
        hierarchy[(manager as any).role] = [];
      }
      hierarchy[(manager as any).role].push(manager);
    });

    return hierarchy;
  }

  static async getManagerReports(
    managerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const manager = await this.findById(managerId);
    if (!manager) {
      return null;
    }

    const where: any = { id: { in: manager.assignedAffiliates } };

    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const affiliates = await prisma.affiliateProfile.findMany({
      where,
      include: {
        user: true,
      },
    });

    const conversions = await prisma.conversion.findMany({
      where: {
        affiliateId: { in: manager.assignedAffiliates },
      },
    });

    const payouts = await prisma.payout.findMany({
      where: {
        affiliateId: { in: manager.assignedAffiliates },
      },
    });

    return {
      manager,
      affiliates,
      conversions,
      payouts,
      summary: {
        totalAffiliates: affiliates.length,
        totalConversions: conversions.length,
        totalPayouts: payouts.length,
        totalCommission: conversions.reduce(
          (sum, c) => sum + c.commissionAmount,
          0
        ),
        totalPayoutAmount: payouts.reduce((sum, p) => sum + p.amount, 0),
      },
    };
  }
}
