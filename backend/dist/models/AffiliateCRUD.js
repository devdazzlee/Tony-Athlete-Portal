"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AffiliateCRUDModel = void 0;
const prisma_1 = require("../lib/prisma");
const SystemSettingsService_1 = require("../services/SystemSettingsService");
class AffiliateCRUDModel {
    static async create(data) {
        const defaultCommissionRate = await SystemSettingsService_1.SystemSettingsService.getDefaultCommissionRate();
        const commissionRate = data.commissionRate ?? defaultCommissionRate;
        return await prisma_1.prisma.affiliateProfile.create({
            data: {
                userId: data.userId,
                companyName: data.companyName,
                website: data.website,
                socialMedia: data.socialMedia,
                paymentMethod: data.paymentMethod || 'BANK_TRANSFER',
                paymentEmail: data.paymentEmail,
                taxId: data.taxId,
                address: data.address,
                tier: data.tier || 'BRONZE',
                commissionRate,
                totalEarnings: data.totalEarnings || 0,
                totalClicks: data.totalClicks || 0,
                totalConversions: data.totalConversions || 0,
                conversionRate: data.conversionRate || 0,
                lastActivityAt: data.lastActivityAt || new Date()
            }
        });
    }
    static async findById(id) {
        return await prisma_1.prisma.affiliateProfile.findUnique({
            where: { id },
            include: {
                user: true
            }
        });
    }
    static async findByUserId(userId) {
        return await prisma_1.prisma.affiliateProfile.findUnique({
            where: { userId },
            include: {
                user: true
            }
        });
    }
    static async update(id, data) {
        const { id: _, userId, createdAt, updatedAt, ...updateData } = data;
        return await prisma_1.prisma.affiliateProfile.update({
            where: { id },
            data: updateData
        });
    }
    static async delete(id) {
        await prisma_1.prisma.affiliateProfile.delete({
            where: { id }
        });
    }
    static async list(filters = {}, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const where = {};
        if (filters.tier)
            where.tier = filters.tier;
        if (filters.search) {
            where.OR = [
                { companyName: { contains: filters.search } },
                { website: { contains: filters.search } },
                { user: { firstName: { contains: filters.search } } },
                { user: { lastName: { contains: filters.search } } },
                { user: { email: { contains: filters.search } } }
            ];
        }
        if (filters.minEarnings)
            where.totalEarnings = { gte: filters.minEarnings };
        if (filters.maxEarnings)
            where.totalEarnings = { lte: filters.maxEarnings };
        if (filters.startDate && filters.endDate) {
            where.createdAt = {
                gte: filters.startDate,
                lte: filters.endDate
            };
        }
        return await prisma_1.prisma.affiliateProfile.findMany({
            where,
            include: {
                user: true
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        });
    }
    static async approve(id, approvedBy, notes) {
        const affiliate = await this.findById(id);
        if (!affiliate) {
            throw new Error('Affiliate not found');
        }
        const updatedAffiliate = await this.update(id, {
            lastActivityAt: new Date()
        });
        await this.logActivity(id, 'STATUS_CHANGE', 'Affiliate approved', {
            approvedBy,
            notes
        }, '127.0.0.1', 'System');
        return updatedAffiliate;
    }
    static async reject(id, rejectedBy, reason) {
        const affiliate = await this.findById(id);
        if (!affiliate) {
            throw new Error('Affiliate not found');
        }
        const updatedAffiliate = await this.update(id, {
            lastActivityAt: new Date()
        });
        await this.logActivity(id, 'STATUS_CHANGE', 'Affiliate rejected', {
            rejectedBy,
            reason
        }, '127.0.0.1', 'System');
        return updatedAffiliate;
    }
    static async suspend(id, suspendedBy, reason) {
        const affiliate = await this.findById(id);
        if (!affiliate) {
            throw new Error('Affiliate not found');
        }
        const updatedAffiliate = await this.update(id, {
            lastActivityAt: new Date()
        });
        await this.logActivity(id, 'STATUS_CHANGE', 'Affiliate suspended', {
            suspendedBy,
            reason
        }, '127.0.0.1', 'System');
        return updatedAffiliate;
    }
    static async activate(id, activatedBy) {
        const affiliate = await this.findById(id);
        if (!affiliate) {
            throw new Error('Affiliate not found');
        }
        const updatedAffiliate = await this.update(id, {
            lastActivityAt: new Date()
        });
        await this.logActivity(id, 'STATUS_CHANGE', 'Affiliate activated', {
            activatedBy
        }, '127.0.0.1', 'System');
        return updatedAffiliate;
    }
    static async updateTier(id, newTier, updatedBy) {
        const affiliate = await this.findById(id);
        if (!affiliate) {
            throw new Error('Affiliate not found');
        }
        const updatedAffiliate = await this.update(id, {
            tier: newTier
        });
        await this.logActivity(id, 'PROFILE_UPDATE', 'Tier updated', {
            previousTier: affiliate.tier,
            newTier,
            updatedBy
        }, '127.0.0.1', 'System');
        return updatedAffiliate;
    }
    static async updateKYCStatus(id, verified, verifiedBy, notes) {
        const affiliate = await this.findById(id);
        if (!affiliate) {
            throw new Error('Affiliate not found');
        }
        const updatedAffiliate = await this.update(id, {
            lastActivityAt: new Date()
        });
        await this.logActivity(id, 'PROFILE_UPDATE', 'KYC status updated', {
            verifiedBy,
            notes
        }, '127.0.0.1', 'System');
        return updatedAffiliate;
    }
    static async addTag(id, tag) {
        const affiliate = await this.findById(id);
        if (!affiliate) {
            throw new Error('Affiliate not found');
        }
        return await this.update(id, { lastActivityAt: new Date() });
    }
    static async removeTag(id, tag) {
        const affiliate = await this.findById(id);
        if (!affiliate) {
            throw new Error('Affiliate not found');
        }
        return await this.update(id, { lastActivityAt: new Date() });
    }
    static async updateCustomField(id, field, value) {
        const affiliate = await this.findById(id);
        if (!affiliate) {
            throw new Error('Affiliate not found');
        }
        return await this.update(id, { lastActivityAt: new Date() });
    }
    static async logActivity(affiliateId, type, description, data, ipAddress, userAgent) {
        return {
            id: 'mock-activity-id',
            affiliateId,
            type: type,
            description,
            data,
            ipAddress,
            userAgent,
            timestamp: new Date()
        };
    }
    static async getActivities(affiliateId, page = 1, limit = 50) {
        return [];
    }
    static async uploadDocument(affiliateId, type, name, url, size, mimeType) {
        return {
            id: 'mock-document-id',
            affiliateId,
            type: type,
            name,
            url,
            size,
            mimeType,
            status: 'PENDING',
            uploadedAt: new Date()
        };
    }
    static async findDocumentById(id) {
        return null;
    }
    static async listDocuments(affiliateId, filters = {}) {
        return [];
    }
    static async updateDocumentStatus(id, status, reviewedBy, notes) {
        return {
            id,
            affiliateId: 'mock-affiliate',
            type: 'KYC',
            name: 'Mock Document',
            url: 'mock-url',
            size: 0,
            mimeType: 'application/pdf',
            status: status,
            uploadedAt: new Date(),
            reviewedAt: new Date(),
            reviewedBy,
            notes
        };
    }
    static async deleteDocument(id) {
    }
    static async getAffiliateStats(affiliateId, startDate, endDate) {
        const clicks = await prisma_1.prisma.click.findMany({
            where: { affiliateId }
        });
        const conversions = await prisma_1.prisma.conversion.findMany({
            where: { affiliateId }
        });
        const payouts = await prisma_1.prisma.payout.findMany({
            where: { affiliateId }
        });
        const stats = {
            totalClicks: clicks.length,
            totalConversions: conversions.length,
            totalPayouts: payouts.length,
            totalEarnings: conversions.reduce((sum, c) => sum + c.commissionAmount, 0),
            totalPayoutAmount: payouts.reduce((sum, p) => sum + p.amount, 0),
            conversionRate: clicks.length > 0 ? (conversions.length / clicks.length) * 100 : 0,
            averageOrderValue: conversions.length > 0 ? conversions.reduce((sum, c) => sum + c.customerValue, 0) / conversions.length : 0,
            byMonth: {},
            byOffer: {},
            byCountry: {},
            byDevice: {}
        };
        conversions.forEach(conversion => {
            const month = conversion.createdAt.toISOString().substr(0, 7);
            if (!stats.byMonth[month]) {
                stats.byMonth[month] = { clicks: 0, conversions: 0, earnings: 0 };
            }
            stats.byMonth[month].conversions++;
            stats.byMonth[month].earnings += conversion.commissionAmount;
        });
        clicks.forEach(click => {
            const month = click.createdAt.toISOString().substr(0, 7);
            if (!stats.byMonth[month]) {
                stats.byMonth[month] = { clicks: 0, conversions: 0, earnings: 0 };
            }
            stats.byMonth[month].clicks++;
        });
        conversions.forEach(conversion => {
            if (!stats.byOffer[conversion.offerId]) {
                stats.byOffer[conversion.offerId] = { conversions: 0, earnings: 0 };
            }
            stats.byOffer[conversion.offerId].conversions++;
            stats.byOffer[conversion.offerId].earnings += conversion.commissionAmount;
        });
        clicks.forEach(click => {
            if (click.country) {
                if (!stats.byCountry[click.country]) {
                    stats.byCountry[click.country] = { clicks: 0, conversions: 0 };
                }
                stats.byCountry[click.country].clicks++;
            }
        });
        clicks.forEach(click => {
            if (click.device) {
                if (!stats.byDevice[click.device]) {
                    stats.byDevice[click.device] = { clicks: 0, conversions: 0 };
                }
                stats.byDevice[click.device].clicks++;
            }
        });
        return stats;
    }
    static async getAffiliateDashboard(affiliateId) {
        const affiliate = await this.findById(affiliateId);
        if (!affiliate) {
            return null;
        }
        const stats = await this.getAffiliateStats(affiliateId);
        const recentActivities = await this.getActivities(affiliateId, 1, 10);
        const documents = await this.listDocuments(affiliateId);
        return {
            affiliate,
            stats,
            recentActivities,
            documents
        };
    }
    static async bulkUpdateStatus(affiliateIds, status, updatedBy, reason) {
        const updatedAffiliates = [];
        for (const id of affiliateIds) {
            const affiliate = await this.findById(id);
            if (affiliate) {
                const updatedAffiliate = await this.update(id, { lastActivityAt: new Date() });
                updatedAffiliates.push(updatedAffiliate);
                await this.logActivity(id, 'STATUS_CHANGE', `Bulk status update to ${status}`, {
                    updatedBy,
                    reason
                }, '127.0.0.1', 'System');
            }
        }
        return updatedAffiliates;
    }
    static async bulkUpdateTier(affiliateIds, tier, updatedBy) {
        const updatedAffiliates = [];
        for (const id of affiliateIds) {
            const affiliate = await this.findById(id);
            if (affiliate) {
                const updatedAffiliate = await this.update(id, { tier: tier });
                updatedAffiliates.push(updatedAffiliate);
                await this.logActivity(id, 'PROFILE_UPDATE', `Bulk tier update to ${tier}`, {
                    previousTier: affiliate.tier,
                    newTier: tier,
                    updatedBy
                }, '127.0.0.1', 'System');
            }
        }
        return updatedAffiliates;
    }
    static async exportAffiliateData(affiliateId) {
        const affiliate = await this.findById(affiliateId);
        if (!affiliate) {
            return null;
        }
        const stats = await this.getAffiliateStats(affiliateId);
        const activities = await this.getActivities(affiliateId, 1, 1000);
        const documents = await this.listDocuments(affiliateId);
        return {
            affiliate,
            stats,
            activities,
            documents,
            exportedAt: new Date().toISOString()
        };
    }
    static async getAffiliateLeaderboard(filters = {}, limit = 10) {
        const where = {};
        if (filters.tier)
            where.tier = filters.tier;
        if (filters.startDate && filters.endDate) {
            where.createdAt = {
                gte: filters.startDate,
                lte: filters.endDate
            };
        }
        const affiliates = await prisma_1.prisma.affiliateProfile.findMany({
            where,
            include: {
                user: true
            },
            orderBy: { totalEarnings: 'desc' },
            take: limit
        });
        return affiliates.map(affiliate => ({
            id: affiliate.id,
            name: `${affiliate.user.firstName} ${affiliate.user.lastName}`,
            companyName: affiliate.companyName,
            tier: affiliate.tier,
            totalEarnings: affiliate.totalEarnings,
            totalClicks: affiliate.totalClicks,
            totalConversions: affiliate.totalConversions,
            conversionRate: affiliate.conversionRate
        }));
    }
    static async getAffiliateSummary() {
        const totalAffiliates = await prisma_1.prisma.affiliateProfile.count();
        const totalEarnings = await prisma_1.prisma.affiliateProfile.aggregate({
            _sum: { totalEarnings: true }
        });
        const totalClicks = await prisma_1.prisma.affiliateProfile.aggregate({
            _sum: { totalClicks: true }
        });
        const totalConversions = await prisma_1.prisma.affiliateProfile.aggregate({
            _sum: { totalConversions: true }
        });
        return {
            totalAffiliates,
            activeAffiliates: totalAffiliates,
            pendingAffiliates: 0,
            suspendedAffiliates: 0,
            totalEarnings: totalEarnings._sum.totalEarnings || 0,
            totalClicks: totalClicks._sum.totalClicks || 0,
            totalConversions: totalConversions._sum.totalConversions || 0,
            averageEarnings: totalAffiliates > 0 ? (totalEarnings._sum.totalEarnings || 0) / totalAffiliates : 0
        };
    }
}
exports.AffiliateCRUDModel = AffiliateCRUDModel;
//# sourceMappingURL=AffiliateCRUD.js.map