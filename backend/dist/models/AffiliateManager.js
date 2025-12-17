"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AffiliateManagerModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class AffiliateManagerModel {
    static async create(data) {
        return (await prisma.affiliateManager.create({
            data: {
                affiliateId: data.userId,
                managerId: data.userId,
                accountId: "default",
                status: data.status || "ACTIVE",
            },
        }));
    }
    static async findById(id) {
        return (await prisma.affiliateManager.findUnique({
            where: { id },
        }));
    }
    static async findByUserId(userId) {
        return (await prisma.affiliateManager.findUnique({
            where: { affiliateId: userId },
        }));
    }
    static async update(id, data) {
        return (await prisma.affiliateManager.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async delete(id) {
        await prisma.affiliateManager.delete({
            where: { id },
        });
    }
    static async list(filters = {}, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const where = {};
        if (filters.status)
            where.status = filters.status;
        if (filters.role)
            where.role = filters.role;
        if (filters.department)
            where.department = filters.department;
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
        }));
    }
    static async assignAffiliate(managerId, affiliateId) {
        const manager = await this.findById(managerId);
        if (!manager) {
            throw new Error("Manager not found");
        }
        const assignedAffiliates = [...manager.assignedAffiliates, affiliateId];
        return await this.update(managerId, { assignedAffiliates });
    }
    static async unassignAffiliate(managerId, affiliateId) {
        const manager = await this.findById(managerId);
        if (!manager) {
            throw new Error("Manager not found");
        }
        const assignedAffiliates = manager.assignedAffiliates.filter((id) => id !== affiliateId);
        return await this.update(managerId, { assignedAffiliates });
    }
    static async assignOffer(managerId, offerId) {
        const manager = await this.findById(managerId);
        if (!manager) {
            throw new Error("Manager not found");
        }
        const assignedOffers = [...manager.assignedOffers, offerId];
        return await this.update(managerId, { assignedOffers });
    }
    static async unassignOffer(managerId, offerId) {
        const manager = await this.findById(managerId);
        if (!manager) {
            throw new Error("Manager not found");
        }
        const assignedOffers = manager.assignedOffers.filter((id) => id !== offerId);
        return await this.update(managerId, { assignedOffers });
    }
    static async updatePermissions(managerId, permissions) {
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
    static async recordActivity(managerId, action, resource, resourceId, details, ipAddress, userAgent) {
        return (await prisma.managerActivity.create({
            data: {
                managerId,
                affiliateId: resourceId,
                type: action,
                description: resource,
                data: details,
            },
        }));
    }
    static async getActivities(managerId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        return (await prisma.managerActivity.findMany({
            where: { managerId },
            skip,
            take: limit,
            orderBy: { timestamp: "desc" },
        }));
    }
    static async getAssignedAffiliates(managerId, page = 1, limit = 20) {
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
    static async getAssignedOffers(managerId, page = 1, limit = 20) {
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
    static async getManagerStats(managerId, startDate, endDate) {
        const manager = await this.findById(managerId);
        if (!manager) {
            return null;
        }
        const where = { id: { in: manager.assignedAffiliates } };
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
            totalCommissions: conversions.reduce((sum, c) => sum + c.commissionAmount, 0),
            totalPayouts: payouts.reduce((sum, p) => sum + p.amount, 0),
            averageAffiliateEarnings: affiliates.length > 0
                ? affiliates.reduce((sum, a) => sum + a.totalEarnings, 0) /
                    affiliates.length
                : 0,
            conversionRate: 0,
            retentionRate: 0,
        };
        const totalClicks = affiliates.reduce((sum, a) => sum + a.totalClicks, 0);
        if (totalClicks > 0) {
            stats.conversionRate = (conversions.length / totalClicks) * 100;
        }
        const activeAffiliates = affiliates.filter((a) => a.status === "ACTIVE").length;
        if (affiliates.length > 0) {
            stats.retentionRate = (activeAffiliates / affiliates.length) * 100;
        }
        return stats;
    }
    static async getPerformanceReport(managerId, period) {
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
        }));
    }
    static async getManagerDashboard(managerId) {
        const manager = await this.findById(managerId);
        if (!manager) {
            return null;
        }
        const stats = await this.getManagerStats(managerId);
        const recentActivities = await this.getActivities(managerId, 1, 10);
        const assignedAffiliates = await this.getAssignedAffiliates(managerId, 1, 5);
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
    static async checkPermission(managerId, resource, action) {
        const manager = await this.findById(managerId);
        if (!manager) {
            return false;
        }
        const permissions = manager.permissions;
        return permissions[resource]?.[action] || false;
    }
    static async bulkAssignAffiliates(managerId, affiliateIds) {
        const manager = await this.findById(managerId);
        if (!manager) {
            throw new Error("Manager not found");
        }
        const assignedAffiliates = [
            ...new Set([...manager.assignedAffiliates, ...affiliateIds]),
        ];
        return await this.update(managerId, { assignedAffiliates });
    }
    static async bulkUnassignAffiliates(managerId, affiliateIds) {
        const manager = await this.findById(managerId);
        if (!manager) {
            throw new Error("Manager not found");
        }
        const assignedAffiliates = manager.assignedAffiliates.filter((id) => !affiliateIds.includes(id));
        return await this.update(managerId, { assignedAffiliates });
    }
    static async getManagerHierarchy() {
        const managers = await prisma.affiliateManager.findMany({
            where: { status: "ACTIVE" },
            orderBy: { status: "asc" },
        });
        const hierarchy = {};
        managers.forEach((manager) => {
            if (!hierarchy[manager.role]) {
                hierarchy[manager.role] = [];
            }
            hierarchy[manager.role].push(manager);
        });
        return hierarchy;
    }
    static async getManagerReports(managerId, startDate, endDate) {
        const manager = await this.findById(managerId);
        if (!manager) {
            return null;
        }
        const where = { id: { in: manager.assignedAffiliates } };
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
                totalCommission: conversions.reduce((sum, c) => sum + c.commissionAmount, 0),
                totalPayoutAmount: payouts.reduce((sum, p) => sum + p.amount, 0),
            },
        };
    }
}
exports.AffiliateManagerModel = AffiliateManagerModel;
//# sourceMappingURL=AffiliateManager.js.map