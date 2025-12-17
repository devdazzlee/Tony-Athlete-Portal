import express, { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { PrismaClient, PaymentMethod } from "@prisma/client";
import { z } from "zod";

const router: Router = express.Router();
const prisma = new PrismaClient();

const ALLOWED_PAYMENT_METHODS: PaymentMethod[] = [
  "PAYPAL",
  "STRIPE",
  "BANK_TRANSFER",
  "CRYPTO",
  "WISE",
];

function normalizePaymentMethod(method: string): PaymentMethod {
  const normalized = method.toUpperCase().replace(/\s+/g, "_") as PaymentMethod;

  if (!ALLOWED_PAYMENT_METHODS.includes(normalized)) {
    throw new Error("Invalid payout method");
  }

  return normalized;
}

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
    console.warn("Failed to parse bank account settings", error);
  }

  return {
    bankDetails: null as Record<string, any> | null,
    payoutFrequency: null as string | null,
    minimumPayout: null as number | null,
  };
}

async function buildAffiliatePayoutSettings(affiliate: any) {
  const bankData = parseBankAccountData(affiliate.bankAccount);

  const [lastPayout, nextPendingOrder] = await Promise.all([
    prisma.payout.findFirst({
      where: { affiliateId: affiliate.id, status: "COMPLETED" },
      orderBy: { processedAt: "desc" },
    }),
    prisma.affiliateOrder.findFirst({
      where: {
        affiliateId: affiliate.id,
        commissionAmount: { gt: 0 },
        status: {
          in: ["PENDING", "APPROVED"],
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const nextPayoutDate = nextPendingOrder
    ? new Date(nextPendingOrder.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;

  return {
    minimumPayout: bankData.minimumPayout ?? 50.0,
    payoutMethod: formatPayoutMethod(affiliate.paymentMethod),
    payoutEmail: affiliate.paymentEmail || affiliate.user?.email || "",
    payoutFrequency: bankData.payoutFrequency || "Monthly",
    bankDetails: bankData.bankDetails,
    lastPayoutDate: lastPayout?.processedAt || lastPayout?.createdAt || null,
    nextPayoutDate: nextPayoutDate ? nextPayoutDate.toISOString() : null,
    taxInfo: {
      taxId: affiliate.taxId || "",
      businessName: affiliate.companyName || "",
      address: affiliate.address || null,
    },
    notifications: {
      payoutProcessed: true,
      payoutPending: true,
      payoutFailed: true,
    },
  };
}

// Get pending commissions
router.get("/pending", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 20,
      status = "PENDING",
      period = "30d",
    } = req.query;

    const statusParam =
      typeof status === "string" ? status.toUpperCase() : "PENDING";
    const periodParam =
      typeof period === "string" ? period.toLowerCase() : "30d";

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
      include: {
        user: true,
      },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // Determine period filter
    const periodDaysMap: Record<string, number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "180d": 180,
      all: 0,
    };

    const periodDays = periodDaysMap[periodParam] ?? 30;
    const dateFilter =
      periodDays > 0
        ? {
            gte: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000),
          }
        : undefined;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Build base filter for affiliate orders
    const baseWhere: any = {
      affiliateId: affiliate.id,
      commissionAmount: { gt: 0 },
    };

    if (dateFilter) {
      baseWhere.createdAt = dateFilter;
    }

    if (statusParam !== "ALL") {
      baseWhere.status = statusParam;
    }

    // Get commissions from AffiliateOrder table
    const commissions = await prisma.affiliateOrder.findMany({
      where: baseWhere,
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit as string),
    });

    const total = await prisma.affiliateOrder.count({
      where: baseWhere,
    });

    // Format commissions data
    const formattedCommissions = commissions.map((commission, index) => ({
      id: `COMM-${String(commission.id).slice(-6).toUpperCase()}`,
      date: commission.createdAt.toISOString().split("T")[0],
      customer: commission.customerEmail || "Anonymous",
      offer: commission.referralCode || "Direct",
      saleAmount: commission.orderValue || 0,
      commissionRate: commission.commissionRate,
      commissionAmount: commission.commissionAmount || 0,
      status: commission.status.toLowerCase(),
      expectedPayout: new Date(
        commission.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split("T")[0],
      referralCode: commission.referralCode || "N/A",
      type: "Product", // Based on your schema, all affiliate orders are product sales
    }));

    // Summary metrics
    const [pendingSummary, approvedSummary, paidSummary] = await Promise.all([
      prisma.affiliateOrder.aggregate({
        where: {
          affiliateId: affiliate.id,
          status: "PENDING",
          commissionAmount: { gt: 0 },
        },
        _sum: { commissionAmount: true, orderValue: true },
        _count: { id: true },
      }),
      prisma.affiliateOrder.aggregate({
        where: {
          affiliateId: affiliate.id,
          status: "APPROVED",
          commissionAmount: { gt: 0 },
        },
        _sum: { commissionAmount: true, orderValue: true },
        _count: { id: true },
      }),
      prisma.affiliateOrder.aggregate({
        where: {
          affiliateId: affiliate.id,
          status: "PAID",
          commissionAmount: { gt: 0 },
        },
        _sum: { commissionAmount: true, orderValue: true },
        _count: { id: true },
      }),
    ]);

    const nextPendingOrder = await prisma.affiliateOrder.findFirst({
      where: {
        affiliateId: affiliate.id,
        commissionAmount: { gt: 0 },
        status: {
          in: ["PENDING", "APPROVED"],
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const nextPayoutDate = nextPendingOrder
      ? new Date(
          nextPendingOrder.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000
        )
      : null;

    const bankData = parseBankAccountData(affiliate.bankAccount);
    const summary = {
      pendingAmount: pendingSummary._sum.commissionAmount || 0,
      pendingCount: pendingSummary._count.id || 0,
      approvedAmount: approvedSummary._sum.commissionAmount || 0,
      approvedCount: approvedSummary._count.id || 0,
      paidAmount: paidSummary._sum.commissionAmount || 0,
      paidCount: paidSummary._count.id || 0,
      nextPayoutDate: nextPayoutDate ? nextPayoutDate.toISOString() : null,
      nextPayoutAmount: pendingSummary._sum.commissionAmount || 0,
      payoutMethod: formatPayoutMethod(affiliate.paymentMethod),
      payoutEmail: affiliate.paymentEmail || affiliate.user?.email || "",
      payoutFrequency: bankData.payoutFrequency || "Monthly",
      minimumPayout: bankData.minimumPayout ?? 50,
      currency: commissions[0]?.currency || "USD",
      bankDetails: bankData.bankDetails || null,
    };

    res.json({
      data: formattedCommissions,
      summary,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error("Error fetching pending commissions:", error);
    res.status(500).json({ error: "Failed to fetch pending commissions" });
  }
});

function formatPayoutMethod(method: string) {
  return method
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Get payout history
router.get("/history", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, startDate, endDate } = req.query;

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
      include: {
        user: true,
      },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    const parsedPage = Math.max(parseInt(page as string), 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit as string), 1), 50);
    const skip = (parsedPage - 1) * parsedLimit;

    const whereClause: any = {
      affiliateId: affiliate.id,
      status: "PAID",
      commissionAmount: { gt: 0 },
    };

    if (startDate && typeof startDate === "string") {
      whereClause.updatedAt = {
        ...(whereClause.updatedAt || {}),
        gte: new Date(startDate),
      };
    }

    if (endDate && typeof endDate === "string") {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      whereClause.updatedAt = {
        ...(whereClause.updatedAt || {}),
        lte: end,
      };
    }

    const [paidOrders, total] = await Promise.all([
      prisma.affiliateOrder.findMany({
        where: whereClause,
        orderBy: { updatedAt: "desc" },
        skip,
        take: parsedLimit,
      }),
      prisma.affiliateOrder.count({
        where: whereClause,
      }),
    ]);

    const totalPaidAggregate = await prisma.affiliateOrder.aggregate({
      where: {
        affiliateId: affiliate.id,
        status: "PAID",
      },
      _sum: { commissionAmount: true },
    });

    const formattedHistory = paidOrders.map((order) => ({
      id: `COMM-${String(order.id).slice(-6).toUpperCase()}`,
      date: order.createdAt.toISOString().split("T")[0],
      orderId: order.orderId,
      referralCode: order.referralCode || "N/A",
      saleAmount: order.orderValue || 0,
      commissionRate: order.commissionRate,
      commissionAmount: order.commissionAmount || 0,
      payoutDate:
        order.status === "PAID" && order.updatedAt
          ? order.updatedAt.toISOString().split("T")[0]
          : null,
      currency: order.currency || "USD",
      paymentMethod: formatPayoutMethod(affiliate.paymentMethod),
      payoutEmail: affiliate.paymentEmail || affiliate.user?.email || "",
      status: (order.status || "PAID").toLowerCase(),
    }));

    res.json({
      data: formattedHistory,
      totals: {
        paidAmount: totalPaidAggregate._sum.commissionAmount || 0,
        count: total,
        currency: formattedHistory[0]?.currency || "USD",
      },
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.max(Math.ceil(total / parsedLimit), 1),
      },
    });
  } catch (error) {
    console.error("Error fetching payout history:", error);
    res.status(500).json({ error: "Failed to fetch payout history" });
  }
});

// Get payout settings
router.get("/settings", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
      include: { user: true },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    const payoutSettings = await buildAffiliatePayoutSettings(affiliate);

    res.json(payoutSettings);
  } catch (error) {
    console.error("Error fetching payout settings:", error);
    res.status(500).json({ error: "Failed to fetch payout settings" });
  }
});

// Update payout settings
router.put("/settings", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
      include: { user: true },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    const settingsSchema = z.object({
      payoutMethod: z.string().min(1, "Payout method is required"),
      payoutEmail: z.string().email(),
      payoutFrequency: z
        .enum(["Monthly", "Bi-Weekly", "Weekly", "Quarterly"])
        .optional()
        .default("Monthly"),
      minimumPayout: z.number().min(0).optional().default(50),
      bankDetails: z
        .object({
          accountHolder: z.string().min(1, "Account holder is required"),
          bankName: z.string().optional(),
          accountNumber: z.string().min(1, "Account number is required"),
          routingNumber: z.string().optional(),
          swiftCode: z.string().optional(),
          iban: z.string().optional(),
          currency: z.string().optional(),
          notes: z.string().optional(),
          address: z.string().optional(),
        })
        .nullable()
        .optional(),
    });

    let validatedData;
    try {
      validatedData = settingsSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid payout settings",
          details: error.errors,
        });
      }
      throw error;
    }

    let normalizedMethod: PaymentMethod;
    try {
      normalizedMethod = normalizePaymentMethod(validatedData.payoutMethod);
    } catch (error: any) {
      return res
        .status(400)
        .json({ error: error.message || "Invalid payout method" });
    }

    const bankPayload = {
      payoutFrequency: validatedData.payoutFrequency || "Monthly",
      minimumPayout: validatedData.minimumPayout ?? 50,
      bankDetails: validatedData.bankDetails || null,
    };

    const updatedAffiliate = await prisma.affiliateProfile.update({
      where: { id: affiliate.id },
      data: {
        paymentMethod: normalizedMethod,
        paymentEmail: validatedData.payoutEmail,
        bankAccount: JSON.stringify(bankPayload),
        updatedAt: new Date(),
      },
      include: { user: true },
    });

    const payoutSettings = await buildAffiliatePayoutSettings(updatedAffiliate);

    res.json(payoutSettings);
  } catch (error) {
    console.error("Error updating payout settings:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid input data",
        details: error.errors,
      });
    }
    res.status(500).json({ error: "Failed to update payout settings" });
  }
});

// Request payout
router.post("/request-payout", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { amount, reason } = req.body;

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // Get total pending commissions from AffiliateOrder table
    const totalPending = await prisma.affiliateOrder.aggregate({
      where: {
        affiliateId: affiliate.id,
        status: "PENDING",
        commissionAmount: { gt: 0 },
      },
      _sum: { commissionAmount: true },
    });

    const availableAmount = totalPending._sum.commissionAmount || 0;

    if (amount > availableAmount) {
      return res.status(400).json({
        error: "Requested amount exceeds available balance",
        availableAmount,
      });
    }

    if (amount < 50) {
      return res.status(400).json({
        error: "Minimum payout amount is $50",
        minimumAmount: 50,
      });
    }

    // Create payout request in the database
    const payoutRequest = await prisma.payout.create({
      data: {
        affiliateId: affiliate.id,
        amount: parseFloat(amount),
        method: affiliate.paymentMethod,
        status: "PENDING",
        referenceId: reason || "Payout request",
      },
    });

    res.json({
      message: "Payout request submitted successfully",
      payoutRequest: {
        id: `PAY-${String(payoutRequest.id).slice(-6).toUpperCase()}`,
        affiliateId: payoutRequest.affiliateId,
        amount: payoutRequest.amount,
        status: payoutRequest.status.toLowerCase(),
        requestedAt: payoutRequest.createdAt,
        reason: payoutRequest.referenceId,
      },
    });
  } catch (error) {
    console.error("Error creating payout request:", error);
    res.status(500).json({ error: "Failed to create payout request" });
  }
});

// Get commission analytics
router.get("/analytics", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { period = "30d" } = req.query;

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get commission analytics from AffiliateOrder table
    const [
      totalCommissions,
      totalAmount,
      pendingOrders,
      approvedOrders,
      paidOrders,
    ] = await Promise.all([
      // Total commissions
      prisma.affiliateOrder.count({
        where: {
          affiliateId: affiliate.id,
          createdAt: { gte: startDate },
          commissionAmount: { gt: 0 },
        },
      }),

      // Total amount
      prisma.affiliateOrder.aggregate({
        where: {
          affiliateId: affiliate.id,
          createdAt: { gte: startDate },
          commissionAmount: { gt: 0 },
        },
        _sum: { commissionAmount: true },
      }),

      // Pending status breakdown
      prisma.affiliateOrder.aggregate({
        where: {
          affiliateId: affiliate.id,
          status: "PENDING",
          createdAt: { gte: startDate },
        },
        _sum: { commissionAmount: true },
        _count: { id: true },
      }),

      // Approved status breakdown
      prisma.affiliateOrder.aggregate({
        where: {
          affiliateId: affiliate.id,
          status: "APPROVED",
          createdAt: { gte: startDate },
        },
        _sum: { commissionAmount: true },
        _count: { id: true },
      }),

      // Paid status breakdown
      prisma.affiliateOrder.aggregate({
        where: {
          affiliateId: affiliate.id,
          status: "PAID",
          createdAt: { gte: startDate },
        },
        _sum: { commissionAmount: true },
        _count: { id: true },
      }),
    ]);

    // Format status breakdown
    const statusBreakdown = [
      {
        status: "PENDING",
        _sum: { amount: pendingOrders._sum.commissionAmount || 0 },
        _count: { id: pendingOrders._count.id },
      },
      {
        status: "APPROVED",
        _sum: { amount: approvedOrders._sum.commissionAmount || 0 },
        _count: { id: approvedOrders._count.id },
      },
      {
        status: "PAID",
        _sum: { amount: paidOrders._sum.commissionAmount || 0 },
        _count: { id: paidOrders._count.id },
      },
    ];

    // Get daily stats
    const dailyStats = [];
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const dayCommissions = await prisma.affiliateOrder.count({
        where: {
          affiliateId: affiliate.id,
          createdAt: { gte: startOfDay, lte: endOfDay },
          commissionAmount: { gt: 0 },
        },
      });

      const dayAmount = await prisma.affiliateOrder.aggregate({
        where: {
          affiliateId: affiliate.id,
          createdAt: { gte: startOfDay, lte: endOfDay },
          commissionAmount: { gt: 0 },
        },
        _sum: { commissionAmount: true },
      });

      dailyStats.push({
        createdAt: startOfDay.toISOString(),
        _sum: { amount: dayAmount._sum.commissionAmount || 0 },
        _count: { id: dayCommissions },
      });
    }

    const analytics = {
      period,
      totalCommissions,
      totalAmount: totalAmount._sum.commissionAmount || 0,
      statusBreakdown,
      dailyStats,
      topAffiliates: [], // This would be relevant for admin, not affiliate
    };

    res.json(analytics);
  } catch (error) {
    console.error("Error fetching commission analytics:", error);
    res.status(500).json({ error: "Failed to fetch commission analytics" });
  }
});

export default router;
