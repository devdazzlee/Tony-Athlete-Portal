import { Request, Response } from 'express';
import { OffersModel } from '../models/Offers';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        accountId: string;
        affiliateId?: string;
        userId?: string;
      };
    }
  }
}

export class OffersController {
  // CRUD Operations
  static async createOffer(req: Request, res: Response) {
    try {
      const { accountId } = req.user!;
      const offerData = req.body;
      
      const offer = await OffersModel.create({
        accountId,
        ...offerData
      });
      
      res.status(201).json({
        success: true,
        data: offer,
        message: 'Offer created successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getOffer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const offer = await OffersModel.findById(id);
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
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async updateOffer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const offer = await OffersModel.update(id, updateData);
      
      res.json({
        success: true,
        data: offer,
        message: 'Offer updated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async deleteOffer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await OffersModel.delete(id);
      
      res.json({
        success: true,
        message: 'Offer deleted successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async listOffers(req: Request, res: Response) {
    try {
      const { accountId } = req.user!;
      const filters = req.query;
      
      const offers = await OffersModel.list(accountId, filters);
      
      res.json({
        success: true,
        data: offers,
        count: offers.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Landing Pages Management
  static async addLandingPage(req: Request, res: Response) {
    try {
      const { offerId } = req.params;
      const landingPageData = req.body;
      
      const offer = await OffersModel.addLandingPage(offerId, landingPageData);
      
      res.json({
        success: true,
        data: offer,
        message: 'Landing page added successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async updateLandingPage(req: Request, res: Response) {
    try {
      const { offerId, landingPageId } = req.params;
      const updateData = req.body;
      
      const offer = await OffersModel.updateLandingPage(offerId, landingPageId, updateData);
      
      res.json({
        success: true,
        data: offer,
        message: 'Landing page updated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async removeLandingPage(req: Request, res: Response) {
    try {
      const { offerId, landingPageId } = req.params;
      
      const offer = await OffersModel.removeLandingPage(offerId, landingPageId);
      
      res.json({
        success: true,
        data: offer,
        message: 'Landing page removed successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Creatives Management
  static async addCreative(req: Request, res: Response) {
    try {
      const { offerId } = req.params;
      const creativeData = req.body;
      
      const offer = await OffersModel.addCreative(offerId, creativeData);
      
      res.json({
        success: true,
        data: offer,
        message: 'Creative added successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async updateCreative(req: Request, res: Response) {
    try {
      const { offerId, creativeId } = req.params;
      const updateData = req.body;
      
      const offer = await OffersModel.updateCreative(offerId, creativeId, updateData);
      
      res.json({
        success: true,
        data: offer,
        message: 'Creative updated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async removeCreative(req: Request, res: Response) {
    try {
      const { offerId, creativeId } = req.params;
      
      const offer = await OffersModel.removeCreative(offerId, creativeId);
      
      res.json({
        success: true,
        data: offer,
        message: 'Creative removed successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Integrations Management
  static async addIntegration(req: Request, res: Response) {
    try {
      const { offerId } = req.params;
      const integrationData = req.body;
      
      const offer = await OffersModel.addIntegration(offerId, integrationData);
      
      res.json({
        success: true,
        data: offer,
        message: 'Integration added successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async updateIntegration(req: Request, res: Response) {
    try {
      const { offerId, integrationId } = req.params;
      const updateData = req.body;
      
      const offer = await OffersModel.updateIntegration(offerId, integrationId, updateData);
      
      res.json({
        success: true,
        data: offer,
        message: 'Integration updated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async removeIntegration(req: Request, res: Response) {
    try {
      const { offerId, integrationId } = req.params;
      
      const offer = await OffersModel.removeIntegration(offerId, integrationId);
      
      res.json({
        success: true,
        data: offer,
        message: 'Integration removed successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Tracking Code Generation
  static async generateTrackingCode(req: Request, res: Response) {
    try {
      const { offerId } = req.params;
      const { type } = req.body;
      
      const trackingCode = await OffersModel.generateTrackingCode(offerId, type);
      
      res.json({
        success: true,
        data: { trackingCode },
        message: 'Tracking code generated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Offer Applications
  static async createApplication(req: Request, res: Response) {
    try {
      const { offerId } = req.params;
      const { affiliateId } = req.user!;
      const { applicationData, documents } = req.body;
      
      const application = await OffersModel.createApplication(offerId, affiliateId, applicationData, documents);
      
      res.status(201).json({
        success: true,
        data: application,
        message: 'Application submitted successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getApplication(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const application = await OffersModel.findApplicationById(id);
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
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async updateApplicationStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, rejectionReason, notes } = req.body;
      const { userId } = req.user!;
      
      const application = await OffersModel.updateApplicationStatus(id, status, userId, rejectionReason, notes);
      
      res.json({
        success: true,
        data: application,
        message: 'Application status updated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getApplications(req: Request, res: Response) {
    try {
      const { offerId } = req.params;
      const filters = req.query;
      
      const applications = await OffersModel.getApplications(offerId, filters);
      
      res.json({
        success: true,
        data: applications,
        count: applications.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Statistics
  static async updateStats(req: Request, res: Response) {
    try {
      const { offerId } = req.params;
      
      await OffersModel.updateStats(offerId);
      
      res.json({
        success: true,
        message: 'Stats updated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getOfferStats(req: Request, res: Response) {
    try {
      const { accountId } = req.user!;
      const { startDate, endDate } = req.query;
      
      const stats = await OffersModel.getOfferStats(accountId, startDate ? new Date(startDate as string) : undefined, endDate ? new Date(endDate as string) : undefined);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Dashboard
  static async getOffersDashboard(req: Request, res: Response) {
    try {
      const { accountId } = req.user!;
      
      const dashboard = await OffersModel.getOffersDashboard(accountId);
      
      res.json({
        success: true,
        data: dashboard
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Default Offers
  static async createDefaultOffers(req: Request, res: Response) {
    try {
      const { accountId } = req.user!;
      
      const offers = await OffersModel.createDefaultOffers(accountId);
      
      res.status(201).json({
        success: true,
        data: offers,
        message: 'Default offers created successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}


