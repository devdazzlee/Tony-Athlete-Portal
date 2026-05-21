import express, { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const router: Router = express.Router();
const prisma = new PrismaClient();

// Get all feedback submissions
router.get(
  "/",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req: any, res) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search,
        startDate,
        endDate 
      } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build where clause - only get feedback_submitted activities
      const where: any = {
        action: "feedback_submitted",
      };

      // Add date range filter
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate as string);
        }
      }

      // Note: Search will be handled client-side after fetching
      // Prisma JSON field search is complex, so we fetch all and filter client-side

      // Fetch feedback activities with user information
      const [activities, total] = await Promise.all([
        prisma.activity.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: parseInt(limit as string),
        }),
        prisma.activity.count({ where }),
      ]);

      // Transform the data to a cleaner format
      const feedback = activities.map((activity) => {
        const details = activity.details as any;
        const hasName = details?.name && details.name.trim().length > 0;
        const hasEmail = details?.email && details.email.trim().length > 0;
        const isAnonymous = details?.anonymous !== false ? (!hasName && !hasEmail) : false;
        
        return {
          id: activity.id,
          feedback: details?.feedback || "",
          anonymous: isAnonymous,
          submittedAt: activity.createdAt,
          user: activity.user
            ? {
                id: activity.user.id,
                email: hasEmail ? details.email : activity.user.email,
                firstName: hasName ? details.name.split(' ')[0] : activity.user.firstName,
                lastName: hasName && details.name.split(' ').length > 1 ? details.name.split(' ').slice(1).join(' ') : activity.user.lastName,
                phone: activity.user.phone,
                fullName: hasName ? details.name : `${activity.user.firstName || ""} ${activity.user.lastName || ""}`.trim() || "Anonymous",
              }
            : hasName || hasEmail
            ? {
                id: "",
                email: hasEmail ? details.email : "",
                firstName: hasName ? details.name.split(' ')[0] : "",
                lastName: hasName && details.name.split(' ').length > 1 ? details.name.split(' ').slice(1).join(' ') : "",
                phone: null,
                fullName: hasName ? details.name : "",
              }
            : null,
          // Include name and email from details for direct access
          name: hasName ? details.name : null,
          email: hasEmail ? details.email : null,
          photoUrl: details?.photoUrl || null,
          ipAddress: activity.ipAddress,
          userAgent: activity.userAgent,
        };
      });

      res.json({
        success: true,
        data: feedback,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      });
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch feedback submissions" 
      });
    }
  }
);

// Get feedback statistics
router.get(
  "/stats",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req: any, res) => {
    try {
      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const feedbackWhere = { action: "feedback_submitted" as const };

      const [total, last7DaysCount, last30DaysCount, allFeedbackForAnonymous] =
        await Promise.all([
          prisma.activity.count({ where: feedbackWhere }),
          prisma.activity.count({
            where: { ...feedbackWhere, createdAt: { gte: last7Days } },
          }),
          prisma.activity.count({
            where: { ...feedbackWhere, createdAt: { gte: last30Days } },
          }),
          prisma.activity.findMany({
            where: feedbackWhere,
            select: { details: true },
          }),
        ]);

      const anonymousCount = allFeedbackForAnonymous.filter((f) => {
        const details = f.details as any;
        const hasName = details?.name && details.name.trim().length > 0;
        const hasEmail = details?.email && details.email.trim().length > 0;
        return !hasName && !hasEmail;
      }).length;

      res.json({
        success: true,
        stats: {
          total,
          last7Days: last7DaysCount,
          last30Days: last30DaysCount,
          anonymous: anonymousCount,
          withDetails: total - anonymousCount,
        },
      });
    } catch (error) {
      console.error("Error fetching feedback stats:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch feedback statistics" 
      });
    }
  }
);

// Get single feedback by ID
router.get(
  "/:id",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;

      const activity = await prisma.activity.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      });

      if (!activity || activity.action !== "feedback_submitted") {
        return res.status(404).json({
          success: false,
          error: "Feedback not found",
        });
      }

      const details = activity.details as any;
      const hasName = details?.name && details.name.trim().length > 0;
      const hasEmail = details?.email && details.email.trim().length > 0;
      const isAnonymous = details?.anonymous !== false ? (!hasName && !hasEmail) : false;
      
      const feedback = {
        id: activity.id,
        feedback: details?.feedback || "",
        anonymous: isAnonymous,
        submittedAt: activity.createdAt,
        user: activity.user
          ? {
              id: activity.user.id,
              email: hasEmail ? details.email : activity.user.email,
              firstName: hasName ? details.name.split(' ')[0] : activity.user.firstName,
              lastName: hasName && details.name.split(' ').length > 1 ? details.name.split(' ').slice(1).join(' ') : activity.user.lastName,
              phone: activity.user.phone,
              fullName: hasName ? details.name : `${activity.user.firstName || ""} ${activity.user.lastName || ""}`.trim() || "Anonymous",
            }
          : hasName || hasEmail
          ? {
              id: "",
              email: hasEmail ? details.email : "",
              firstName: hasName ? details.name.split(' ')[0] : "",
              lastName: hasName && details.name.split(' ').length > 1 ? details.name.split(' ').slice(1).join(' ') : "",
              phone: null,
              fullName: hasName ? details.name : "",
            }
          : null,
        // Include name and email from details for direct access
        name: hasName ? details.name : null,
        email: hasEmail ? details.email : null,
        photoUrl: details?.photoUrl || null,
        ipAddress: activity.ipAddress,
        userAgent: activity.userAgent,
      };

      res.json({
        success: true,
        data: feedback,
      });
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch feedback" 
      });
    }
  }
);

export default router;
