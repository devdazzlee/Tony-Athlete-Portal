import express, { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import emailService from "../services/EmailService";

const router: Router = express.Router();
const prisma = new PrismaClient();

// Get all offers with affiliate information
router.get(
  "/",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { page = 1, limit = 20, status, affiliateId } = req.query;

      // Build where clause
      const whereClause: any = {};
      if (status) {
        whereClause.status = status.toUpperCase();
      }
      if (affiliateId) {
        whereClause.applications = {
          some: {
            affiliateId: affiliateId,
          },
        };
      }

      // Get offers with applications and affiliate info
      const offers = await prisma.offer.findMany({
        where: whereClause,
        include: {
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
          creatives: true,
          _count: {
            select: {
              applications: true,
              creatives: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      });

      // Get referral code IDs from activity log for each offer
      const offerIds = offers.map((o) => o.id);
      const activities = await prisma.activity.findMany({
        where: {
          action: "offer_created",
          resource: "offer",
        },
        select: {
          details: true,
        },
      });

      // Create a map of offerId -> referralCodeIds
      // Prisma stores JSON fields, so we need to filter in JavaScript
      const referralCodeMap = new Map<string, string[]>();
      activities.forEach((activity: any) => {
        const details = activity.details as any;
        if (
          details?.offerId &&
          details?.referralCodeIds &&
          Array.isArray(details.referralCodeIds)
        ) {
          if (offerIds.includes(details.offerId)) {
            referralCodeMap.set(details.offerId, details.referralCodeIds);
          }
        }
      });

      // Format offers data
      const formattedOffers = offers.map((offer) => ({
        id: offer.id,
        name: offer.name,
        description: offer.description,
        commissionRate: offer.commissionRate,
        status: offer.status.toLowerCase(),
        startDate: offer.startDate.toISOString().split("T")[0],
        endDate: offer.endDate?.toISOString().split("T")[0] || null,
        tags: offer.tags,
        // Tracking data
        totalClicks: offer.totalClicks,
        totalConversions: offer.totalConversions,
        totalRevenue: offer.totalRevenue,
        totalCommissions: offer.totalCommissions,
        conversionRate:
          offer.totalClicks > 0
            ? (offer.totalConversions / offer.totalClicks) * 100
            : 0,
        // Counts
        affiliatesCount: offer._count.applications,
        creativesCount: offer._count.creatives,
        // Affiliate applications
        applications: offer.applications.map((app) => ({
          id: app.id,
          affiliateId: app.affiliateId,
          affiliateName: `${app.affiliate.user.firstName} ${app.affiliate.user.lastName}`,
          affiliateEmail: app.affiliate.user.email,
          status: app.status.toLowerCase(),
          appliedAt: app.createdAt.toISOString().split("T")[0],
        })),
        // Creatives
        creatives: offer.creatives.map((creative) => ({
          id: creative.id,
          name: creative.name,
          type: creative.type.toLowerCase(),
          size: creative.size,
          format: creative.format,
          url: creative.url,
          downloadUrl: creative.downloadUrl,
        })),
        // Referral code IDs from activity log
        referralCodeIds: referralCodeMap.get(offer.id) || [],
        createdAt: offer.createdAt.toISOString().split("T")[0],
        updatedAt: offer.updatedAt.toISOString().split("T")[0],
      }));

      // Get total count for pagination
      const totalCount = await prisma.offer.count({ where: whereClause });

      // Get summary statistics
      const summary = await prisma.offer.aggregate({
        where: whereClause,
        _count: {
          id: true,
        },
        _sum: {
          totalRevenue: true,
          totalCommissions: true,
        },
      });

      const statusCounts = await prisma.offer.groupBy({
        by: ["status"],
        _count: {
          id: true,
        },
      });

      res.json({
        data: formattedOffers,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit as string)),
        },
        summary: {
          total: summary._count.id,
          totalRevenue: summary._sum.totalRevenue || 0,
          totalCommissions: summary._sum.totalCommissions || 0,
          active:
            statusCounts.find((s) => s.status === "ACTIVE")?._count.id || 0,
          paused:
            statusCounts.find((s) => s.status === "PAUSED")?._count.id || 0,
          ended: 0, // ENDED status not in enum, set to 0
        },
      });
    } catch (error) {
      console.error("Error fetching offers:", error);
      res.status(500).json({ error: "Failed to fetch offers" });
    }
  }
);

// Get all affiliates for dropdown with referral codes
router.get(
  "/affiliates",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const affiliates = await prisma.affiliateProfile.findMany({
        where: {
          status: "ACTIVE",
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          referralCodes: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
              code: true,
              type: true,
              commissionRate: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: {
          user: {
            firstName: "asc",
          },
        },
      });

      const formattedAffiliates = affiliates.map((affiliate) => ({
        id: affiliate.id,
        name: `${affiliate.user.firstName} ${affiliate.user.lastName}`,
        email: affiliate.user.email,
        tier: affiliate.tier,
        status: affiliate.status,
        referralCodes: affiliate.referralCodes.map((code) => ({
          id: code.id,
          code: code.code,
          type: code.type,
          commissionRate: code.commissionRate,
        })),
      }));

      res.json({
        success: true,
        affiliates: formattedAffiliates,
      });
    } catch (error) {
      console.error("Error fetching affiliates:", error);
      res.status(500).json({ error: "Failed to fetch affiliates" });
    }
  }
);

// Create new offer for specific affiliate
router.post(
  "/",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const {
        name,
        description,
        commissionRate,
        startDate,
        endDate,
        tags,
        affiliateId, // Single affiliate ID to assign this offer to
        referralCodeIds, // Array of referral code IDs to associate with this offer
      } = req.body;

      // Validate input
      const schema = z.object({
        name: z.string().min(3, "Name must be at least 3 characters"),
        description: z
          .string()
          .min(10, "Description must be at least 10 characters"),
        commissionRate: z
          .number()
          .min(0)
          .max(100, "Commission rate must be between 0 and 100"),
        startDate: z.string().min(1, "Start date is required"),
        endDate: z.string().optional(),
        tags: z.array(z.string()).optional(),
        affiliateId: z.string().min(1, "Affiliate selection is required"),
        referralCodeIds: z.array(z.string()).optional(),
      });

      const validatedData = schema.parse({
        name,
        description,
        commissionRate,
        startDate,
        endDate,
        tags: tags || [],
        affiliateId,
        referralCodeIds: referralCodeIds || [],
      });

      // Verify affiliate exists and get their details
      const affiliate = await prisma.affiliateProfile.findUnique({
        where: { id: validatedData.affiliateId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          referralCodes: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
              code: true,
              type: true,
            },
          },
        },
      });

      if (!affiliate) {
        return res.status(404).json({ error: "Affiliate not found" });
      }

      // Create the offer
      const offer = await prisma.offer.create({
        data: {
          accountId: "tc-nutrition-system", // Using system account ID
          name: validatedData.name,
          description: validatedData.description,
          commissionRate: validatedData.commissionRate,
          startDate: new Date(validatedData.startDate),
          endDate: validatedData.endDate
            ? new Date(validatedData.endDate)
            : null,
          tags: validatedData.tags,
        },
      });

      // Create offer application for the selected affiliate
      const application = await prisma.offerApplication.create({
        data: {
          affiliateId: validatedData.affiliateId,
          offerId: offer.id,
          status: "APPROVED", // Auto-approve when admin creates
        },
      });

      // Log activity (store referral code IDs for later retrieval)
      await prisma.activity.create({
        data: {
          userId: req.user.id,
          action: "offer_created",
          resource: "offer",
          details: {
            offerId: offer.id,
            offerName: offer.name,
            assignedAffiliate: affiliate.id,
            affiliateName: `${affiliate.user.firstName} ${affiliate.user.lastName}`,
            referralCode: affiliate.referralCodes[0]?.code || null,
            referralCodeIds: validatedData.referralCodeIds || [], // Store selected referral code IDs
          },
        },
      });

      // Send email notification to the affiliate
      try {
        // Get selected referral codes
        const selectedReferralCodes = affiliate.referralCodes.filter((code) =>
          validatedData.referralCodeIds.includes(code.id)
        );

        await emailService.sendOfferCreatedEmail(
          affiliate.user.email,
          affiliate.user.firstName,
          {
            offerName: offer.name,
            offerDescription: offer.description,
            commissionRate: offer.commissionRate,
            startDate: offer.startDate.toISOString().split("T")[0],
            endDate:
              offer.endDate?.toISOString().split("T")[0] || "No end date",
            referralCodes: selectedReferralCodes.map((code) => code.code),
          }
        );
      } catch (emailError) {
        console.error("Failed to send offer creation email:", emailError);
        // Don't fail the request if email fails
      }

      res.status(201).json({
        success: true,
        message: "Offer created successfully and assigned to affiliate",
        offer: {
          id: offer.id,
          name: offer.name,
          description: offer.description,
          commissionRate: offer.commissionRate,
          status: offer.status.toLowerCase(),
          startDate: offer.startDate.toISOString().split("T")[0],
          endDate: offer.endDate?.toISOString().split("T")[0] || null,
          tags: offer.tags,
          createdAt: offer.createdAt,
          assignedAffiliate: {
            id: affiliate.id,
            name: `${affiliate.user.firstName} ${affiliate.user.lastName}`,
            email: affiliate.user.email,
            referralCodes: affiliate.referralCodes.map((code) => ({
              id: code.id,
              code: code.code,
              type: code.type,
            })),
          },
        },
      });
    } catch (error: any) {
      console.error("Error creating offer:", error);

      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid input data",
          message: "Validation failed",
          details: error.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message,
            code: err.code,
          })),
        });
      }

      // Handle Prisma errors
      if (error.code === "P2002") {
        return res.status(400).json({
          error: "Duplicate entry",
          message: "An offer with this information already exists",
        });
      }

      // Handle other known errors
      if (error.message) {
        console.error("Detailed error:", error.message, error.stack);
        return res.status(500).json({
          error: "Failed to create offer",
          message: error.message,
        });
      }

      // Generic error response
      res.status(500).json({
        error: "Failed to create offer",
        message: "An unexpected error occurred. Please try again.",
      });
    }
  }
);

// Update offer
router.put(
  "/:id",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        commissionRate,
        startDate,
        endDate,
        tags,
        status,
        referralCodeIds, // Include referral code IDs in update
      } = req.body;

      // Validate input
      const schema = z.object({
        name: z.string().min(3).optional(),
        description: z.string().min(10).optional(),
        commissionRate: z.number().min(0).max(100).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        tags: z.array(z.string()).optional(),
        status: z.enum(["ACTIVE", "PAUSED", "ENDED"]).optional(),
        referralCodeIds: z.array(z.string()).optional(),
      });

      const validatedData = schema.parse({
        name,
        description,
        commissionRate,
        startDate,
        endDate,
        tags,
        status,
        referralCodeIds,
      });

      // Remove undefined values and exclude referralCodeIds (not part of Offer model)
      const updateData: any = {};
      Object.keys(validatedData).forEach((key) => {
        // Skip referralCodeIds - it's stored in activity log, not in Offer model
        if (key === "referralCodeIds") {
          return;
        }

        if (validatedData[key as keyof typeof validatedData] !== undefined) {
          if (key === "startDate" || key === "endDate") {
            updateData[key] = validatedData[key as keyof typeof validatedData]
              ? new Date(
                  validatedData[key as keyof typeof validatedData] as string
                )
              : null;
          } else {
            updateData[key] = validatedData[key as keyof typeof validatedData];
          }
        }
      });

      const updatedOffer = await prisma.offer.update({
        where: { id },
        data: updateData,
        include: {
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
          _count: {
            select: {
              applications: true,
              creatives: true,
            },
          },
        },
      });

      // Update activity log with new referral code IDs if provided
      if (validatedData.referralCodeIds !== undefined) {
        // Find the original offer creation activity
        // Prisma doesn't support JSON path queries directly, so we fetch and filter
        const allActivities = await prisma.activity.findMany({
          where: {
            action: "offer_created",
            resource: "offer",
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        // Find the activity for this offer
        const creationActivity = allActivities.find((activity: any) => {
          const details = activity.details as any;
          return details?.offerId === id;
        });

        // Update the referral code IDs in the activity details
        if (creationActivity) {
          const details = creationActivity.details as any;
          await prisma.activity.update({
            where: { id: creationActivity.id },
            data: {
              details: {
                ...details,
                referralCodeIds: validatedData.referralCodeIds || [],
              },
            },
          });
        }
      }

      // Log activity
      await prisma.activity.create({
        data: {
          userId: req.user.id,
          action: "offer_updated",
          resource: "offer",
          details: {
            offerId: id,
            offerName: updatedOffer.name,
            changes: updateData,
            referralCodeIds: validatedData.referralCodeIds || undefined,
          },
        },
      });

      res.json({
        success: true,
        message: "Offer updated successfully",
        offer: {
          id: updatedOffer.id,
          name: updatedOffer.name,
          description: updatedOffer.description,
          commissionRate: updatedOffer.commissionRate,
          status: updatedOffer.status.toLowerCase(),
          startDate: updatedOffer.startDate.toISOString().split("T")[0],
          endDate: updatedOffer.endDate?.toISOString().split("T")[0] || null,
          tags: updatedOffer.tags,
          affiliatesCount: updatedOffer._count.applications,
          creativesCount: updatedOffer._count.creatives,
        },
      });
    } catch (error) {
      console.error("Error updating offer:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update offer" });
    }
  }
);

// Delete offer
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;

      // Get offer details for logging
      const offer = await prisma.offer.findUnique({
        where: { id },
        select: { name: true, _count: { select: { applications: true } } },
      });

      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      // Delete the offer (cascade will handle related records)
      await prisma.offer.delete({
        where: { id },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          userId: req.user.id,
          action: "offer_deleted",
          resource: "offer",
          details: {
            offerId: id,
            offerName: offer.name,
            affectedApplications: offer._count.applications,
          },
        },
      });

      res.json({
        success: true,
        message: "Offer deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting offer:", error);
      res.status(500).json({ error: "Failed to delete offer" });
    }
  }
);

// Assign offer to affiliates
router.post(
  "/:id/assign",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { affiliateIds } = req.body;

      const schema = z.object({
        affiliateIds: z
          .array(z.string())
          .min(1, "At least one affiliate must be selected"),
      });

      const validatedData = schema.parse({ affiliateIds });

      // Check if offer exists
      const offer = await prisma.offer.findUnique({
        where: { id },
        select: { name: true },
      });

      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      // Create applications for selected affiliates
      const applications = await Promise.all(
        validatedData.affiliateIds.map((affiliateId) =>
          prisma.offerApplication.upsert({
            where: {
              affiliateId_offerId: {
                affiliateId,
                offerId: id,
              },
            },
            update: {
              status: "APPROVED",
            },
            create: {
              affiliateId,
              offerId: id,
              status: "APPROVED",
            },
          })
        )
      );

      // Log activity
      await prisma.activity.create({
        data: {
          userId: req.user.id,
          action: "offer_assigned",
          resource: "offer",
          details: {
            offerId: id,
            offerName: offer.name,
            assignedAffiliates: applications.length,
            affiliateIds: validatedData.affiliateIds,
          },
        },
      });

      res.json({
        success: true,
        message: `Offer assigned to ${applications.length} affiliate(s)`,
        assignedCount: applications.length,
      });
    } catch (error) {
      console.error("Error assigning offer:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to assign offer" });
    }
  }
);

// Get offer creatives
router.get(
  "/:id/creatives",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;

      const creatives = await prisma.creative.findMany({
        where: { offerId: id },
        orderBy: { createdAt: "desc" },
      });

      const formattedCreatives = creatives.map((creative) => ({
        id: creative.id,
        name: creative.name,
        type: creative.type.toLowerCase(),
        size: creative.size,
        format: creative.format,
        url: creative.url,
        downloadUrl: creative.downloadUrl,
        createdAt: creative.createdAt.toISOString().split("T")[0],
      }));

      res.json({
        success: true,
        creatives: formattedCreatives,
      });
    } catch (error) {
      console.error("Error fetching creatives:", error);
      res.status(500).json({ error: "Failed to fetch creatives" });
    }
  }
);

// Add creative to offer
router.post(
  "/:id/creatives",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, type, size, format, url, downloadUrl } = req.body;

      const schema = z.object({
        name: z.string().min(1, "Name is required"),
        type: z.enum([
          "BANNER",
          "EMAIL",
          "SOCIAL",
          "LANDING",
          "VIDEO",
          "OTHER",
        ]),
        size: z.string().min(1, "Size is required"),
        format: z.string().min(1, "Format is required"),
        url: z.string().url("Valid URL is required"),
        downloadUrl: z.string().url("Valid download URL is required"),
      });

      const validatedData = schema.parse({
        name,
        type: type.toUpperCase(),
        size,
        format,
        url,
        downloadUrl,
      });

      // Check if offer exists
      const offer = await prisma.offer.findUnique({
        where: { id },
        select: { name: true },
      });

      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      const creative = await prisma.creative.create({
        data: {
          offerId: id,
          name: validatedData.name,
          type: validatedData.type as any,
          size: validatedData.size,
          format: validatedData.format,
          url: validatedData.url,
          downloadUrl: validatedData.downloadUrl,
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          userId: req.user.id,
          action: "creative_added",
          resource: "creative",
          details: {
            creativeId: creative.id,
            creativeName: creative.name,
            offerId: id,
            offerName: offer.name,
            creativeType: creative.type,
          },
        },
      });

      res.json({
        success: true,
        message: "Creative added successfully",
        creative: {
          id: creative.id,
          name: creative.name,
          type: creative.type.toLowerCase(),
          size: creative.size,
          format: creative.format,
          url: creative.url,
          downloadUrl: creative.downloadUrl,
        },
      });
    } catch (error) {
      console.error("Error adding creative:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to add creative" });
    }
  }
);

// Update creative
router.put(
  "/:offerId/creatives/:creativeId",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { offerId, creativeId } = req.params;
      const { name, type, size, format, url, downloadUrl } = req.body;

      const schema = z.object({
        name: z.string().min(1, "Name is required"),
        type: z.enum([
          "BANNER",
          "EMAIL",
          "SOCIAL",
          "LANDING",
          "VIDEO",
          "OTHER",
        ]),
        size: z.string().min(1, "Size is required"),
        format: z.string().min(1, "Format is required"),
        url: z.string().url("Valid URL is required"),
        downloadUrl: z.string().url("Valid download URL is required"),
      });

      const validatedData = schema.parse({
        name,
        type: type.toUpperCase(),
        size,
        format,
        url,
        downloadUrl,
      });

      // Check if creative exists
      const existingCreative = await prisma.creative.findUnique({
        where: { id: creativeId },
        select: { name: true, offerId: true },
      });

      if (!existingCreative) {
        return res.status(404).json({ error: "Creative not found" });
      }

      if (existingCreative.offerId !== offerId) {
        return res
          .status(400)
          .json({ error: "Creative does not belong to this offer" });
      }

      const updatedCreative = await prisma.creative.update({
        where: { id: creativeId },
        data: {
          name: validatedData.name,
          type: validatedData.type as any,
          size: validatedData.size,
          format: validatedData.format,
          url: validatedData.url,
          downloadUrl: validatedData.downloadUrl,
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          userId: req.user.id,
          action: "creative_updated",
          resource: "creative",
          details: {
            creativeId,
            creativeName: updatedCreative.name,
            offerId,
            changes: validatedData,
          },
        },
      });

      res.json({
        success: true,
        message: "Creative updated successfully",
        creative: {
          id: updatedCreative.id,
          name: updatedCreative.name,
          type: updatedCreative.type.toLowerCase(),
          size: updatedCreative.size,
          format: updatedCreative.format,
          url: updatedCreative.url,
          downloadUrl: updatedCreative.downloadUrl,
        },
      });
    } catch (error) {
      console.error("Error updating creative:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update creative" });
    }
  }
);

// Delete creative
router.delete(
  "/:offerId/creatives/:creativeId",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { offerId, creativeId } = req.params;

      // Check if creative exists
      const creative = await prisma.creative.findUnique({
        where: { id: creativeId },
        select: { name: true, offerId: true },
      });

      if (!creative) {
        return res.status(404).json({ error: "Creative not found" });
      }

      if (creative.offerId !== offerId) {
        return res
          .status(400)
          .json({ error: "Creative does not belong to this offer" });
      }

      await prisma.creative.delete({
        where: { id: creativeId },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          userId: req.user.id,
          action: "creative_deleted",
          resource: "creative",
          details: {
            creativeId,
            creativeName: creative.name,
            offerId,
          },
        },
      });

      res.json({
        success: true,
        message: "Creative deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting creative:", error);
      res.status(500).json({ error: "Failed to delete creative" });
    }
  }
);

export default router;
