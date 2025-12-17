"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OffersController = void 0;
const Offers_1 = require("../models/Offers");
class OffersController {
    static async createOffer(req, res) {
        try {
            const { accountId } = req.user;
            const offerData = req.body;
            const offer = await Offers_1.OffersModel.create({
                accountId,
                ...offerData
            });
            res.status(201).json({
                success: true,
                data: offer,
                message: 'Offer created successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getOffer(req, res) {
        try {
            const { id } = req.params;
            const offer = await Offers_1.OffersModel.findById(id);
            if (!offer) {
                return res.status(404).json({
                    success: false,
                    error: 'Offer not found'
                });
            }
            res.json({
                success: true,
                data: offer
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async updateOffer(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const offer = await Offers_1.OffersModel.update(id, updateData);
            res.json({
                success: true,
                data: offer,
                message: 'Offer updated successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async deleteOffer(req, res) {
        try {
            const { id } = req.params;
            await Offers_1.OffersModel.delete(id);
            res.json({
                success: true,
                message: 'Offer deleted successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async listOffers(req, res) {
        try {
            const { accountId } = req.user;
            const filters = req.query;
            const offers = await Offers_1.OffersModel.list(accountId, filters);
            res.json({
                success: true,
                data: offers,
                count: offers.length
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async addLandingPage(req, res) {
        try {
            const { offerId } = req.params;
            const landingPageData = req.body;
            const offer = await Offers_1.OffersModel.addLandingPage(offerId, landingPageData);
            res.json({
                success: true,
                data: offer,
                message: 'Landing page added successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async updateLandingPage(req, res) {
        try {
            const { offerId, landingPageId } = req.params;
            const updateData = req.body;
            const offer = await Offers_1.OffersModel.updateLandingPage(offerId, landingPageId, updateData);
            res.json({
                success: true,
                data: offer,
                message: 'Landing page updated successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async removeLandingPage(req, res) {
        try {
            const { offerId, landingPageId } = req.params;
            const offer = await Offers_1.OffersModel.removeLandingPage(offerId, landingPageId);
            res.json({
                success: true,
                data: offer,
                message: 'Landing page removed successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async addCreative(req, res) {
        try {
            const { offerId } = req.params;
            const creativeData = req.body;
            const offer = await Offers_1.OffersModel.addCreative(offerId, creativeData);
            res.json({
                success: true,
                data: offer,
                message: 'Creative added successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async updateCreative(req, res) {
        try {
            const { offerId, creativeId } = req.params;
            const updateData = req.body;
            const offer = await Offers_1.OffersModel.updateCreative(offerId, creativeId, updateData);
            res.json({
                success: true,
                data: offer,
                message: 'Creative updated successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async removeCreative(req, res) {
        try {
            const { offerId, creativeId } = req.params;
            const offer = await Offers_1.OffersModel.removeCreative(offerId, creativeId);
            res.json({
                success: true,
                data: offer,
                message: 'Creative removed successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async addIntegration(req, res) {
        try {
            const { offerId } = req.params;
            const integrationData = req.body;
            const offer = await Offers_1.OffersModel.addIntegration(offerId, integrationData);
            res.json({
                success: true,
                data: offer,
                message: 'Integration added successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async updateIntegration(req, res) {
        try {
            const { offerId, integrationId } = req.params;
            const updateData = req.body;
            const offer = await Offers_1.OffersModel.updateIntegration(offerId, integrationId, updateData);
            res.json({
                success: true,
                data: offer,
                message: 'Integration updated successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async removeIntegration(req, res) {
        try {
            const { offerId, integrationId } = req.params;
            const offer = await Offers_1.OffersModel.removeIntegration(offerId, integrationId);
            res.json({
                success: true,
                data: offer,
                message: 'Integration removed successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async generateTrackingCode(req, res) {
        try {
            const { offerId } = req.params;
            const { type } = req.body;
            const trackingCode = await Offers_1.OffersModel.generateTrackingCode(offerId, type);
            res.json({
                success: true,
                data: { trackingCode },
                message: 'Tracking code generated successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async createApplication(req, res) {
        try {
            const { offerId } = req.params;
            const { affiliateId } = req.user;
            const { applicationData, documents } = req.body;
            const application = await Offers_1.OffersModel.createApplication(offerId, affiliateId, applicationData, documents);
            res.status(201).json({
                success: true,
                data: application,
                message: 'Application submitted successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getApplication(req, res) {
        try {
            const { id } = req.params;
            const application = await Offers_1.OffersModel.findApplicationById(id);
            if (!application) {
                return res.status(404).json({
                    success: false,
                    error: 'Application not found'
                });
            }
            res.json({
                success: true,
                data: application
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async updateApplicationStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, rejectionReason, notes } = req.body;
            const { userId } = req.user;
            const application = await Offers_1.OffersModel.updateApplicationStatus(id, status, userId, rejectionReason, notes);
            res.json({
                success: true,
                data: application,
                message: 'Application status updated successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getApplications(req, res) {
        try {
            const { offerId } = req.params;
            const filters = req.query;
            const applications = await Offers_1.OffersModel.getApplications(offerId, filters);
            res.json({
                success: true,
                data: applications,
                count: applications.length
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async updateStats(req, res) {
        try {
            const { offerId } = req.params;
            await Offers_1.OffersModel.updateStats(offerId);
            res.json({
                success: true,
                message: 'Stats updated successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getOfferStats(req, res) {
        try {
            const { accountId } = req.user;
            const { startDate, endDate } = req.query;
            const stats = await Offers_1.OffersModel.getOfferStats(accountId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
            res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getOffersDashboard(req, res) {
        try {
            const { accountId } = req.user;
            const dashboard = await Offers_1.OffersModel.getOffersDashboard(accountId);
            res.json({
                success: true,
                data: dashboard
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async createDefaultOffers(req, res) {
        try {
            const { accountId } = req.user;
            const offers = await Offers_1.OffersModel.createDefaultOffers(accountId);
            res.status(201).json({
                success: true,
                data: offers,
                message: 'Default offers created successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}
exports.OffersController = OffersController;
//# sourceMappingURL=OffersController.js.map