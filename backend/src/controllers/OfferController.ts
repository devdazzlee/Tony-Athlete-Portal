import { Request, Response } from "express";
import { OfferService } from "../services/OfferService";
import { z } from "zod";
import "../types/express";

const offerService = new OfferService();

const createOfferSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  commissionRate: z.number().min(0).max(100),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
});

const updateOfferSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "PAUSED", "EXPIRED"]).optional(),
});

const applyForOfferSchema = z.object({
  message: z.string().optional(),
});

const updateApplicationSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  message: z.string().optional(),
});

const createCreativeSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["BANNER", "LOGO", "SOCIAL_MEDIA", "EMAIL_TEMPLATE", "VIDEO"]),
  size: z.string().min(1),
  format: z.string().min(1),
  url: z.string().url(),
  downloadUrl: z.string().url(),
});

const updateCreativeSchema = z.object({
  name: z.string().min(1).optional(),
  type: z
    .enum(["BANNER", "LOGO", "SOCIAL_MEDIA", "EMAIL_TEMPLATE", "VIDEO"])
    .optional(),
  size: z.string().min(1).optional(),
  format: z.string().min(1).optional(),
  url: z.string().url().optional(),
  downloadUrl: z.string().url().optional(),
});

export class OfferController {
  async getAllOffers(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search, status } = req.query;

      const offers = await offerService.getAllOffers({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        status: status as string,
      });

      res.json(offers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getOfferById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const offer = await offerService.getOfferById(id);
      res.json(offer);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async createOffer(req: Request, res: Response) {
    try {
      const data = createOfferSchema.parse(req.body);
      const accountId = req.user?.accountId || "default"; // Get accountId from request user or use default
      const offer = await offerService.createOffer(data as any, accountId);
      res.status(201).json(offer);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }

  async updateOffer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = updateOfferSchema.parse(req.body);
      const offer = await offerService.updateOffer(id, data);
      res.json(offer);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(404).json({ error: error.message });
    }
  }

  async deleteOffer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await offerService.deleteOffer(id);
      res.json({ message: "Offer deleted successfully" });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async getOfferApplications(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10, status } = req.query;

      const applications = await offerService.getOfferApplications(id, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as string,
      });

      res.json(applications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async applyForOffer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = applyForOfferSchema.parse(req.body);
      const application = await offerService.applyForOffer(
        id,
        req.user.id,
        data
      );
      res.status(201).json(application);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }

  async updateApplication(req: Request, res: Response) {
    try {
      const { applicationId } = req.params;
      const data = updateApplicationSchema.parse(req.body);
      const application = await offerService.updateApplication(
        applicationId,
        data as any
      );
      res.json(application);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(404).json({ error: error.message });
    }
  }

  async deleteApplication(req: Request, res: Response) {
    try {
      const { applicationId } = req.params;
      await offerService.deleteApplication(applicationId);
      res.json({ message: "Application deleted successfully" });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async getOfferCreatives(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10, type } = req.query;

      const creatives = await offerService.getOfferCreatives(id, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        type: type as string,
      });

      res.json(creatives);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async createCreative(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = createCreativeSchema.parse(req.body);
      const creative = await offerService.createCreative(id, data as any);
      res.status(201).json(creative);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }

  async updateCreative(req: Request, res: Response) {
    try {
      const { creativeId } = req.params;
      const data = updateCreativeSchema.parse(req.body);
      const creative = await offerService.updateCreative(creativeId, data);
      res.json(creative);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(404).json({ error: error.message });
    }
  }

  async deleteCreative(req: Request, res: Response) {
    try {
      const { creativeId } = req.params;
      await offerService.deleteCreative(creativeId);
      res.json({ message: "Creative deleted successfully" });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async getOfferAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { timeRange = "30d", startDate, endDate } = req.query;

      const analytics = await offerService.getOfferAnalytics(id, {
        timeRange: timeRange as string,
        startDate: startDate as string,
        endDate: endDate as string,
      });

      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getOfferClicks(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        timeRange = "30d",
        startDate,
        endDate,
        groupBy = "day",
      } = req.query;

      const analytics = await offerService.getOfferClicks(id, {
        timeRange: timeRange as string,
        startDate: startDate as string,
        endDate: endDate as string,
        groupBy: groupBy as string,
      });

      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getOfferConversions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        timeRange = "30d",
        startDate,
        endDate,
        groupBy = "day",
      } = req.query;

      const analytics = await offerService.getOfferConversions(id, {
        timeRange: timeRange as string,
        startDate: startDate as string,
        endDate: endDate as string,
        groupBy: groupBy as string,
      });

      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
