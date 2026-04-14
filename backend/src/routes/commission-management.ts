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

const affiliateTotalsQuerySchema = z.object({
  affiliateId: z.string(),
});

const manualCommissionSchema = z.object({
  affiliateId: z.string().min(1),
  amount: z.number().positive(),
  source: z.string().optional(),
  notes: z.string().optional(),
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
        where.affiliate = {
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
        };
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
          orderId: order.orderId,
          amount: order.commissionAmount,
          rate: order.commissionRate,
          status: order.status,
          createdAt: order.createdAt,
          payoutDate: order.paidAt ? order.paidAt : undefined,
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

// Get totals for an affiliate (commissions + payouts)
router.get("/affiliate-totals", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Only admins can access affiliate totals" });
    }

    const { affiliateId } = affiliateTotalsQuerySchema.parse(req.query);

    const [
      pendingCommissions,
      approvedCommissions,
      paidCommissions,
      paidPayouts,
      pendingPayouts,
    ] = await Promise.all([
      prisma.affiliateOrder.aggregate({
        where: {
          affiliateId,
          status: "PENDING",
        },
        _sum: { commissionAmount: true },
        _count: { id: true },
      }),
      prisma.affiliateOrder.aggregate({
        where: {
          affiliateId,
          status: "APPROVED",
        },
        _sum: { commissionAmount: true },
        _count: { id: true },
      }),
      prisma.affiliateOrder.aggregate({
        where: {
          affiliateId,
          status: "PAID",
        },
        _sum: { commissionAmount: true },
        _count: { id: true },
      }),
      prisma.payout.aggregate({
        where: {
          affiliateId,
          status: "COMPLETED",
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.payout.aggregate({
        where: {
          affiliateId,
          status: { in: ["PENDING", "PROCESSING"] },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    return res.json({
      affiliateId,
      commissions: {
        pendingCount: pendingCommissions._count.id || 0,
        pendingAmount: pendingCommissions._sum.commissionAmount || 0,
        approvedCount: approvedCommissions._count.id || 0,
        approvedAmount: approvedCommissions._sum.commissionAmount || 0,
        paidCount: paidCommissions._count.id || 0,
        paidAmount: paidCommissions._sum.commissionAmount || 0,
      },
      payouts: {
        paidCount: paidPayouts._count.id || 0,
        paidAmount: paidPayouts._sum.amount || 0,
        pendingCount: pendingPayouts._count.id || 0,
        pendingAmount: pendingPayouts._sum.amount || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching affiliate totals:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid query parameters" });
    }
    return res.status(500).json({ error: "Failed to fetch affiliate totals" });
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

    const existing = await prisma.affiliateOrder.findUnique({
      where: { id },
      select: {
        id: true,
        affiliateId: true,
        status: true,
        commissionAmount: true,
        approvedAt: true,
        paidAt: true,
        orderValue: true,
        commissionRate: true,
        referralCode: true,
        orderId: true,
        createdAt: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Commission not found" });
    }

    const now = new Date();
    const wasApprovedLike =
      existing.status === "APPROVED" || existing.status === "PAID";
    const willBeApprovedLike = status === "APPROVED" || status === "PAID";

    const shouldSetApprovedAt =
      (status === "APPROVED" || status === "PAID") && !existing.approvedAt;
    const shouldSetPaidAt = status === "PAID" && !existing.paidAt;

    const earningsDelta =
      !wasApprovedLike && willBeApprovedLike
        ? existing.commissionAmount
        : wasApprovedLike && !willBeApprovedLike
          ? -existing.commissionAmount
          : 0;

    // Update AffiliateOrder status (real commission data)
    const orderUpdateData: any = {
      status,
      updatedAt: now,
    };
    if (shouldSetApprovedAt) orderUpdateData.approvedAt = now;
    if (shouldSetPaidAt) orderUpdateData.paidAt = now;

    const order = await prisma.affiliateOrder.update({
      where: { id },
      data: orderUpdateData,
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

    if (earningsDelta !== 0) {
      await prisma.affiliateProfile.update({
        where: { id: order.affiliateId },
        data: {
          totalEarnings: { increment: earningsDelta },
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
      approvedAt: order.approvedAt,
      paidAt: order.paidAt,
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

    const now = new Date();

    const existingOrders = await prisma.affiliateOrder.findMany({
      where: { id: { in: commissionIds } },
      select: {
        id: true,
        affiliateId: true,
        status: true,
        commissionAmount: true,
        approvedAt: true,
        paidAt: true,
      },
    });

    const ordersById = new Map(existingOrders.map((o) => [o.id, o]));

    const updates = commissionIds
      .map((id) => {
        const existing = ordersById.get(id);
        if (!existing) return null;

        const wasApprovedLike = existing.status === "APPROVED" || existing.status === "PAID";
        const willBeApprovedLike = status === "APPROVED" || status === "PAID";

        const shouldSetApprovedAt =
          (status === "APPROVED" || status === "PAID") && !existing.approvedAt;
        const shouldSetPaidAt = status === "PAID" && !existing.paidAt;

        const earningsDelta =
          !wasApprovedLike && willBeApprovedLike
            ? existing.commissionAmount
            : wasApprovedLike && !willBeApprovedLike
              ? -existing.commissionAmount
              : 0;

        return {
          id,
          affiliateId: existing.affiliateId,
          earningsDelta,
          data: {
            status,
            updatedAt: now,
            ...(shouldSetApprovedAt ? { approvedAt: now } : {}),
            ...(shouldSetPaidAt ? { paidAt: now } : {}),
          } as const,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      affiliateId: string;
      earningsDelta: number;
      data: {
        status: string;
        updatedAt: Date;
        approvedAt?: Date;
        paidAt?: Date;
      };
    }>;

    const affiliateEarningsDeltas = updates.reduce((acc, u) => {
      if (!u.earningsDelta) return acc;
      acc[u.affiliateId] = (acc[u.affiliateId] || 0) + u.earningsDelta;
      return acc;
    }, {} as Record<string, number>);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await Promise.all(
        updates.map((u) =>
          tx.affiliateOrder.update({
            where: { id: u.id },
            data: u.data,
          })
        )
      );

      await Promise.all(
        Object.entries(affiliateEarningsDeltas).map(([affiliateId, delta]) =>
          tx.affiliateProfile.update({
            where: { id: affiliateId },
            data: { totalEarnings: { increment: delta } },
          })
        )
      );

      return { count: updated.length };
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

    let dateFrom: Date | null;
    switch (period) {
      case "all":
        dateFrom = null;
        break;
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

    const whereCreatedAt = dateFrom ? { createdAt: { gte: dateFrom } } : {};

    const [
      totalCommissions,
      totalAmount,
      statusBreakdown,
      topAffiliates,
      dailyStats,
    ] = await Promise.all([
      prisma.affiliateOrder.count({
        where: whereCreatedAt,
      }),
      prisma.affiliateOrder.aggregate({
        where: whereCreatedAt,
        _sum: { commissionAmount: true },
      }),
      prisma.affiliateOrder.groupBy({
        by: ["status"],
        where: whereCreatedAt,
        _sum: { commissionAmount: true },
        _count: { id: true },
      }),
      prisma.affiliateOrder.groupBy({
        by: ["affiliateId"],
        where: whereCreatedAt,
        _sum: { commissionAmount: true },
        _count: { id: true },
        orderBy: { _sum: { commissionAmount: "desc" } },
        take: 10,
      }),
      prisma.affiliateOrder.groupBy({
        by: ["createdAt"],
        where: whereCreatedAt,
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

router.post("/manual", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN" && req.user.role !== "MANAGER") {
      return res.status(403).json({
        error: "Only admins and managers can add manual commissions",
      });
    }

    const data = manualCommissionSchema.parse(req.body);
    const affiliate = await prisma.affiliateProfile.findUnique({
      where: { id: data.affiliateId },
    });
    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate not found" });
    }

    const stamp = Date.now();
    const order = await prisma.affiliateOrder.create({
      data: {
        affiliateId: data.affiliateId,
        referralCode: "MANUAL_ADJUSTMENT",
        storeId: "manual",
        orderId: `manual-${stamp}`,
        customerName: "Manual Commission",
        customerEmail: "manual@system.local",
        orderValue: data.amount,
        currency: "USD",
        commissionRate: 100,
        commissionAmount: data.amount,
        status: "APPROVED",
        note: data.notes || data.source || "Manually added by admin",
      },
    });

    res.json({
      success: true,
      message: "Manual commission added successfully",
      order,
    });
  } catch (error) {
    console.error("Error adding manual commission:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid request data",
        details: error.errors,
      });
    }
    res.status(500).json({ error: "Failed to add manual commission" });
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
