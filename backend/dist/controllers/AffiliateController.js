"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AffiliateController = void 0;
const AffiliateService_1 = require("../services/AffiliateService");
const zod_1 = require("zod");
const affiliateService = new AffiliateService_1.AffiliateService();
const createAffiliateSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    companyName: zod_1.z.string().optional(),
    website: zod_1.z.string().url().optional(),
    paymentMethod: zod_1.z.enum(['PAYPAL', 'STRIPE', 'BANK_TRANSFER', 'CRYPTO', 'WISE']).optional(),
    paymentEmail: zod_1.z.string().email().optional(),
    tier: zod_1.z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).optional()
});
const updateAffiliateSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).optional(),
    lastName: zod_1.z.string().min(1).optional(),
    companyName: zod_1.z.string().optional(),
    website: zod_1.z.string().url().optional(),
    paymentMethod: zod_1.z.enum(['PAYPAL', 'STRIPE', 'BANK_TRANSFER', 'CRYPTO', 'WISE']).optional(),
    paymentEmail: zod_1.z.string().email().optional(),
    tier: zod_1.z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).optional(),
    commissionRate: zod_1.z.number().min(0).max(100).optional(),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING']).optional()
});
const createLinkSchema = zod_1.z.object({
    originalUrl: zod_1.z.string().url(),
    offerId: zod_1.z.string().optional(),
    customSlug: zod_1.z.string().optional(),
    expiresAt: zod_1.z.string().datetime().optional()
});
const updateLinkSchema = zod_1.z.object({
    originalUrl: zod_1.z.string().url().optional(),
    customSlug: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
    expiresAt: zod_1.z.string().datetime().optional()
});
const requestPayoutSchema = zod_1.z.object({
    amount: zod_1.z.number().min(1),
    method: zod_1.z.enum(['PAYPAL', 'STRIPE', 'BANK_TRANSFER', 'CRYPTO', 'WISE']),
    notes: zod_1.z.string().optional()
});
class AffiliateController {
    async getAllAffiliates(req, res) {
        try {
            const { page = 1, limit = 10, search, status, tier, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
            const affiliates = await affiliateService.getAllAffiliates({
                page: parseInt(page),
                limit: parseInt(limit),
                search: search,
                status: status,
                tier: tier,
                sortBy: sortBy,
                sortOrder: sortOrder
            });
            res.json(affiliates);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getAffiliateById(req, res) {
        try {
            const { id } = req.params;
            const affiliate = await affiliateService.getAffiliateById(id);
            res.json(affiliate);
        }
        catch (error) {
            res.status(404).json({ error: error.message });
        }
    }
    async createAffiliate(req, res) {
        try {
            const data = createAffiliateSchema.parse(req.body);
            const affiliate = await affiliateService.createAffiliate(data);
            res.status(201).json(affiliate);
        }
        catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Invalid input data', details: error.errors });
            }
            res.status(400).json({ error: error.message });
        }
    }
    async updateAffiliate(req, res) {
        try {
            const { id } = req.params;
            const data = updateAffiliateSchema.parse(req.body);
            const affiliate = await affiliateService.updateAffiliate(id, data);
            res.json(affiliate);
        }
        catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Invalid input data', details: error.errors });
            }
            res.status(404).json({ error: error.message });
        }
    }
    async deleteAffiliate(req, res) {
        try {
            const { id } = req.params;
            await affiliateService.deleteAffiliate(id);
            res.json({ message: 'Affiliate deleted successfully' });
        }
        catch (error) {
            res.status(404).json({ error: error.message });
        }
    }
    async getMyProfile(req, res) {
        try {
            const profile = await affiliateService.getMyProfile(req.user.id);
            res.json(profile);
        }
        catch (error) {
            res.status(404).json({ error: error.message });
        }
    }
    async updateMyProfile(req, res) {
        try {
            const data = updateAffiliateSchema.parse(req.body);
            const profile = await affiliateService.updateMyProfile(req.user.id, data);
            res.json(profile);
        }
        catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Invalid input data', details: error.errors });
            }
            res.status(500).json({ error: error.message });
        }
    }
    async uploadAvatar(req, res) {
        try {
            res.json({ message: 'Avatar uploaded successfully' });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getAffiliateLinks(req, res) {
        try {
            const { id } = req.params;
            const { page = 1, limit = 10, search, status } = req.query;
            const links = await affiliateService.getAffiliateLinks(id, {
                page: parseInt(page),
                limit: parseInt(limit),
                search: search,
                status: status
            });
            res.json(links);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async createAffiliateLink(req, res) {
        try {
            const { id } = req.params;
            const data = createLinkSchema.parse(req.body);
            const link = await affiliateService.createAffiliateLink(id, data);
            res.status(201).json(link);
        }
        catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Invalid input data', details: error.errors });
            }
            res.status(400).json({ error: error.message });
        }
    }
    async updateAffiliateLink(req, res) {
        try {
            const { linkId } = req.params;
            const data = updateLinkSchema.parse(req.body);
            const link = await affiliateService.updateAffiliateLink(linkId, data);
            res.json(link);
        }
        catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Invalid input data', details: error.errors });
            }
            res.status(404).json({ error: error.message });
        }
    }
    async deleteAffiliateLink(req, res) {
        try {
            const { linkId } = req.params;
            await affiliateService.deleteAffiliateLink(linkId);
            res.json({ message: 'Link deleted successfully' });
        }
        catch (error) {
            res.status(404).json({ error: error.message });
        }
    }
    async getCommissions(req, res) {
        try {
            const { id } = req.params;
            const { page = 1, limit = 10, status, startDate, endDate } = req.query;
            const commissions = await affiliateService.getCommissions(id, {
                page: parseInt(page),
                limit: parseInt(limit),
                status: status,
                startDate: startDate,
                endDate: endDate
            });
            res.json(commissions);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getPayouts(req, res) {
        try {
            const { id } = req.params;
            const { page = 1, limit = 10, status, startDate, endDate } = req.query;
            const payouts = await affiliateService.getPayouts(id, {
                page: parseInt(page),
                limit: parseInt(limit),
                status: status,
                startDate: startDate,
                endDate: endDate
            });
            res.json(payouts);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async requestPayout(req, res) {
        try {
            const { id } = req.params;
            const data = requestPayoutSchema.parse(req.body);
            const payout = await affiliateService.requestPayout(id, data);
            res.status(201).json(payout);
        }
        catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Invalid input data', details: error.errors });
            }
            res.status(400).json({ error: error.message });
        }
    }
    async getAnalytics(req, res) {
        try {
            const { id } = req.params;
            const { timeRange = '30d', startDate, endDate } = req.query;
            const analytics = await affiliateService.getAnalytics(id, {
                timeRange: timeRange,
                startDate: startDate,
                endDate: endDate
            });
            res.json(analytics);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getClicksAnalytics(req, res) {
        try {
            const { id } = req.params;
            const { timeRange = '30d', startDate, endDate, groupBy = 'day' } = req.query;
            const analytics = await affiliateService.getClicksAnalytics(id, {
                timeRange: timeRange,
                startDate: startDate,
                endDate: endDate,
                groupBy: groupBy
            });
            res.json(analytics);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getConversionsAnalytics(req, res) {
        try {
            const { id } = req.params;
            const { timeRange = '30d', startDate, endDate, groupBy = 'day' } = req.query;
            const analytics = await affiliateService.getConversionsAnalytics(id, {
                timeRange: timeRange,
                startDate: startDate,
                endDate: endDate,
                groupBy: groupBy
            });
            res.json(analytics);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
exports.AffiliateController = AffiliateController;
//# sourceMappingURL=AffiliateController.js.map