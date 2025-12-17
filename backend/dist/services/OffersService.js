"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OffersService = void 0;
const Offers_1 = require("../models/Offers");
class OffersService {
    static async createOffer(accountId, offerData) {
        return await Offers_1.OffersModel.create({
            accountId,
            ...offerData
        });
    }
    static async getOffer(id) {
        return await Offers_1.OffersModel.findById(id);
    }
    static async updateOffer(id, updateData) {
        return await Offers_1.OffersModel.update(id, updateData);
    }
    static async deleteOffer(id) {
        return await Offers_1.OffersModel.delete(id);
    }
    static async listOffers(accountId, filters = {}) {
        return await Offers_1.OffersModel.list(accountId, filters);
    }
    static async addLandingPage(offerId, landingPageData) {
        return await Offers_1.OffersModel.addLandingPage(offerId, landingPageData);
    }
    static async updateLandingPage(offerId, landingPageId, updateData) {
        return await Offers_1.OffersModel.updateLandingPage(offerId, landingPageId, updateData);
    }
    static async removeLandingPage(offerId, landingPageId) {
        return await Offers_1.OffersModel.removeLandingPage(offerId, landingPageId);
    }
    static async addCreative(offerId, creativeData) {
        return await Offers_1.OffersModel.addCreative(offerId, creativeData);
    }
    static async updateCreative(offerId, creativeId, updateData) {
        return await Offers_1.OffersModel.updateCreative(offerId, creativeId, updateData);
    }
    static async removeCreative(offerId, creativeId) {
        return await Offers_1.OffersModel.removeCreative(offerId, creativeId);
    }
    static async addIntegration(offerId, integrationData) {
        return await Offers_1.OffersModel.addIntegration(offerId, integrationData);
    }
    static async updateIntegration(offerId, integrationId, updateData) {
        return await Offers_1.OffersModel.updateIntegration(offerId, integrationId, updateData);
    }
    static async removeIntegration(offerId, integrationId) {
        return await Offers_1.OffersModel.removeIntegration(offerId, integrationId);
    }
    static async generateTrackingCode(offerId, type) {
        return await Offers_1.OffersModel.generateTrackingCode(offerId, type);
    }
    static async createApplication(offerId, affiliateId, applicationData, documents = []) {
        return await Offers_1.OffersModel.createApplication(offerId, affiliateId, applicationData, documents);
    }
    static async getApplication(id) {
        return await Offers_1.OffersModel.findApplicationById(id);
    }
    static async updateApplicationStatus(id, status, reviewedBy, rejectionReason, notes) {
        return await Offers_1.OffersModel.updateApplicationStatus(id, status, reviewedBy, rejectionReason, notes);
    }
    static async getApplications(offerId, filters = {}) {
        return await Offers_1.OffersModel.getApplications(offerId, filters);
    }
    static async updateStats(offerId) {
        return await Offers_1.OffersModel.updateStats(offerId);
    }
    static async getOfferStats(accountId, startDate, endDate) {
        return await Offers_1.OffersModel.getOfferStats(accountId, startDate, endDate);
    }
    static async getOffersDashboard(accountId) {
        return await Offers_1.OffersModel.getOffersDashboard(accountId);
    }
    static async createDefaultOffers(accountId) {
        return await Offers_1.OffersModel.createDefaultOffers(accountId);
    }
    static async validateOfferAccess(offerId, userId, userRole) {
        const offer = await this.getOffer(offerId);
        if (!offer) {
            throw new Error('Offer not found');
        }
        if (userRole === 'AFFILIATE') {
            const applications = await this.getApplications(offerId, { affiliateId: userId });
            const approvedApplication = applications.find(app => app.status === 'APPROVED');
            if (!approvedApplication && !offer.general.autoApprove) {
                throw new Error('Access denied: Affiliate not approved for this offer');
            }
        }
        return offer;
    }
    static async calculatePayout(offerId, conversionData) {
        const offer = await this.getOffer(offerId);
        if (!offer) {
            throw new Error('Offer not found');
        }
        const revenue = offer.revenue;
        let payout = 0;
        switch (revenue.payoutType) {
            case 'FIXED':
                payout = revenue.basePayout;
                break;
            case 'PERCENTAGE':
                payout = (conversionData.orderValue * revenue.basePayout) / 100;
                break;
            case 'TIERED':
                if (revenue.tieredRates) {
                    for (const tier of revenue.tieredRates) {
                        if (conversionData.orderValue >= tier.min && (!tier.max || conversionData.orderValue <= tier.max)) {
                            if (tier.type === 'FIXED') {
                                payout = tier.rate;
                            }
                            else {
                                payout = (conversionData.orderValue * tier.rate) / 100;
                            }
                            break;
                        }
                    }
                }
                break;
        }
        if (revenue.minimumPayout && payout < revenue.minimumPayout) {
            payout = revenue.minimumPayout;
        }
        if (revenue.maximumPayout && payout > revenue.maximumPayout) {
            payout = revenue.maximumPayout;
        }
        return payout;
    }
    static async validateConversion(offerId, conversionData) {
        const offer = await this.getOffer(offerId);
        if (!offer) {
            throw new Error('Offer not found');
        }
        const validationRules = offer.tracking.validationRules;
        const errors = [];
        for (const rule of validationRules) {
            if (!rule.isActive)
                continue;
            const fieldValue = this.getFieldValue(conversionData, rule.field);
            let isValid = false;
            switch (rule.operator) {
                case 'EQUALS':
                    isValid = fieldValue === rule.value;
                    break;
                case 'NOT_EQUALS':
                    isValid = fieldValue !== rule.value;
                    break;
                case 'CONTAINS':
                    isValid = String(fieldValue).includes(String(rule.value));
                    break;
                case 'GREATER_THAN':
                    isValid = Number(fieldValue) > Number(rule.value);
                    break;
                case 'LESS_THAN':
                    isValid = Number(fieldValue) < Number(rule.value);
                    break;
                case 'REGEX':
                    try {
                        const regex = new RegExp(rule.value);
                        isValid = regex.test(String(fieldValue));
                    }
                    catch {
                        isValid = false;
                    }
                    break;
            }
            if (!isValid) {
                errors.push(rule.message);
            }
        }
        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }
        return true;
    }
    static getFieldValue(data, field) {
        const fields = field.split('.');
        let value = data;
        for (const f of fields) {
            value = value?.[f];
        }
        return value;
    }
    static async processSmartLink(offerId, requestData) {
        const offer = await this.getOffer(offerId);
        if (!offer) {
            throw new Error('Offer not found');
        }
        if (!offer.smartLink.enabled) {
            throw new Error('Smart link is not enabled for this offer');
        }
        const redirectRules = offer.smartLink.redirectRules
            .filter(rule => rule.isActive)
            .sort((a, b) => b.priority - a.priority);
        for (const rule of redirectRules) {
            const matches = this.evaluateSmartLinkConditions(rule.conditions, requestData);
            if (matches) {
                return this.executeSmartLinkActions(rule.actions, requestData);
            }
        }
        if (requestData.country) {
            const geoRedirect = offer.smartLink.geoRedirects.find(gr => gr.country === requestData.country && gr.isActive);
            if (geoRedirect) {
                return { redirect: true, url: geoRedirect.url };
            }
        }
        if (requestData.device) {
            const deviceRedirect = offer.smartLink.deviceRedirects.find(dr => dr.device === requestData.device && dr.isActive);
            if (deviceRedirect) {
                return { redirect: true, url: deviceRedirect.url };
            }
        }
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay();
        const timeRedirect = offer.smartLink.timeBasedRedirects.find(tr => tr.isActive &&
            tr.days.includes(currentDay) &&
            currentHour >= parseInt(tr.startTime.split(':')[0]) &&
            currentHour <= parseInt(tr.endTime.split(':')[0]));
        if (timeRedirect) {
            return { redirect: true, url: timeRedirect.url };
        }
        return { redirect: true, url: offer.smartLink.baseUrl };
    }
    static evaluateSmartLinkConditions(conditions, requestData) {
        for (const condition of conditions) {
            const fieldValue = this.getFieldValue(requestData, condition.field);
            let matches = false;
            switch (condition.operator) {
                case 'EQUALS':
                    matches = fieldValue === condition.value;
                    break;
                case 'NOT_EQUALS':
                    matches = fieldValue !== condition.value;
                    break;
                case 'CONTAINS':
                    matches = String(fieldValue).includes(String(condition.value));
                    break;
                case 'IN':
                    matches = Array.isArray(condition.value) && condition.value.includes(fieldValue);
                    break;
                case 'NOT_IN':
                    matches = Array.isArray(condition.value) && !condition.value.includes(fieldValue);
                    break;
                case 'GREATER_THAN':
                    matches = Number(fieldValue) > Number(condition.value);
                    break;
                case 'LESS_THAN':
                    matches = Number(fieldValue) < Number(condition.value);
                    break;
            }
            if (!matches) {
                return false;
            }
        }
        return true;
    }
    static executeSmartLinkActions(actions, requestData) {
        for (const action of actions) {
            switch (action.type) {
                case 'REDIRECT':
                    return { redirect: true, url: action.parameters.url };
                case 'BLOCK':
                    return { redirect: false, reason: 'Blocked by smart link rule' };
                case 'MODIFY_URL':
                    break;
                case 'ADD_PARAMETER':
                    break;
                case 'REMOVE_PARAMETER':
                    break;
            }
        }
        return { redirect: false, reason: 'No action specified' };
    }
    static async getOfferPerformance(offerId, startDate, endDate) {
        const offer = await this.getOffer(offerId);
        if (!offer) {
            throw new Error('Offer not found');
        }
        const stats = offer.stats;
        const performance = {
            ...stats,
            roi: stats.totalRevenue > 0 ? ((stats.totalRevenue - stats.totalPayout) / stats.totalPayout) * 100 : 0,
            averageOrderValue: stats.totalConversions > 0 ? stats.totalRevenue / stats.totalConversions : 0,
            costPerClick: stats.totalClicks > 0 ? stats.totalPayout / stats.totalClicks : 0,
            costPerConversion: stats.totalConversions > 0 ? stats.totalPayout / stats.totalConversions : 0,
            affiliateUtilization: stats.totalAffiliates > 0 ? (stats.activeAffiliates / stats.totalAffiliates) * 100 : 0
        };
        return performance;
    }
    static async getOfferRecommendations(offerId) {
        const offer = await this.getOffer(offerId);
        if (!offer) {
            throw new Error('Offer not found');
        }
        const recommendations = [];
        const stats = offer.stats;
        if (stats.conversionRate < 2) {
            recommendations.push('Consider optimizing landing pages to improve conversion rate');
        }
        if (false) {
            recommendations.push('Increase affiliate engagement and support');
        }
        if (stats.totalClicks > 1000 && stats.totalConversions < 10) {
            recommendations.push('Review traffic quality and implement fraud prevention');
        }
        if (stats.totalRevenue < stats.totalPayout) {
            recommendations.push('Review payout structure and consider reducing base payout');
        }
        if (false) {
            recommendations.push('Streamline approval process to reduce pending applications');
        }
        return recommendations;
    }
}
exports.OffersService = OffersService;
//# sourceMappingURL=OffersService.js.map