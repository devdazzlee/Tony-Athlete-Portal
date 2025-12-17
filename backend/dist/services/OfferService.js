"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfferService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class OfferService {
    async getAllOffers(params) {
        const { page, limit, search, status } = params;
        const skip = (page - 1) * limit;
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { description: { contains: search } },
            ];
        }
        if (status) {
            where.status = status;
        }
        const [offers, total] = await Promise.all([
            prisma.offer.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),
            prisma.offer.count({ where }),
        ]);
        return {
            offers,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    async getOfferById(id) {
        const offer = await prisma.offer.findUnique({
            where: { id },
            include: {
                creatives: true,
                applications: {
                    include: {
                        affiliate: {
                            include: {
                                user: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                        email: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!offer) {
            throw new Error("Offer not found");
        }
        return offer;
    }
    async createOffer(data, accountId) {
        const offer = await prisma.offer.create({
            data: {
                accountId,
                name: data.name,
                description: data.description,
                commissionRate: data.commissionRate,
                startDate: new Date(data.startDate),
                endDate: data.endDate ? new Date(data.endDate) : null,
            },
        });
        return offer;
    }
    async updateOffer(id, data) {
        const offer = await prisma.offer.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                commissionRate: data.commissionRate,
                startDate: data.startDate ? new Date(data.startDate) : undefined,
                endDate: data.endDate ? new Date(data.endDate) : undefined,
                status: data.status,
            },
        });
        return offer;
    }
    async deleteOffer(id) {
        await prisma.offer.delete({
            where: { id },
        });
    }
    async getOfferApplications(offerId, params) {
        const { page, limit, status } = params;
        const skip = (page - 1) * limit;
        const where = { offerId };
        if (status) {
            where.status = status;
        }
        const [applications, total] = await Promise.all([
            prisma.offerApplication.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    affiliate: {
                        include: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                },
                            },
                        },
                    },
                },
            }),
            prisma.offerApplication.count({ where }),
        ]);
        return {
            applications,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    async applyForOffer(offerId, userId, data) {
        const affiliate = await prisma.affiliateProfile.findUnique({
            where: { userId },
        });
        if (!affiliate) {
            throw new Error("Affiliate profile not found");
        }
        const application = await prisma.offerApplication.create({
            data: {
                offerId,
                affiliateId: affiliate.id,
                message: data.message,
            },
        });
        return application;
    }
    async updateApplication(applicationId, data) {
        const application = await prisma.offerApplication.update({
            where: { id: applicationId },
            data: {
                status: data.status,
                message: data.message,
            },
        });
        return application;
    }
    async deleteApplication(applicationId) {
        await prisma.offerApplication.delete({
            where: { id: applicationId },
        });
    }
    async getOfferCreatives(offerId, params) {
        const { page, limit, type } = params;
        const skip = (page - 1) * limit;
        const where = { offerId };
        if (type) {
            where.type = type;
        }
        const [creatives, total] = await Promise.all([
            prisma.creative.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),
            prisma.creative.count({ where }),
        ]);
        return {
            creatives,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    async createCreative(offerId, data) {
        const creative = await prisma.creative.create({
            data: {
                offerId,
                name: data.name,
                type: data.type,
                size: data.size,
                format: data.format,
                url: data.url,
                downloadUrl: data.downloadUrl,
            },
        });
        return creative;
    }
    async updateCreative(creativeId, data) {
        const creative = await prisma.creative.update({
            where: { id: creativeId },
            data: {
                name: data.name,
                type: data.type,
                size: data.size,
                format: data.format,
                url: data.url,
                downloadUrl: data.downloadUrl,
            },
        });
        return creative;
    }
    async deleteCreative(creativeId) {
        await prisma.creative.delete({
            where: { id: creativeId },
        });
    }
    async getOfferAnalytics(offerId, params) {
        return {
            totalClicks: 2500,
            totalConversions: 85,
            totalRevenue: 4250.0,
            conversionRate: 3.4,
            topAffiliates: [
                { name: "John Doe", conversions: 25, earnings: 750.0 },
                { name: "Jane Smith", conversions: 20, earnings: 600.0 },
                { name: "Mike Johnson", conversions: 15, earnings: 450.0 },
            ],
        };
    }
    async getOfferClicks(offerId, params) {
        return {
            totalClicks: 2500,
            clicksByDay: [
                { date: "2024-01-01", clicks: 120 },
                { date: "2024-01-02", clicks: 135 },
                { date: "2024-01-03", clicks: 110 },
            ],
            clicksByCountry: [
                { country: "USA", clicks: 1000 },
                { country: "Canada", clicks: 500 },
                { country: "UK", clicks: 300 },
            ],
        };
    }
    async getOfferConversions(offerId, params) {
        return {
            totalConversions: 85,
            conversionsByDay: [
                { date: "2024-01-01", conversions: 4 },
                { date: "2024-01-02", conversions: 5 },
                { date: "2024-01-03", conversions: 3 },
            ],
            conversionsByAffiliate: [
                { affiliate: "John Doe", conversions: 25 },
                { affiliate: "Jane Smith", conversions: 20 },
                { affiliate: "Mike Johnson", conversions: 15 },
            ],
        };
    }
}
exports.OfferService = OfferService;
//# sourceMappingURL=OfferService.js.map