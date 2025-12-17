import express, { Router } from "express";
import { z } from "zod";
import { authenticateToken } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import emailService from "../services/EmailService";

const router: Router = express.Router();

function parseBankAccountData(bankAccount?: string | null) {
  if (!bankAccount) {
    return {
      bankDetails: null as Record<string, any> | null,
      payoutFrequency: null as string | null,
      minimumPayout: null as number | null,
    };
  }

  try {
    const parsed = JSON.parse(bankAccount);
    if (parsed && typeof parsed === "object") {
      return {
        bankDetails: parsed.bankDetails || parsed || null,
        payoutFrequency: parsed.payoutFrequency || null,
        minimumPayout:
          typeof parsed.minimumPayout === "number"
            ? parsed.minimumPayout
            : null,
      };
    }
  } catch (error) {
    console.warn("Failed to parse affiliate bank account details", error);
  }

  return {
    bankDetails: null as Record<string, any> | null,
    payoutFrequency: null as string | null,
    minimumPayout: null as number | null,
  };
}

function formatPayoutMethod(method?: string | null) {
  if (!method) {
    return "Not Set";
  }
  return method
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Validation schema for query parameters
const commissionQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 10)),
  status: z.enum(["PENDING", "APPROVED", "PAID", "CANCELLED"]).optional(),
  affiliateId: z.string().optional(),
  affiliateSearch: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z
    .enum(["createdAt", "commissionAmount", "status", "orderValue"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// Get all commissions with filtering
router.get("/", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Only admins can access commission management" });
    }

    // Validate and parse query parameters
    let validatedQuery;
    try {
      validatedQuery = commissionQuerySchema.parse(req.query);
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
    const {
      page,
      limit,
      status,
      affiliateId,
      affiliateSearch,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    } = validatedQuery;

    // Build where clause
    const where: any = {};

    // Status filter
    if (status) {
      where.status = status;
    }

    // Affiliate ID filter
    if (affiliateId) {
      where.affiliateId = affiliateId;
    }

    // Affiliate search filter (by name or email)
    if (affiliateSearch) {
      const searchTerm = affiliateSearch.trim();
      if (searchTerm) {
        // Find affiliates matching the search term
        const matchingAffiliates = await prisma.affiliateProfile.findMany({
          where: {
            OR: [
              {
                user: {
                  OR: [
                    {
                      firstName: {
                        contains: searchTerm,
                        mode: "insensitive",
                      },
                    },
                    {
                      lastName: {
                        contains: searchTerm,
                        mode: "insensitive",
                      },
                    },
                    {
                      email: {
                        contains: searchTerm,
                        mode: "insensitive",
                      },
                    },
                  ],
                },
              },
            ],
          },
          select: { id: true },
        });

        const affiliateIds = matchingAffiliates.map((a) => a.id);
        if (affiliateIds.length > 0) {
          where.affiliateId = { in: affiliateIds };
        } else {
          // No matching affiliates found, return empty result
          where.affiliateId = { in: [] };
        }
      }
    }

    // Date range filter with proper timezone handling
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        // Set to start of day (00:00:00) in UTC
        const fromDate = new Date(dateFrom);
        fromDate.setUTCHours(0, 0, 0, 0);
        where.createdAt.gte = fromDate;
      }
      if (dateTo) {
        // Set to end of day (23:59:59) in UTC
        const toDate = new Date(dateTo);
        toDate.setUTCHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    // Get real commission data from AffiliateOrder table
    const [orders, total, statistics] = await Promise.all([
      prisma.affiliateOrder.findMany({
        where,
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
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.affiliateOrder.count({ where }),
      // Calculate statistics
      Promise.all([
        prisma.affiliateOrder.count(),
        prisma.affiliateOrder.aggregate({
          _sum: { commissionAmount: true },
        }),
        prisma.affiliateOrder.count({ where: { status: "PAID" } }),
        prisma.affiliateOrder.aggregate({
          where: { status: "PAID" },
          _sum: { commissionAmount: true },
        }),
        prisma.affiliateOrder.count({ where: { status: "PENDING" } }),
        prisma.affiliateOrder.aggregate({
          where: { status: "PENDING" },
          _sum: { commissionAmount: true },
        }),
        prisma.affiliateOrder.count({ where: { status: "APPROVED" } }),
        prisma.affiliateOrder.aggregate({
          where: { status: "APPROVED" },
          _sum: { commissionAmount: true },
        }),
        prisma.affiliateProfile.count({ where: { status: "ACTIVE" } }),
      ]),
    ]);

    // Format orders as commission objects with last login data
    const commissions = await Promise.all(
      orders.map(async (order) => {
        // Get last login for this affiliate
        const lastLoginActivity = await prisma.activity.findFirst({
          where: {
            userId: order.affiliate.userId,
            action: "user_login",
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            createdAt: true,
          },
        });

        const bankData = parseBankAccountData(order.affiliate.bankAccount);
        const bankDetails = bankData.bankDetails
          ? {
              ...(bankData.bankDetails as Record<string, any>),
              payoutMethod: formatPayoutMethod(order.affiliate.paymentMethod),
              payoutEmail:
                order.affiliate.paymentEmail ||
                order.affiliate.user?.email ||
                "",
              payoutFrequency: bankData.payoutFrequency || "Monthly",
              minimumPayout: bankData.minimumPayout ?? 50,
            }
          : null;

        return {
          id: order.id,
          amount: order.commissionAmount,
          rate: order.commissionRate,
          status: order.status,
          createdAt: order.createdAt,
          payoutDate: order.status === "PAID" ? order.updatedAt : undefined,
          affiliate: {
            ...order.affiliate,
            lastLogin: lastLoginActivity?.createdAt
              ? lastLoginActivity.createdAt
                  .toISOString()
                  .replace("T", " ")
                  .split(".")[0]
              : "Never",
          },
          conversion: {
            orderValue: order.orderValue,
            offer: {
              name: order.referralCode || "Direct Sale",
              description: `Order ${order.orderId}`,
            },
          },
          bankDetails,
        };
      })
    );

    // Format statistics
    const [
      totalCommissions,
      totalAmount,
      paidCount,
      paidAmount,
      pendingCount,
      pendingAmount,
      approvedCount,
      approvedAmount,
      activeAffiliates,
    ] = statistics;

    const formattedStatistics = {
      totalCommissions,
      totalAmount: totalAmount._sum.commissionAmount || 0,
      paidCommissions: paidCount,
      paidAmount: paidAmount._sum.commissionAmount || 0,
      pendingCommissions: pendingCount,
      pendingAmount: pendingAmount._sum.commissionAmount || 0,
      approvedCommissions: approvedCount,
      approvedAmount: approvedAmount._sum.commissionAmount || 0,
      activeAffiliates,
    };

    res.json({
      data: commissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      statistics: formattedStatistics,
    });
  } catch (error) {
    console.error("Error fetching commissions:", error);
    res.status(500).json({ error: "Failed to fetch commissions" });
  }
});

// Update commission status (using AffiliateOrder table)
router.patch("/:id/status", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Only admins can update commission status" });
    }

    const schema = z.object({
      status: z.enum(["PENDING", "APPROVED", "PAID", "CANCELLED"]),
      notes: z.string().optional(),
    });

    const { status, notes } = schema.parse(req.body);
    const { id } = req.params;

    // Update AffiliateOrder status (real commission data)
    const order = await prisma.affiliateOrder.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    // Get affiliate profile for response
    const affiliate = await prisma.affiliateProfile.findUnique({
      where: { id: order.affiliateId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // If approved or paid, update affiliate's total earnings
    if (status === "APPROVED" || status === "PAID") {
      await prisma.affiliateProfile.update({
        where: { id: order.affiliateId },
        data: {
          totalEarnings: { increment: order.commissionAmount },
        },
      });
    }

    // Send email notification when status is marked as PAID
    if (status === "PAID" && affiliate) {
      try {
        await emailService.sendCommissionPaidEmail(
          affiliate.user.email,
          affiliate.user.firstName,
          {
            commissionId: order.id,
            amount: order.commissionAmount,
            commissionRate: order.commissionRate,
            orderValue: order.orderValue,
            referralCode: order.referralCode || "Direct Sale",
            paidDate: new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            paymentMethod: affiliate.paymentMethod || "Default Payment Method",
          }
        );
        console.log(`✅ Commission paid email sent to ${affiliate.user.email}`);
      } catch (emailError) {
        console.error("Failed to send commission paid email:", emailError);
        // Don't fail the entire request if email fails
      }
    }

    res.json({
      id: order.id,
      amount: order.commissionAmount,
      rate: order.commissionRate,
      status: order.status,
      createdAt: order.createdAt,
      affiliate,
      conversion: {
        orderValue: order.orderValue,
        offer: {
          name: order.referralCode || "Direct Sale",
          description: `Order ${order.orderId}`,
        },
      },
    });
  } catch (error) {
    console.error("Error updating commission status:", error);
    res.status(500).json({ error: "Failed to update commission status" });
  }
});

// Delete commission (soft delete by setting status to CANCELLED)
router.delete("/:id", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Only admins can delete commissions" });
    }

    const { id } = req.params;

    // Soft delete by setting status to CANCELLED
    const order = await prisma.affiliateOrder.update({
      where: { id },
      data: {
        status: "CANCELLED",
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "Commission deleted successfully",
      commission: {
        id: order.id,
        status: order.status,
      },
    });
  } catch (error) {
    console.error("Error deleting commission:", error);
    res.status(500).json({ error: "Failed to delete commission" });
  }
});

// Bulk update commission statuses
router.patch("/bulk-status", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Only admins can bulk update commission statuses" });
    }

    const schema = z.object({
      commissionIds: z.array(z.string()),
      status: z.enum(["PENDING", "APPROVED", "PAID", "CANCELLED"]),
      notes: z.string().optional(),
    });

    const { commissionIds, status, notes } = schema.parse(req.body);

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === "PAID") {
      updateData.payoutDate = new Date();
    }

    const result = await prisma.affiliateOrder.updateMany({
      where: {
        id: { in: commissionIds },
      },
      data: updateData,
    });

    // If status is PAID, send email notifications to affiliates
    if (status === "PAID") {
      const orders = await prisma.affiliateOrder.findMany({
        where: { id: { in: commissionIds } },
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

      // Send emails to each affiliate (don't wait for all to complete)
      orders.forEach(async (order) => {
        try {
          await emailService.sendCommissionPaidEmail(
            order.affiliate.user.email,
            order.affiliate.user.firstName,
            {
              commissionId: order.id,
              amount: order.commissionAmount,
              commissionRate: order.commissionRate,
              orderValue: order.orderValue,
              referralCode: order.referralCode || "Direct Sale",
              paidDate: new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
              paymentMethod:
                order.affiliate.paymentMethod || "Default Payment Method",
            }
          );
          console.log(
            `✅ Bulk commission paid email sent to ${order.affiliate.user.email}`
          );
        } catch (emailError) {
          console.error(
            `Failed to send email to ${order.affiliate.user.email}:`,
            emailError
          );
        }
      });
    }

    // If approved, update affiliate earnings
    if (status === "APPROVED") {
      const orders = await prisma.affiliateOrder.findMany({
        where: { id: { in: commissionIds } },
        select: { affiliateId: true, commissionAmount: true },
      });

      const affiliateUpdates = orders.reduce(
        (acc, order) => {
          if (!acc[order.affiliateId]) {
            acc[order.affiliateId] = 0;
          }
          acc[order.affiliateId] += order.commissionAmount;
          return acc;
        },
        {} as Record<string, number>
      );

      await Promise.all(
        Object.entries(affiliateUpdates).map(([affiliateId, amount]) =>
          prisma.affiliateProfile.update({
            where: { id: affiliateId },
            data: { totalEarnings: { increment: amount } },
          })
        )
      );
    }

    res.json({ updated: result.count });
  } catch (error) {
    console.error("Error bulk updating commission statuses:", error);
    res
      .status(500)
      .json({ error: "Failed to bulk update commission statuses" });
  }
});

// Get commission analytics
router.get("/analytics", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Only admins can access commission analytics" });
    }

    const { period = "30d" } = req.query;

    let dateFrom: Date;
    switch (period) {
      case "7d":
        dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const [
      totalCommissions,
      totalAmount,
      statusBreakdown,
      topAffiliates,
      dailyStats,
    ] = await Promise.all([
      prisma.affiliateOrder.count({
        where: { createdAt: { gte: dateFrom } },
      }),
      prisma.affiliateOrder.aggregate({
        where: { createdAt: { gte: dateFrom } },
        _sum: { commissionAmount: true },
      }),
      prisma.affiliateOrder.groupBy({
        by: ["status"],
        where: { createdAt: { gte: dateFrom } },
        _sum: { commissionAmount: true },
        _count: { id: true },
      }),
      prisma.affiliateOrder.groupBy({
        by: ["affiliateId"],
        where: { createdAt: { gte: dateFrom } },
        _sum: { commissionAmount: true },
        _count: { id: true },
        orderBy: { _sum: { commissionAmount: "desc" } },
        take: 10,
      }),
      prisma.affiliateOrder.groupBy({
        by: ["createdAt"],
        where: { createdAt: { gte: dateFrom } },
        _sum: { commissionAmount: true },
        _count: { id: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Get affiliate details for top affiliates
    const topAffiliateIds = topAffiliates.map((a) => a.affiliateId);
    const affiliateDetails = await prisma.affiliateProfile.findMany({
      where: { id: { in: topAffiliateIds } },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    const topAffiliatesWithDetails = topAffiliates.map((affiliate) => {
      const details = affiliateDetails.find(
        (d) => d.id === affiliate.affiliateId
      );
      return {
        ...affiliate,
        affiliateName: details
          ? `${details.user.firstName} ${details.user.lastName}`
          : "Unknown",
        affiliateEmail: details?.user.email,
      };
    });

    res.json({
      period,
      totalCommissions,
      totalAmount: totalAmount._sum.commissionAmount || 0,
      statusBreakdown,
      topAffiliates: topAffiliatesWithDetails,
      dailyStats,
    });
  } catch (error) {
    console.error("Error fetching commission analytics:", error);
    res.status(500).json({ error: "Failed to fetch commission analytics" });
  }
});

// Update affiliate commission rates
router.patch(
  "/affiliate/:affiliateId/rate",
  authenticateToken,
  async (req: any, res) => {
    try {
      if (req.user.role !== "ADMIN") {
        return res
          .status(403)
          .json({ error: "Only admins can update commission rates" });
      }

      const schema = z.object({
        commissionRate: z.number().min(0).max(100),
        reason: z.string().optional(),
      });

      const { commissionRate, reason } = schema.parse(req.body);
      const { affiliateId } = req.params;

      const affiliate = await prisma.affiliateProfile.update({
        where: { id: affiliateId },
        data: { commissionRate },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Log the rate change
      await prisma.activity.create({
        data: {
          action: "COMMISSION_RATE_CHANGE",
          resource: "AFFILIATE_PROFILE",
          details: {
            description: `Commission rate changed to ${commissionRate}%${reason ? ` - ${reason}` : ""}`,
            oldRate: affiliate.commissionRate,
            newRate: commissionRate,
            reason,
          },
          userId: req.user.id,
        },
      });

      res.json(affiliate);
    } catch (error) {
      console.error("Error updating commission rate:", error);
      res.status(500).json({ error: "Failed to update commission rate" });
    }
  }
);

export default router;
