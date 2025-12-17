"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const crypto = __importStar(require("crypto"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get('/', async (req, res) => {
    try {
        const { affiliateId, page = 1, limit = 20, search } = req.query;
        const filters = {};
        if (affiliateId) {
            filters.affiliateId = affiliateId;
        }
        if (search) {
            filters.OR = [
                { originalUrl: { contains: search, mode: 'insensitive' } },
                { customAlias: { contains: search, mode: 'insensitive' } },
                { offer: { title: { contains: search, mode: 'insensitive' } } }
            ];
        }
        const links = await prisma.affiliateLink.findMany({
            where: filters,
            include: {
                offer: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        status: true
                    }
                },
                affiliate: {
                    select: {
                        id: true,
                        companyName: true
                    }
                },
                clickRecords: {
                    select: {
                        id: true,
                        createdAt: true,
                        ipAddress: true,
                        country: true,
                        device: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 5
                },
                _count: {
                    select: {
                        clickRecords: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit)
        });
        const total = await prisma.affiliateLink.count({ where: filters });
        const linksWithMetrics = await Promise.all(links.map(async (link) => {
            const conversions = await prisma.conversion.count({
                where: { affiliateId: link.affiliateId }
            });
            const revenue = await prisma.conversion.aggregate({
                where: { affiliateId: link.affiliateId },
                _sum: { customerValue: true }
            });
            const conversionRate = link._count.clickRecords > 0
                ? ((conversions / link._count.clickRecords) * 100).toFixed(2)
                : '0.00';
            return {
                ...link,
                metrics: {
                    clicks: link._count.clickRecords,
                    conversions,
                    conversionRate: `${conversionRate}%`,
                    revenue: revenue._sum.customerValue || 0
                }
            };
        }));
        res.json({
            links: linksWithMetrics,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error fetching affiliate links:', error);
        res.status(500).json({ error: 'Failed to fetch affiliate links' });
    }
});
router.post('/', async (req, res) => {
    try {
        const linkSchema = zod_1.z.object({
            affiliateId: zod_1.z.string(),
            offerId: zod_1.z.string(),
            originalUrl: zod_1.z.string().url(),
            customAlias: zod_1.z.string().optional(),
            landingPageUrl: zod_1.z.string().url().optional(),
            expiresAt: zod_1.z.string().optional()
        });
        const data = linkSchema.parse(req.body);
        const trackingCode = crypto.randomBytes(8).toString('hex');
        if (data.customAlias) {
            const existingLink = await prisma.affiliateLink.findFirst({
                where: { customSlug: data.customAlias }
            });
            if (existingLink) {
                return res.status(400).json({ error: 'Custom alias already exists' });
            }
        }
        const affiliateLink = await prisma.affiliateLink.create({
            data: {
                affiliateId: data.affiliateId,
                offerId: data.offerId,
                originalUrl: data.originalUrl,
                shortUrl: `track/${trackingCode}`,
                customSlug: data.customAlias,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
                isActive: true
            },
            include: {
                offer: {
                    select: {
                        name: true,
                        description: true
                    }
                },
                affiliate: {
                    select: {
                        id: true,
                        companyName: true
                    }
                }
            }
        });
        const baseUrl = process.env.FRONTEND_URL || 'https://trackdesk.com';
        const affiliateUrl = data.customAlias
            ? `${baseUrl}/go/${data.customAlias}`
            : `${baseUrl}/track/${trackingCode}`;
        res.status(201).json({
            ...affiliateLink,
            affiliateUrl
        });
    }
    catch (error) {
        console.error('Error generating affiliate link:', error);
        res.status(400).json({ error: 'Failed to generate affiliate link' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const link = await prisma.affiliateLink.findUnique({
            where: { id },
            include: {
                offer: {
                    select: {
                        name: true,
                        description: true,
                        status: true
                    }
                },
                affiliate: {
                    select: {
                        id: true,
                        companyName: true
                    }
                },
                clickRecords: {
                    select: {
                        id: true,
                        createdAt: true,
                        ipAddress: true,
                        country: true,
                        city: true,
                        device: true,
                        browser: true,
                        referrer: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 50
                },
            }
        });
        if (!link) {
            return res.status(404).json({ error: 'Affiliate link not found' });
        }
        const totalClicks = link.clicks;
        const totalConversions = link.conversions;
        const totalRevenue = link.earnings;
        const totalCommissions = link.earnings;
        const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : '0.00';
        const countryStats = {};
        const deviceStats = {};
        const baseUrl = process.env.FRONTEND_URL || 'https://trackdesk.com';
        const affiliateUrl = link.customSlug
            ? `${baseUrl}/go/${link.customSlug}`
            : `${baseUrl}/track/${link.id}`;
        res.json({
            ...link,
            affiliateUrl,
            metrics: {
                totalClicks,
                totalConversions,
                totalRevenue,
                totalCommissions,
                conversionRate: `${conversionRate}%`,
                countryStats,
                deviceStats
            }
        });
    }
    catch (error) {
        console.error('Error fetching affiliate link:', error);
        res.status(500).json({ error: 'Failed to fetch affiliate link' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateSchema = zod_1.z.object({
            customAlias: zod_1.z.string().optional(),
            landingPageUrl: zod_1.z.string().url().optional(),
            isActive: zod_1.z.boolean().optional(),
            expiresAt: zod_1.z.string().optional()
        });
        const data = updateSchema.parse(req.body);
        if (data.customAlias) {
            const existingLink = await prisma.affiliateLink.findFirst({
                where: {
                    customSlug: data.customAlias,
                    NOT: { id }
                }
            });
            if (existingLink) {
                return res.status(400).json({ error: 'Custom alias already exists' });
            }
        }
        const updatedLink = await prisma.affiliateLink.update({
            where: { id },
            data: {
                customSlug: data.customAlias,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
                isActive: data.isActive
            },
            include: {
                offer: {
                    select: {
                        name: true,
                        description: true
                    }
                },
                affiliate: {
                    select: {
                        id: true,
                        companyName: true
                    }
                }
            }
        });
        const baseUrl = process.env.FRONTEND_URL || 'https://trackdesk.com';
        const affiliateUrl = updatedLink.customSlug
            ? `${baseUrl}/go/${updatedLink.customSlug}`
            : `${baseUrl}/track/${updatedLink.id}`;
        res.json({
            ...updatedLink,
            affiliateUrl
        });
    }
    catch (error) {
        console.error('Error updating affiliate link:', error);
        res.status(400).json({ error: 'Failed to update affiliate link' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.affiliateLink.delete({
            where: { id }
        });
        res.json({ message: 'Affiliate link deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting affiliate link:', error);
        res.status(500).json({ error: 'Failed to delete affiliate link' });
    }
});
router.get('/:id/analytics', async (req, res) => {
    try {
        const { id } = req.params;
        const { period = '30d' } = req.query;
        let startDate = new Date();
        switch (period) {
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(startDate.getDate() - 90);
                break;
            default:
                startDate.setDate(startDate.getDate() - 30);
        }
        const dailyClicks = await prisma.$queryRaw `
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as clicks
      FROM "Click"
      WHERE "affiliateLinkId" = ${id}
        AND timestamp >= ${startDate}
      GROUP BY DATE(timestamp)
      ORDER BY date
    `;
        const dailyConversions = await prisma.$queryRaw `
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as conversions,
        SUM(amount) as revenue
      FROM "Conversion"
      WHERE "affiliateLinkId" = ${id}
        AND timestamp >= ${startDate}
      GROUP BY DATE(timestamp)
      ORDER BY date
    `;
        res.json({
            dailyClicks,
            dailyConversions
        });
    }
    catch (error) {
        console.error('Error fetching link analytics:', error);
        res.status(500).json({ error: 'Failed to fetch link analytics' });
    }
});
exports.default = router;
//# sourceMappingURL=affiliate-links.js.map