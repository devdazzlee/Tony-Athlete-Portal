"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfferController = void 0;
const OfferService_1 = require("../services/OfferService");
const zod_1 = require("zod");
require("../types/express");
const offerService = new OfferService_1.OfferService();
const createOfferSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().min(1),
    commissionRate: zod_1.z.number().min(0).max(100),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime().optional(),
});
const updateOfferSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().min(1).optional(),
    commissionRate: zod_1.z.number().min(0).max(100).optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    status: zod_1.z.enum(["ACTIVE", "INACTIVE", "PAUSED", "EXPIRED"]).optional(),
});
const applyForOfferSchema = zod_1.z.object({
    message: zod_1.z.string().optional(),
});
const updateApplicationSchema = zod_1.z.object({
    status: zod_1.z.enum(["PENDING", "APPROVED", "REJECTED"]),
    message: zod_1.z.string().optional(),
});
const createCreativeSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    type: zod_1.z.enum(["BANNER", "LOGO", "SOCIAL_MEDIA", "EMAIL_TEMPLATE", "VIDEO"]),
    size: zod_1.z.string().min(1),
    format: zod_1.z.string().min(1),
    url: zod_1.z.string().url(),
    downloadUrl: zod_1.z.string().url(),
});
const updateCreativeSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    type: zod_1.z
        .enum(["BANNER", "LOGO", "SOCIAL_MEDIA", "EMAIL_TEMPLATE", "VIDEO"])
        .optional(),
    size: zod_1.z.string().min(1).optional(),
    format: zod_1.z.string().min(1).optional(),
    url: zod_1.z.string().url().optional(),
    downloadUrl: zod_1.z.string().url().optional(),
});
class OfferController {
    async getAllOffers(req, res) {
        try {
            const { page = 1, limit = 10, search, status } = req.query;
            const offers = await offerService.getAllOffers({
                page: parseInt(page),
                limit: parseInt(limit),
                search: search,
                status: status,
            });
            res.json(offers);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getOfferById(req, res) {
        try {
            const { id } = req.params;
            const offer = await offerService.getOfferById(id);
            res.json(offer);
        }
        catch (error) {
            res.status(404).json({ error: error.message });
        }
    }
    async createOffer(req, res) {
        try {
            const data = createOfferSchema.parse(req.body);
            const accountId = req.user?.accountId || "default";
            const offer = await offerService.createOffer(data, accountId);
            res.status(201).json(offer);
        }
        catch (error) {
            if (error.name === "ZodError") {
                return res
                    .status(400)
                    .json({ error: "Invalid input data", details: error.errors });
            }
            res.status(400).json({ error: error.message });
        }
    }
    async updateOffer(req, res) {
        try {
            const { id } = req.params;
            const data = updateOfferSchema.parse(req.body);
            const offer = await offerService.updateOffer(id, data);
            res.json(offer);
        }
        catch (error) {
            if (error.name === "ZodError") {
                return res
                    .status(400)
                    .json({ error: "Invalid input data", details: error.errors });
            }
            res.status(404).json({ error: error.message });
        }
    }
    async deleteOffer(req, res) {
        try {
            const { id } = req.params;
            await offerService.deleteOffer(id);
            res.json({ message: "Offer deleted successfully" });
        }
        catch (error) {
            res.status(404).json({ error: error.message });
        }
    }
    async getOfferApplications(req, res) {
        try {
            const { id } = req.params;
            const { page = 1, limit = 10, status } = req.query;
            const applications = await offerService.getOfferApplications(id, {
                page: parseInt(page),
                limit: parseInt(limit),
                status: status,
            });
            res.json(applications);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async applyForOffer(req, res) {
        try {
            const { id } = req.params;
            const data = applyForOfferSchema.parse(req.body);
            const application = await offerService.applyForOffer(id, req.user.id, data);
            res.status(201).json(application);
        }
        catch (error) {
            if (error.name === "ZodError") {
                return res
                    .status(400)
                    .json({ error: "Invalid input data", details: error.errors });
            }
            res.status(400).json({ error: error.message });
        }
    }
    async updateApplication(req, res) {
        try {
            const { applicationId } = req.params;
            const data = updateApplicationSchema.parse(req.body);
            const application = await offerService.updateApplication(applicationId, data);
            res.json(application);
        }
        catch (error) {
            if (error.name === "ZodError") {
                return res
                    .status(400)
                    .json({ error: "Invalid input data", details: error.errors });
            }
            res.status(404).json({ error: error.message });
        }
    }
    async deleteApplication(req, res) {
        try {
            const { applicationId } = req.params;
            await offerService.deleteApplication(applicationId);
            res.json({ message: "Application deleted successfully" });
        }
        catch (error) {
            res.status(404).json({ error: error.message });
        }
    }
    async getOfferCreatives(req, res) {
        try {
            const { id } = req.params;
            const { page = 1, limit = 10, type } = req.query;
            const creatives = await offerService.getOfferCreatives(id, {
                page: parseInt(page),
                limit: parseInt(limit),
                type: type,
            });
            res.json(creatives);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async createCreative(req, res) {
        try {
            const { id } = req.params;
            const data = createCreativeSchema.parse(req.body);
            const creative = await offerService.createCreative(id, data);
            res.status(201).json(creative);
        }
        catch (error) {
            if (error.name === "ZodError") {
                return res
                    .status(400)
                    .json({ error: "Invalid input data", details: error.errors });
            }
            res.status(400).json({ error: error.message });
        }
    }
    async updateCreative(req, res) {
        try {
            const { creativeId } = req.params;
            const data = updateCreativeSchema.parse(req.body);
            const creative = await offerService.updateCreative(creativeId, data);
            res.json(creative);
        }
        catch (error) {
            if (error.name === "ZodError") {
                return res
                    .status(400)
                    .json({ error: "Invalid input data", details: error.errors });
            }
            res.status(404).json({ error: error.message });
        }
    }
    async deleteCreative(req, res) {
        try {
            const { creativeId } = req.params;
            await offerService.deleteCreative(creativeId);
            res.json({ message: "Creative deleted successfully" });
        }
        catch (error) {
            res.status(404).json({ error: error.message });
        }
    }
    async getOfferAnalytics(req, res) {
        try {
            const { id } = req.params;
            const { timeRange = "30d", startDate, endDate } = req.query;
            const analytics = await offerService.getOfferAnalytics(id, {
                timeRange: timeRange,
                startDate: startDate,
                endDate: endDate,
            });
            res.json(analytics);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getOfferClicks(req, res) {
        try {
            const { id } = req.params;
            const { timeRange = "30d", startDate, endDate, groupBy = "day", } = req.query;
            const analytics = await offerService.getOfferClicks(id, {
                timeRange: timeRange,
                startDate: startDate,
                endDate: endDate,
                groupBy: groupBy,
            });
            res.json(analytics);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getOfferConversions(req, res) {
        try {
            const { id } = req.params;
            const { timeRange = "30d", startDate, endDate, groupBy = "day", } = req.query;
            const analytics = await offerService.getOfferConversions(id, {
                timeRange: timeRange,
                startDate: startDate,
                endDate: endDate,
                groupBy: groupBy,
            });
            res.json(analytics);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
exports.OfferController = OfferController;
//# sourceMappingURL=OfferController.js.map