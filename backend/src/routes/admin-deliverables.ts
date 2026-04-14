import express, { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import emailService from "../services/EmailService";

const router: Router = express.Router();
const prisma = new PrismaClient();

// Get all deliverable submissions with filtering
router.get(
  "/",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req: any, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        month,
        affiliateId,
      } = req.query;

      const filters: any = {
        action: "deliverable_submitted",
      };

      if (status && status !== "all") {
        filters.status = status;
      }

      if (month) {
        filters.details = {
          path: ["month"],
          equals: month,
        };
      }

      if (affiliateId) {
        filters.userId = affiliateId;
      }

      const submissions = await prisma.activity.findMany({
        where: filters,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      });

      const total = await prisma.activity.count({ where: filters });

      const formattedSubmissions = submissions.map((submission) => {
        const details = submission.details as any;
        return {
          id: submission.id,
          affiliateId: submission.userId,
          affiliateName: `${submission.user.firstName} ${submission.user.lastName}`,
          affiliateEmail: submission.user.email,
          month: details.month,
          platform: details.platform,
          url: details.url,
          photoUrl: details.photoUrl || null,
          status: submission.status || "PENDING",
          adminComment: submission.adminComment || null,
          reviewedAt: submission.reviewedAt,
          submittedAt: submission.createdAt,
        };
      });

      res.json({
        submissions: formattedSubmissions,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching deliverable submissions:", error);
      res.status(500).json({ error: "Failed to fetch deliverable submissions" });
    }
  }
);

// Get deliverable submission by ID
router.get(
  "/:id",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;

      const submission = await prisma.activity.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!submission || submission.action !== "deliverable_submitted") {
        return res.status(404).json({ error: "Deliverable submission not found" });
      }

      const details = submission.details as any;

      res.json({
        id: submission.id,
        affiliateId: submission.userId,
        affiliateName: `${submission.user.firstName} ${submission.user.lastName}`,
        affiliateEmail: submission.user.email,
        month: details.month,
        platform: details.platform,
        url: details.url,
        photoUrl: details.photoUrl || null,
        status: submission.status || "PENDING",
        adminComment: submission.adminComment || null,
        reviewedAt: submission.reviewedAt,
        submittedAt: submission.createdAt,
      });
    } catch (error) {
      console.error("Error fetching deliverable submission:", error);
      res.status(500).json({ error: "Failed to fetch deliverable submission" });
    }
  }
);

// Approve deliverable submission
router.patch(
  "/:id/approve",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const approveSchema = z.object({
        comment: z.string().optional(),
      });

      const { comment } = approveSchema.parse(req.body);

      const submission = await prisma.activity.findUnique({
        where: { id },
      });

      if (!submission || submission.action !== "deliverable_submitted") {
        return res.status(404).json({ error: "Deliverable submission not found" });
      }

      const updatedSubmission = await prisma.activity.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
          adminComment: comment || null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      await prisma.notification.create({
        data: {
          userId: updatedSubmission.userId,
          type: "INFO",
          title: "Deliverable approved",
          message: comment?.trim()
            ? `Your deliverable was approved. Admin comment: ${comment.trim()}`
            : "Your deliverable was approved.",
          data: {
            deliverableId: updatedSubmission.id,
            category: "DELIVERABLE_RESPONSE",
          } as any,
        },
      });

      if (updatedSubmission.user?.email) {
        await emailService.sendEmail({
          to: updatedSubmission.user.email,
          subject: "Deliverable approved",
          html: `<p>Your deliverable submission has been approved.</p><p>${comment ? `Admin comment: ${comment}` : ""}</p>`,
        });
      }

      res.json({
        message: "Deliverable approved successfully",
        submission: updatedSubmission,
      });
    } catch (error) {
      console.error("Error approving deliverable:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to approve deliverable" });
    }
  }
);

// Reject deliverable submission
router.patch(
  "/:id/reject",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const rejectSchema = z.object({
        comment: z.string().min(1, "Comment is required when rejecting"),
      });

      const { comment } = rejectSchema.parse(req.body);

      const submission = await prisma.activity.findUnique({
        where: { id },
      });

      if (!submission || submission.action !== "deliverable_submitted") {
        return res.status(404).json({ error: "Deliverable submission not found" });
      }

      const updatedSubmission = await prisma.activity.update({
        where: { id },
        data: {
          status: "REJECTED",
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
          adminComment: comment,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      await prisma.notification.create({
        data: {
          userId: updatedSubmission.userId,
          type: "WARNING",
          title: "Deliverable needs updates",
          message: `Your deliverable was rejected. Admin comment: ${comment}`,
          data: {
            deliverableId: updatedSubmission.id,
            category: "DELIVERABLE_RESPONSE",
          } as any,
        },
      });

      if (updatedSubmission.user?.email) {
        await emailService.sendEmail({
          to: updatedSubmission.user.email,
          subject: "Deliverable feedback from admin",
          html: `<p>Your deliverable needs updates.</p><p>Admin comment: ${comment}</p>`,
        });
      }

      res.json({
        message: "Deliverable rejected successfully",
        submission: updatedSubmission,
      });
    } catch (error) {
      console.error("Error rejecting deliverable:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to reject deliverable" });
    }
  }
);

// Get statistics for deliverables
router.get(
  "/stats/overview",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req: any, res) => {
    try {
      const totalSubmissions = await prisma.activity.count({
        where: { action: "deliverable_submitted" },
      });

      // Count pending: status is "PENDING" OR null (null defaults to pending)
      const pendingSubmissions = await prisma.activity.count({
        where: {
          action: "deliverable_submitted",
          OR: [
            { status: "PENDING" },
            { status: null },
          ],
        },
      });

      const approvedSubmissions = await prisma.activity.count({
        where: {
          action: "deliverable_submitted",
          status: "APPROVED",
        },
      });

      const rejectedSubmissions = await prisma.activity.count({
        where: {
          action: "deliverable_submitted",
          status: "REJECTED",
        },
      });

      res.json({
        totalSubmissions,
        pendingSubmissions,
        approvedSubmissions,
        rejectedSubmissions,
      });
    } catch (error) {
      console.error("Error fetching deliverable statistics:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  }
);

export default router;















