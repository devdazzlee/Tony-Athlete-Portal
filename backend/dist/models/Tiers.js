"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TiersModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class TiersModel {
    static async create(data) {
        return await prisma.tier.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                level: data.level,
                commissionRate: data.commissionRate || 0,
                requirements: data.requirements || {
                    minimumClicks: 0,
                    minimumConversions: 0,
                    minimumEarnings: 0,
                    minimumReferrals: 0,
                    timePeriod: 30,
                    otherRequirements: [],
                },
                benefits: data.benefits || {
                    commissionRate: 0,
                    bonusRate: 0,
                    prioritySupport: false,
                    customFeatures: [],
                    exclusiveOffers: false,
                    higherPayouts: false,
                    marketingMaterials: false,
                    dedicatedManager: false,
                },
                status: data.status || "ACTIVE",
            },
        });
    }
    static async findById(id) {
        return await prisma.tier.findUnique({
            where: { id },
        });
    }
    static async update(id, data) {
        return await prisma.tier.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
    }
    static async delete(id) {
        await prisma.tier.delete({
            where: { id },
        });
    }
    static async list(accountId, filters = {}) {
        const where = { accountId };
        if (filters.status)
            where.status = filters.status;
        if (filters.level)
            where.level = filters.level;
        return await prisma.tier.findMany({
            where,
            orderBy: { level: "asc" },
        });
    }
    static async assignTier(affiliateId, tierId, assignedBy, reason, expiresAt) {
        await prisma.tierAssignment.updateMany({
            where: {
                affiliateId,
                status: "ACTIVE",
            },
            data: { status: "INACTIVE" },
        });
        return (await prisma.tierAssignment.create({
            data: {
                affiliateId,
                tierId,
                assignedAt: new Date(),
                assignedBy,
                reason,
                status: "ACTIVE",
                expiresAt,
            },
        }));
    }
    static async getAffiliateTier(affiliateId) {
        const assignment = await prisma.tierAssignment.findFirst({
            where: {
                affiliateId,
                status: "ACTIVE",
            },
            include: {
                tier: true,
            },
        });
        return assignment?.tier || null;
    }
    static async calculateTierProgress(affiliateId, tierId) {
        const tier = await this.findById(tierId);
        if (!tier) {
            throw new Error("Tier not found");
        }
        const affiliate = await prisma.affiliateProfile.findUnique({
            where: { id: affiliateId },
        });
        if (!affiliate) {
            throw new Error("Affiliate not found");
        }
        const requirements = tier.requirements;
        const currentClicks = affiliate.totalClicks;
        const currentConversions = affiliate.totalConversions;
        const currentEarnings = affiliate.totalEarnings;
        const currentReferrals = 0;
        const clickProgress = Math.min((currentClicks / requirements.minimumClicks) * 100, 100);
        const conversionProgress = Math.min((currentConversions / requirements.minimumConversions) * 100, 100);
        const earningsProgress = Math.min((currentEarnings / requirements.minimumEarnings) * 100, 100);
        const referralProgress = Math.min((currentReferrals / requirements.minimumReferrals) * 100, 100);
        const progressPercentage = (clickProgress +
            conversionProgress +
            earningsProgress +
            referralProgress) /
            4;
        const nextTier = await prisma.tier.findFirst({
            where: {
                accountId: tier.accountId,
                level: { gt: tier.level },
                status: "ACTIVE",
            },
            orderBy: { level: "asc" },
        });
        return (await prisma.tierProgress.upsert({
            where: { affiliateId_tierId: { affiliateId, tierId } },
            update: {
                currentClicks,
                currentConversions,
                currentEarnings,
                currentReferrals,
                progressPercentage,
                nextTierId: nextTier?.id,
                lastUpdated: new Date(),
            },
            create: {
                affiliateId,
                tierId,
                currentClicks,
                currentConversions,
                currentEarnings,
                currentReferrals,
                progressPercentage,
                nextTierId: nextTier?.id,
                lastUpdated: new Date(),
            },
        }));
    }
    static async getAffiliateProgress(affiliateId) {
        return (await prisma.tierProgress.findMany({
            where: { affiliateId },
            include: {
                tier: true,
                nextTier: true,
            },
            orderBy: { lastUpdated: "desc" },
        }));
    }
    static async checkTierEligibility(affiliateId) {
        const affiliate = await prisma.affiliateProfile.findUnique({
            where: { id: affiliateId },
        });
        if (!affiliate) {
            return { eligible: false, reason: "Affiliate not found" };
        }
        const currentTier = await this.getAffiliateTier(affiliateId);
        const allTiers = await prisma.tier.findMany({
            where: {
                accountId: affiliate.userId,
                status: "ACTIVE",
            },
            orderBy: { level: "desc" },
        });
        for (const tier of allTiers) {
            if (currentTier && tier.level <= currentTier.level)
                continue;
            const requirements = tier.requirements;
            const meetsRequirements = affiliate.totalClicks >= requirements.minimumClicks &&
                affiliate.totalConversions >=
                    requirements.minimumConversions &&
                affiliate.totalEarnings >= requirements.minimumEarnings;
            if (meetsRequirements) {
                return { eligible: true, tier };
            }
        }
        return { eligible: false, reason: "Requirements not met" };
    }
    static async autoAssignTiers(accountId) {
        const affiliates = await prisma.affiliateProfile.findMany({
            where: {
                status: "ACTIVE",
            },
        });
        let assigned = 0;
        const errors = [];
        for (const affiliate of affiliates) {
            try {
                const eligibility = await this.checkTierEligibility(affiliate.id);
                if (eligibility.eligible && eligibility.tier) {
                    await this.assignTier(affiliate.id, eligibility.tier.id, "system", "Automatic tier assignment based on performance");
                    assigned++;
                }
            }
            catch (error) {
                errors.push(`Failed to assign tier for affiliate ${affiliate.id}: ${error.message}`);
            }
        }
        return { assigned, errors };
    }
    static async getTierStats(accountId) {
        const tiers = await this.list(accountId);
        const assignments = await prisma.tierAssignment.findMany({
            where: {
                tier: { accountId },
                status: "ACTIVE",
            },
            include: {
                tier: true,
                affiliate: true,
            },
        });
        const stats = {
            totalTiers: tiers.length,
            activeTiers: tiers.filter((t) => t.status === "ACTIVE").length,
            totalAssignments: assignments.length,
            byTier: {},
            averageProgress: 0,
            topPerformers: [],
        };
        tiers.forEach((tier) => {
            const tierAssignments = assignments.filter((a) => a.tierId === tier.id);
            stats.byTier[tier.id] = {
                name: tier.name,
                level: tier.level,
                assignments: tierAssignments.length,
                averageEarnings: tierAssignments.reduce((sum, a) => sum + (a.affiliate?.totalEarnings || 0), 0) / tierAssignments.length || 0,
            };
        });
        const progressRecords = await prisma.tierProgress.findMany({
            where: {
                tier: { accountId },
            },
        });
        if (progressRecords.length > 0) {
            stats.averageProgress =
                progressRecords.reduce((sum, p) => sum + p.progressPercentage, 0) /
                    progressRecords.length;
        }
        const topProgress = progressRecords
            .sort((a, b) => b.progressPercentage - a.progressPercentage)
            .slice(0, 10);
        stats.topPerformers = topProgress.map((progress) => ({
            affiliateId: progress.affiliateId,
            name: "Affiliate",
            progress: progress.progressPercentage,
        }));
        return stats;
    }
    static async createDefaultTiers(accountId) {
        const defaultTiers = [
            {
                name: "Bronze",
                description: "Entry level tier for new affiliates",
                level: 1,
                requirements: {
                    minimumClicks: 0,
                    minimumConversions: 0,
                    minimumEarnings: 0,
                    minimumReferrals: 0,
                    timePeriod: 30,
                    otherRequirements: [],
                },
                benefits: {
                    commissionRate: 5,
                    bonusRate: 0,
                    prioritySupport: false,
                    customFeatures: [],
                    exclusiveOffers: false,
                    higherPayouts: false,
                    marketingMaterials: true,
                    dedicatedManager: false,
                },
            },
            {
                name: "Silver",
                description: "Intermediate tier for active affiliates",
                level: 2,
                requirements: {
                    minimumClicks: 1000,
                    minimumConversions: 10,
                    minimumEarnings: 500,
                    minimumReferrals: 0,
                    timePeriod: 30,
                    otherRequirements: [],
                },
                benefits: {
                    commissionRate: 7,
                    bonusRate: 1,
                    prioritySupport: true,
                    customFeatures: ["Advanced reporting"],
                    exclusiveOffers: true,
                    higherPayouts: false,
                    marketingMaterials: true,
                    dedicatedManager: false,
                },
            },
            {
                name: "Gold",
                description: "Advanced tier for high-performing affiliates",
                level: 3,
                requirements: {
                    minimumClicks: 5000,
                    minimumConversions: 50,
                    minimumEarnings: 2500,
                    minimumReferrals: 0,
                    timePeriod: 30,
                    otherRequirements: [],
                },
                benefits: {
                    commissionRate: 10,
                    bonusRate: 2,
                    prioritySupport: true,
                    customFeatures: ["Advanced reporting", "Custom landing pages"],
                    exclusiveOffers: true,
                    higherPayouts: true,
                    marketingMaterials: true,
                    dedicatedManager: true,
                },
            },
            {
                name: "Platinum",
                description: "Elite tier for top-performing affiliates",
                level: 4,
                requirements: {
                    minimumClicks: 10000,
                    minimumConversions: 100,
                    minimumEarnings: 5000,
                    minimumReferrals: 0,
                    timePeriod: 30,
                    otherRequirements: [],
                },
                benefits: {
                    commissionRate: 15,
                    bonusRate: 5,
                    prioritySupport: true,
                    customFeatures: [
                        "Advanced reporting",
                        "Custom landing pages",
                        "API access",
                    ],
                    exclusiveOffers: true,
                    higherPayouts: true,
                    marketingMaterials: true,
                    dedicatedManager: true,
                },
            },
        ];
        const createdTiers = [];
        for (const tierData of defaultTiers) {
            const tier = await this.create({
                accountId,
                ...tierData,
            });
            createdTiers.push(tier);
        }
        return createdTiers;
    }
    static async getTierBenefits(affiliateId) {
        const currentTier = await this.getAffiliateTier(affiliateId);
        if (!currentTier) {
            return {
                tier: null,
                benefits: {
                    commissionRate: 0,
                    bonusRate: 0,
                    prioritySupport: false,
                    customFeatures: [],
                    exclusiveOffers: false,
                    higherPayouts: false,
                    marketingMaterials: false,
                    dedicatedManager: false,
                },
            };
        }
        return {
            tier: currentTier,
            benefits: currentTier.benefits,
        };
    }
    static async updateTierProgress(affiliateId) {
        const currentTier = await this.getAffiliateTier(affiliateId);
        if (currentTier) {
            await this.calculateTierProgress(affiliateId, currentTier.id);
        }
        const eligibility = await this.checkTierEligibility(affiliateId);
        if (eligibility.eligible && eligibility.tier) {
            await this.assignTier(affiliateId, eligibility.tier.id, "system", "Automatic tier upgrade based on performance");
        }
    }
    static async getTierLeaderboard(accountId, limit = 10) {
        const progressRecords = await prisma.tierProgress.findMany({
            where: {
                tier: { accountId },
            },
            include: {
                tier: true,
                affiliate: {
                    include: {
                        user: true,
                    },
                },
            },
            orderBy: { progressPercentage: "desc" },
            take: limit,
        });
        return progressRecords.map((progress) => ({
            affiliateId: progress.affiliateId,
            affiliateName: `${progress.affiliate?.user?.firstName} ${progress.affiliate?.user?.lastName}`,
            tierName: progress.tier.name,
            tierLevel: progress.tier.level,
            progress: progress.progressPercentage,
            currentEarnings: progress.currentEarnings,
            currentClicks: progress.currentClicks,
            currentConversions: progress.currentConversions,
        }));
    }
}
exports.TiersModel = TiersModel;
//# sourceMappingURL=Tiers.js.map