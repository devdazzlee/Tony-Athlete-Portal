import { Request, Response } from 'express';
import { AffiliateService } from '../services/AffiliateService';
import { z } from 'zod';

const affiliateService = new AffiliateService();

const createAffiliateSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  companyName: z.string().optional(),
  website: z.string().url().optional(),
  paymentMethod: z.enum(['PAYPAL', 'STRIPE', 'BANK_TRANSFER', 'CRYPTO', 'WISE']).optional(),
  paymentEmail: z.string().email().optional(),
  tier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).optional()
});

const updateAffiliateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  companyName: z.string().optional(),
  website: z.string().url().optional(),
  paymentMethod: z.enum(['PAYPAL', 'STRIPE', 'BANK_TRANSFER', 'CRYPTO', 'WISE']).optional(),
  paymentEmail: z.string().email().optional(),
  tier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING']).optional()
});

const createLinkSchema = z.object({
  originalUrl: z.string().url(),
  offerId: z.string().optional(),
  customSlug: z.string().optional(),
  expiresAt: z.string().datetime().optional()
});

const updateLinkSchema = z.object({
  originalUrl: z.string().url().optional(),
  customSlug: z.string().optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional()
});

const requestPayoutSchema = z.object({
  amount: z.number().min(1),
  method: z.enum(['PAYPAL', 'STRIPE', 'BANK_TRANSFER', 'CRYPTO', 'WISE']),
  notes: z.string().optional()
});

export class AffiliateController {
  async getAllAffiliates(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search, status, tier, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      
      const affiliates = await affiliateService.getAllAffiliates({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        status: status as string,
        tier: tier as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as string
      });
      
      res.json(affiliates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAffiliateById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const affiliate = await affiliateService.getAffiliateById(id);
      res.json(affiliate);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async createAffiliate(req: Request, res: Response) {
    try {
      const data = createAffiliateSchema.parse(req.body);
      const affiliate = await affiliateService.createAffiliate(data as any);
      res.status(201).json(affiliate);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }

  async updateAffiliate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = updateAffiliateSchema.parse(req.body);
      const affiliate = await affiliateService.updateAffiliate(id, data);
      res.json(affiliate);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(404).json({ error: error.message });
    }
  }

  async deleteAffiliate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await affiliateService.deleteAffiliate(id);
      res.json({ message: 'Affiliate deleted successfully' });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async getMyProfile(req: any, res: Response) {
    try {
      const profile = await affiliateService.getMyProfile(req.user.id);
      res.json(profile);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async updateMyProfile(req: any, res: Response) {
    try {
      const data = updateAffiliateSchema.parse(req.body);
      const profile = await affiliateService.updateMyProfile(req.user.id, data);
      res.json(profile);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async uploadAvatar(req: any, res: Response) {
    try {
      // Handle file upload logic here
      res.json({ message: 'Avatar uploaded successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAffiliateLinks(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10, search, status } = req.query;
      
      const links = await affiliateService.getAffiliateLinks(id, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        status: status as string
      });
      
      res.json(links);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async createAffiliateLink(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = createLinkSchema.parse(req.body);
      const link = await affiliateService.createAffiliateLink(id, data as any);
      res.status(201).json(link);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }

  async updateAffiliateLink(req: Request, res: Response) {
    try {
      const { linkId } = req.params;
      const data = updateLinkSchema.parse(req.body);
      const link = await affiliateService.updateAffiliateLink(linkId, data);
      res.json(link);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(404).json({ error: error.message });
    }
  }

  async deleteAffiliateLink(req: Request, res: Response) {
    try {
      const { linkId } = req.params;
      await affiliateService.deleteAffiliateLink(linkId);
      res.json({ message: 'Link deleted successfully' });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async getCommissions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10, status, startDate, endDate } = req.query;
      
      const commissions = await affiliateService.getCommissions(id, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string
      });
      
      res.json(commissions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getPayouts(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10, status, startDate, endDate } = req.query;
      
      const payouts = await affiliateService.getPayouts(id, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string
      });
      
      res.json(payouts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async requestPayout(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = requestPayoutSchema.parse(req.body);
      const payout = await affiliateService.requestPayout(id, data as any);
      res.status(201).json(payout);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }

  async getAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { timeRange = '30d', startDate, endDate } = req.query;
      
      const analytics = await affiliateService.getAnalytics(id, {
        timeRange: timeRange as string,
        startDate: startDate as string,
        endDate: endDate as string
      });
      
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getClicksAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { timeRange = '30d', startDate, endDate, groupBy = 'day' } = req.query;
      
      const analytics = await affiliateService.getClicksAnalytics(id, {
        timeRange: timeRange as string,
        startDate: startDate as string,
        endDate: endDate as string,
        groupBy: groupBy as string
      });
      
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getConversionsAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { timeRange = '30d', startDate, endDate, groupBy = 'day' } = req.query;
      
      const analytics = await affiliateService.getConversionsAnalytics(id, {
        timeRange: timeRange as string,
        startDate: startDate as string,
        endDate: endDate as string,
        groupBy: groupBy as string
      });
      
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
