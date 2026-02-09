import express, { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { z } from "zod";

const router: Router = express.Router();

// Validation schema for query parameters
const payoutQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 10)),
  status: z
    .enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"])
    .optional(),
  affiliateId: z.string().optional(),
});

// Get all payouts with real data
router.get(
  "/",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      // Validate and parse query parameters
      let validatedQuery;
      try {
        validatedQuery = payoutQuerySchema.parse(req.query);
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            error: "Invalid query parameters",
            details: error.errors.map((err) => ({
              field: err.path.join("."),
              message: err.message,
            })),
          });
        }
        throw error;
      }

      const { page, limit, status, affiliateId } = validatedQuery;

      // Helper function to format payment method
      const formatPaymentMethod = (method: string): string => {
        const methodMap: Record<string, string> = {
          PAYPAL: "PayPal",
          STRIPE: "Stripe",
          BANK_TRANSFER: "Bank Transfer",
          CRYPTO: "Crypto",
          WISE: "Wise",
        };
        return methodMap[method] || method;
      };

      // Build where clause
      const where: any = {};
      if (status) {
        where.status = status;
      }
      if (affiliateId) {
        where.affiliateId = affiliateId;
      }

      // Fetch both payouts and paid commissions
      // Get individual paid commissions (not grouped by affiliate)
      const paidCommissionsData = await prisma.affiliateOrder.findMany({
        where: {
          status: "PAID",
          ...(affiliateId ? { affiliateId } : {}),
        },
        select: {
          id: true,
          affiliateId: true,
          commissionAmount: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Get unique affiliate IDs from paid commissions
      const affiliateIdsWithPaidCommissions = [
        ...new Set(paidCommissionsData.map((pc) => pc.affiliateId)),
      ];

      // Get affiliate details
      const affiliatesWithPaidCommissions =
        await prisma.affiliateProfile.findMany({
          where: {
            id: { in: affiliateIdsWithPaidCommissions },
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });

      // Create individual payout entries from each paid commission (not grouped)
      const commissionBasedPayouts = paidCommissionsData.map((pc) => {
        const affiliate = affiliatesWithPaidCommissions.find(
          (a) => a.id === pc.affiliateId
        );
        const paymentMethod = affiliate?.paymentMethod || "PAYPAL";
        return {
          id: `COMM-${pc.id}`, // Use individual commission ID
          affiliateId: pc.affiliateId,
          affiliateName: affiliate?.user
            ? `${affiliate.user.firstName} ${affiliate.user.lastName}`
            : "Unknown Affiliate",
          amount: pc.commissionAmount,
          method: formatPaymentMethod(paymentMethod), // Format payment method
          status: "completed", // Paid commissions are completed payouts
          requestDate: pc.createdAt.toISOString().split("T")[0], // Use individual commission date
          email: affiliate?.user?.email || "",
          commissionsCount: 1, // Each entry represents one commission
          source: "commission", // Mark as from commission
        };
      });

      // Fetch actual payouts from Payout table
      const actualPayouts = await prisma.payout.findMany({
        where,
        include: {
          affiliate: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Combine both sources
      const allAffiliatePayouts = [
        ...commissionBasedPayouts,
        ...actualPayouts.map((payout) => ({
          id: payout.id,
          affiliateId: payout.affiliateId,
          affiliateName: payout.affiliate.user
            ? `${payout.affiliate.user.firstName} ${payout.affiliate.user.lastName}`
            : "Unknown Affiliate",
          amount: payout.amount,
          method: formatPaymentMethod(payout.method),
          status: payout.status.toLowerCase(),
          requestDate: payout.createdAt.toISOString().split("T")[0],
          email: payout.affiliate.user?.email || "",
          commissionsCount: 0,
          processedDate: payout.processedAt
            ? payout.processedAt.toISOString().split("T")[0]
            : undefined,
          referenceId: payout.referenceId,
          source: "payout", // Mark as from payout table
        })),
      ];

      // Apply status filter if provided
      let filteredPayouts = allAffiliatePayouts;
      if (status) {
        filteredPayouts = allAffiliatePayouts.filter(
          (p) => p.status === status.toLowerCase()
        );
      }

      // Sort by request date (newest first)
      filteredPayouts.sort(
        (a, b) =>
          new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
      );

      // Apply pagination
      const total = filteredPayouts.length;
      const skip = (page - 1) * limit;
      const paginatedPayouts = filteredPayouts.slice(skip, skip + limit);

      // Formatted payouts are already created above
      const formattedPayouts = paginatedPayouts;

      // Calculate summary statistics from all payouts (both sources)
      const pendingPayouts = allAffiliatePayouts.filter((p) => p.status === "pending");
      const processingPayouts = allAffiliatePayouts.filter(
        (p) => p.status === "processing"
      );
      const completedPayouts = allAffiliatePayouts.filter(
        (p) => p.status === "completed"
      );

      const pendingCount = pendingPayouts.length;
      const processingCount = processingPayouts.length;
      const completedCount = completedPayouts.length;
      const pendingAmount = pendingPayouts.reduce(
        (sum, p) => sum + (p.amount || 0),
        0
      );

      res.json({
        data: formattedPayouts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        summary: {
          pending: pendingCount,
          processing: processingCount,
          completed: completedCount,
          totalPendingAmount: pendingAmount,
        },
      });
    } catch (error) {
      console.error("Error fetching payouts:", error);
      res.status(500).json({ error: "Failed to fetch payouts" });
    }
  }
);

// Update payout status
router.patch(
  "/:id/status",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      const validStatuses = [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      // Update payout in database
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      // Set processedAt if status is COMPLETED
      if (status === "COMPLETED") {
        updateData.processedAt = new Date();
      }

      const payout = await prisma.payout.update({
        where: { id },
        data: updateData,
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
      });

      res.json({
        success: true,
        message: `Payout status updated to ${status}`,
        payout: {
          id: payout.id,
          status: payout.status.toLowerCase(),
          amount: payout.amount,
          method: payout.method,
          processedAt: payout.processedAt,
        },
      });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res.status(404).json({ error: "Payout not found" });
      }
      console.error("Error updating payout status:", error);
      res.status(500).json({ error: "Failed to update payout status" });
    }
  }
);

// Process bulk payouts
router.post(
  "/process-bulk",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { payoutIds, status = "PROCESSING" } = req.body;

      if (!Array.isArray(payoutIds) || payoutIds.length === 0) {
        return res.status(400).json({ error: "Invalid payout IDs" });
      }

      // Validate status
      const validStatuses = ["PROCESSING", "COMPLETED", "FAILED", "CANCELLED"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      // Update bulk payouts
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === "COMPLETED") {
        updateData.processedAt = new Date();
      }

      const result = await prisma.payout.updateMany({
        where: {
          id: { in: payoutIds },
        },
        data: updateData,
      });

      res.json({
        success: true,
        message: `${result.count} payouts processed successfully`,
        processedCount: result.count,
      });
    } catch (error) {
      console.error("Error processing bulk payouts:", error);
      res.status(500).json({ error: "Failed to process bulk payouts" });
    }
  }
);

// Get payout analytics
router.get(
  "/analytics",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { period = "30d" } = req.query;

      // Mock analytics data
      const analytics = {
        period,
        totalPayouts: 156,
        totalAmount: 45320.5,
        averagePayoutAmount: 290.51,
        byStatus: {
          pending: 12,
          processing: 5,
          completed: 135,
          failed: 4,
        },
        byMethod: {
          PayPal: 98,
          "Bank Transfer": 52,
          Check: 6,
        },
        dailyStats: [
          { date: "2024-10-09", payouts: 5, amount: 1250.0 },
          { date: "2024-10-10", payouts: 8, amount: 2150.5 },
          { date: "2024-10-11", payouts: 3, amount: 890.0 },
          { date: "2024-10-12", payouts: 6, amount: 1680.75 },
          { date: "2024-10-13", payouts: 4, amount: 1120.0 },
          { date: "2024-10-14", payouts: 7, amount: 1950.25 },
          { date: "2024-10-15", payouts: 2, amount: 580.0 },
        ],
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching payout analytics:", error);
      res.status(500).json({ error: "Failed to fetch payout analytics" });
    }
  }
);

export default router;
