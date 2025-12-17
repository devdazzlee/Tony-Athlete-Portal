"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AffiliateService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class AffiliateService {
    async getAllAffiliates(params) {
        const { page, limit, search, status, tier, sortBy = 'createdAt', sortOrder = 'desc' } = params;
        const skip = (page - 1) * limit;
        const where = {};
        if (search) {
            where.OR = [
                { user: { firstName: { contains: search } } },
                { user: { lastName: { contains: search } } },
                { user: { email: { contains: search } } }
            ];
        }
        if (status) {
            where.user = { ...where.user, status };
        }
        if (tier) {
            where.tier = tier;
        }
        const [affiliates, total] = await Promise.all([
            prisma.affiliateProfile.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            status: true,
                            createdAt: true
                        }
                    }
                },
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder }
            }),
            prisma.affiliateProfile.count({ where })
        ]);
        return {
            affiliates,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
    async getAffiliateById(id) {
        const affiliate = await prisma.affiliateProfile.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        status: true,
                        createdAt: true
                    }
                }
            }
        });
        if (!affiliate) {
            throw new Error('Affiliate not found');
        }
        return affiliate;
    }
    async createAffiliate(data) {
        return {
            id: 'affiliate_' + Date.now(),
            ...data,
            createdAt: new Date()
        };
    }
    async updateAffiliate(id, data) {
        const affiliate = await prisma.affiliateProfile.update({
            where: { id },
            data: {
                companyName: data.companyName,
                website: data.website,
                paymentMethod: data.paymentMethod,
                paymentEmail: data.paymentEmail,
                tier: data.tier,
                commissionRate: data.commissionRate
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        status: true
                    }
                }
            }
        });
        return affiliate;
    }
    async deleteAffiliate(id) {
        await prisma.affiliateProfile.delete({
            where: { id }
        });
    }
    async getMyProfile(userId) {
        const affiliate = await prisma.affiliateProfile.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        status: true
                    }
                }
            }
        });
        if (!affiliate) {
            throw new Error('Affiliate profile not found');
        }
        return affiliate;
    }
    async updateMyProfile(userId, data) {
        const affiliate = await prisma.affiliateProfile.update({
            where: { userId },
            data: {
                companyName: data.companyName,
                website: data.website,
                paymentMethod: data.paymentMethod,
                paymentEmail: data.paymentEmail,
                tier: data.tier,
                commissionRate: data.commissionRate
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        status: true
                    }
                }
            }
        });
        return affiliate;
    }
    async getAffiliateLinks(affiliateId, params) {
        const { page, limit, search, status } = params;
        const skip = (page - 1) * limit;
        const where = { affiliateId };
        if (search) {
            where.OR = [
                { originalUrl: { contains: search } },
                { shortUrl: { contains: search } }
            ];
        }
        if (status) {
            where.isActive = status === 'active';
        }
        const [links, total] = await Promise.all([
            prisma.affiliateLink.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.affiliateLink.count({ where })
        ]);
        return {
            links,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
    async createAffiliateLink(affiliateId, data) {
        const shortUrl = `${process.env.CDN_BASE_URL}/${Date.now()}`;
        const link = await prisma.affiliateLink.create({
            data: {
                affiliateId,
                offerId: data.offerId,
                originalUrl: data.originalUrl,
                shortUrl,
                customSlug: data.customSlug,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
            }
        });
        return link;
    }
    async updateAffiliateLink(linkId, data) {
        const link = await prisma.affiliateLink.update({
            where: { id: linkId },
            data: {
                originalUrl: data.originalUrl,
                customSlug: data.customSlug,
                isActive: data.isActive,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
            }
        });
        return link;
    }
    async deleteAffiliateLink(linkId) {
        await prisma.affiliateLink.delete({
            where: { id: linkId }
        });
    }
    async getCommissions(affiliateId, params) {
        const { page, limit, status, startDate, endDate } = params;
        const skip = (page - 1) * limit;
        const where = { affiliateId };
        if (status) {
            where.status = status;
        }
        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        const [commissions, total] = await Promise.all([
            prisma.commission.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    conversion: {
                        include: {
                            offer: true
                        }
                    }
                }
            }),
            prisma.commission.count({ where })
        ]);
        return {
            commissions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
    async getPayouts(affiliateId, params) {
        const { page, limit, status, startDate, endDate } = params;
        const skip = (page - 1) * limit;
        const where = { affiliateId };
        if (status) {
            where.status = status;
        }
        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        const [payouts, total] = await Promise.all([
            prisma.payout.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    commissions: true
                }
            }),
            prisma.payout.count({ where })
        ]);
        return {
            payouts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
    async requestPayout(affiliateId, data) {
        const payout = await prisma.payout.create({
            data: {
                affiliateId,
                amount: data.amount,
                method: data.method,
                status: 'PENDING'
            }
        });
        return payout;
    }
    async getAnalytics(affiliateId, params) {
        return {
            totalClicks: 1250,
            totalConversions: 45,
            totalEarnings: 1250.50,
            conversionRate: 3.6,
            topOffers: [
                { name: 'Premium Software', conversions: 20, earnings: 600.00 },
                { name: 'E-commerce Products', conversions: 15, earnings: 450.00 },
                { name: 'Digital Services', conversions: 10, earnings: 200.50 }
            ]
        };
    }
    async getClicksAnalytics(affiliateId, params) {
        return {
            totalClicks: 1250,
            clicksByDay: [
                { date: '2024-01-01', clicks: 45 },
                { date: '2024-01-02', clicks: 52 },
                { date: '2024-01-03', clicks: 38 }
            ],
            clicksByCountry: [
                { country: 'USA', clicks: 450 },
                { country: 'Canada', clicks: 200 },
                { country: 'UK', clicks: 150 }
            ]
        };
    }
    async getConversionsAnalytics(affiliateId, params) {
        return {
            totalConversions: 45,
            conversionsByDay: [
                { date: '2024-01-01', conversions: 2 },
                { date: '2024-01-02', conversions: 3 },
                { date: '2024-01-03', conversions: 1 }
            ],
            conversionsByOffer: [
                { offer: 'Premium Software', conversions: 20 },
                { offer: 'E-commerce Products', conversions: 15 },
                { offer: 'Digital Services', conversions: 10 }
            ]
        };
    }
}
exports.AffiliateService = AffiliateService;
//# sourceMappingURL=AffiliateService.js.map