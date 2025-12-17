import { OffersModel } from '../models/Offers';

export class OffersService {
  // CRUD Operations
  static async createOffer(accountId: string, offerData: any) {
    return await OffersModel.create({
      accountId,
      ...offerData
    });
  }

  static async getOffer(id: string) {
    return await OffersModel.findById(id);
  }

  static async updateOffer(id: string, updateData: any) {
    return await OffersModel.update(id, updateData);
  }

  static async deleteOffer(id: string) {
    return await OffersModel.delete(id);
  }

  static async listOffers(accountId: string, filters: any = {}) {
    return await OffersModel.list(accountId, filters);
  }

  // Landing Pages Management
  static async addLandingPage(offerId: string, landingPageData: any) {
    return await OffersModel.addLandingPage(offerId, landingPageData);
  }

  static async updateLandingPage(offerId: string, landingPageId: string, updateData: any) {
    return await OffersModel.updateLandingPage(offerId, landingPageId, updateData);
  }

  static async removeLandingPage(offerId: string, landingPageId: string) {
    return await OffersModel.removeLandingPage(offerId, landingPageId);
  }

  // Creatives Management
  static async addCreative(offerId: string, creativeData: any) {
    return await OffersModel.addCreative(offerId, creativeData);
  }

  static async updateCreative(offerId: string, creativeId: string, updateData: any) {
    return await OffersModel.updateCreative(offerId, creativeId, updateData);
  }

  static async removeCreative(offerId: string, creativeId: string) {
    return await OffersModel.removeCreative(offerId, creativeId);
  }

  // Integrations Management
  static async addIntegration(offerId: string, integrationData: any) {
    return await OffersModel.addIntegration(offerId, integrationData);
  }

  static async updateIntegration(offerId: string, integrationId: string, updateData: any) {
    return await OffersModel.updateIntegration(offerId, integrationId, updateData);
  }

  static async removeIntegration(offerId: string, integrationId: string) {
    return await OffersModel.removeIntegration(offerId, integrationId);
  }

  // Tracking Code Generation
  static async generateTrackingCode(offerId: string, type: 'PIXEL' | 'JAVASCRIPT' | 'POSTBACK' | 'SERVER_TO_SERVER') {
    return await OffersModel.generateTrackingCode(offerId, type);
  }

  // Offer Applications
  static async createApplication(offerId: string, affiliateId: string, applicationData: any, documents: any[] = []) {
    return await OffersModel.createApplication(offerId, affiliateId, applicationData, documents);
  }

  static async getApplication(id: string) {
    return await OffersModel.findApplicationById(id);
  }

  static async updateApplicationStatus(id: string, status: string, reviewedBy: string, rejectionReason?: string, notes?: string) {
    return await OffersModel.updateApplicationStatus(id, status, reviewedBy, rejectionReason, notes);
  }

  static async getApplications(offerId: string, filters: any = {}) {
    return await OffersModel.getApplications(offerId, filters);
  }

  // Statistics
  static async updateStats(offerId: string) {
    return await OffersModel.updateStats(offerId);
  }

  static async getOfferStats(accountId: string, startDate?: Date, endDate?: Date) {
    return await OffersModel.getOfferStats(accountId, startDate, endDate);
  }

  // Dashboard
  static async getOffersDashboard(accountId: string) {
    return await OffersModel.getOffersDashboard(accountId);
  }

  // Default Offers
  static async createDefaultOffers(accountId: string) {
    return await OffersModel.createDefaultOffers(accountId);
  }

  // Business Logic Methods
  static async validateOfferAccess(offerId: string, userId: string, userRole: string) {
    const offer = await this.getOffer(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    // Check if user has access to this offer
    if (userRole === 'AFFILIATE') {
      // Check if affiliate has applied and been approved
      const applications = await this.getApplications(offerId, { affiliateId: userId });
      const approvedApplication = applications.find(app => app.status === 'APPROVED');
      
      if (!approvedApplication && !offer.general.autoApprove) {
        throw new Error('Access denied: Affiliate not approved for this offer');
      }
    }

    return offer;
  }

  static async calculatePayout(offerId: string, conversionData: any) {
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
              } else {
                payout = (conversionData.orderValue * tier.rate) / 100;
              }
              break;
            }
          }
        }
        break;
    }

    // Apply minimum and maximum constraints
    if (revenue.minimumPayout && payout < revenue.minimumPayout) {
      payout = revenue.minimumPayout;
    }
    if (revenue.maximumPayout && payout > revenue.maximumPayout) {
      payout = revenue.maximumPayout;
    }

    return payout;
  }

  static async validateConversion(offerId: string, conversionData: any) {
    const offer = await this.getOffer(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    const validationRules = offer.tracking.validationRules;
    const errors: string[] = [];

    for (const rule of validationRules) {
      if (!rule.isActive) continue;

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
          } catch {
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

  private static getFieldValue(data: any, field: string): any {
    const fields = field.split('.');
    let value = data;
    
    for (const f of fields) {
      value = value?.[f];
    }
    
    return value;
  }

  static async processSmartLink(offerId: string, requestData: any) {
    const offer = await this.getOffer(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    if (!offer.smartLink.enabled) {
      throw new Error('Smart link is not enabled for this offer');
    }

    // Process redirect rules
    const redirectRules = offer.smartLink.redirectRules
      .filter(rule => rule.isActive)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of redirectRules) {
      const matches = this.evaluateSmartLinkConditions(rule.conditions, requestData);
      
      if (matches) {
        return this.executeSmartLinkActions(rule.actions, requestData);
      }
    }

    // Check geo redirects
    if (requestData.country) {
      const geoRedirect = offer.smartLink.geoRedirects.find(gr => 
        gr.country === requestData.country && gr.isActive
      );
      if (geoRedirect) {
        return { redirect: true, url: geoRedirect.url };
      }
    }

    // Check device redirects
    if (requestData.device) {
      const deviceRedirect = offer.smartLink.deviceRedirects.find(dr => 
        dr.device === requestData.device && dr.isActive
      );
      if (deviceRedirect) {
        return { redirect: true, url: deviceRedirect.url };
      }
    }

    // Check time-based redirects
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    
    const timeRedirect = offer.smartLink.timeBasedRedirects.find(tr => 
      tr.isActive && 
      tr.days.includes(currentDay) &&
      currentHour >= parseInt(tr.startTime.split(':')[0]) &&
      currentHour <= parseInt(tr.endTime.split(':')[0])
    );
    
    if (timeRedirect) {
      return { redirect: true, url: timeRedirect.url };
    }

    // Default to base URL
    return { redirect: true, url: offer.smartLink.baseUrl };
  }

  private static evaluateSmartLinkConditions(conditions: any[], requestData: any): boolean {
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

  private static executeSmartLinkActions(actions: any[], requestData: any) {
    for (const action of actions) {
      switch (action.type) {
        case 'REDIRECT':
          return { redirect: true, url: action.parameters.url };
        case 'BLOCK':
          return { redirect: false, reason: 'Blocked by smart link rule' };
        case 'MODIFY_URL':
          // Implement URL modification logic
          break;
        case 'ADD_PARAMETER':
          // Implement parameter addition logic
          break;
        case 'REMOVE_PARAMETER':
          // Implement parameter removal logic
          break;
      }
    }

    return { redirect: false, reason: 'No action specified' };
  }

  static async getOfferPerformance(offerId: string, startDate?: Date, endDate?: Date) {
    const offer = await this.getOffer(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    // Get performance metrics
    const stats = offer.stats;
    
    // Calculate additional metrics
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

  static async getOfferRecommendations(offerId: string) {
    const offer = await this.getOffer(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    const recommendations: string[] = [];
    const stats = offer.stats;

    // Performance recommendations
    if (stats.conversionRate < 2) {
      recommendations.push('Consider optimizing landing pages to improve conversion rate');
    }

    if (false) { // Simplified
      recommendations.push('Increase affiliate engagement and support');
    }

    if (stats.totalClicks > 1000 && stats.totalConversions < 10) {
      recommendations.push('Review traffic quality and implement fraud prevention');
    }

    // Revenue recommendations
    if (stats.totalRevenue < stats.totalPayout) {
      recommendations.push('Review payout structure and consider reducing base payout');
    }

    // Application recommendations
    if (false) { // Simplified
      recommendations.push('Streamline approval process to reduce pending applications');
    }

    return recommendations;
  }
}
