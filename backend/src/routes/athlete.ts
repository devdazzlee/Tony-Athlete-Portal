import express, { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import shopifyService from "../services/ShopifyService";
import { getCommissionableValue } from "../utils/orderValue";

const router: Router = express.Router();
const prisma = new PrismaClient();

// Default commission rate (10%)
const DEFAULT_COMMISSION_RATE = 0.10;

/**
 * Normalize affiliate codes to include all case variants for case-insensitive matching.
 * Shopify may store discount codes with different casing than what we have in the DB.
 */
function normalizeCodesForMatching(codes: string[]): string[] {
  return [
    ...new Set([
      ...codes,
      ...codes.map(c => c.toUpperCase()),
      ...codes.map(c => c.toLowerCase()),
    ])
  ];
}

// All routes require authentication
router.use(authenticateToken);

// Get athlete profile with social media and discount code
router.get("/profile", async (req: any, res) => {
  try {
    const userId = req.user.id;

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        referralCodes: {
          where: { isActive: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
        tierAssignments: {
          where: {
            status: "ACTIVE",
          },
          include: {
            tier: true,
          },
          orderBy: {
            assignedAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    const socialMedia = affiliate.socialMedia as any || {};
    
    // Get audience-facing discount codes (exclude personal allowance codes)
    const coupons = await prisma.coupon.findMany({
      where: {
        affiliateId: affiliate.id,
        status: "ACTIVE",
        isAffiliate: false,
        validUntil: { gt: new Date() },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format discount codes with descriptions
    const discountCodes = coupons.map((coupon) => {
      const discountValue = parseFloat((coupon.discount || "").replace(/[^0-9.]/g, "")) || 0;
      const isFixedAmount =
        coupon.discount.includes("$") || /\$\s*\d+/.test(coupon.description || "");
      const valueText = discountValue > 0
        ? isFixedAmount
          ? `$${discountValue} off`
          : `${discountValue}% off`
        : "";
      const shippingText = coupon.freeShipping ? "Free Shipping" : "";
      const combinedValue = [valueText, shippingText].filter(Boolean).join(" + ");

      return {
        code: coupon.code,
        value: combinedValue || "No discount",
        description: coupon.description,
        freeShipping: coupon.freeShipping,
      };
    });

    // Get tier information from assignment
    const activeTierAssignment = affiliate.tierAssignments?.[0];
    const assignedTier = activeTierAssignment?.tier;
    
    // Parse tier benefits if available
    let tierBenefits = [];
    if (assignedTier?.benefits) {
      try {
        tierBenefits = typeof assignedTier.benefits === 'string' 
          ? JSON.parse(assignedTier.benefits) 
          : assignedTier.benefits;
      } catch (e) {
        tierBenefits = [];
      }
    }

    res.json({
      instagram: socialMedia.instagram || null,
      tiktok: socialMedia.tiktok || null,
      other: socialMedia.other || null,
      discountCodes,
      spendingLimit: affiliate.spendingLimit ? `$${affiliate.spendingLimit.toFixed(2)}` : "Not Set",
      deliverablesNote: affiliate.deliverablesNote || null,
      tier: assignedTier ? {
        name: assignedTier.name,
        description: assignedTier.description,
        level: assignedTier.level,
        commissionRate: assignedTier.commissionRate,
        benefits: tierBenefits,
      } : null,
      // Fallback to enum tier if no assignment
      tierName: assignedTier?.name || affiliate.tier,
      commissionRate: affiliate.commissionRate || (assignedTier?.commissionRate || 0),
    });
  } catch (error) {
    console.error("Error fetching athlete profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Update athlete social media handles
router.put("/profile/social", async (req: any, res) => {
  try {
    const userId = req.user.id;

    const schema = z.object({
      instagram: z.string().trim().optional().nullable(),
      tiktok: z.string().trim().optional().nullable(),
      other: z.string().trim().optional().nullable(),
    });

    const data = schema.parse(req.body);

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
      select: {
        id: true,
        socialMedia: true,
      },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    const currentSocial = (affiliate.socialMedia as any) || {};

    const normalizedInstagram =
      data.instagram == null || data.instagram === "" ? null : data.instagram;
    const normalizedTiktok =
      data.tiktok == null || data.tiktok === "" ? null : data.tiktok;
    const normalizedOther =
      data.other == null || data.other === "" ? null : data.other;

    const updated = await prisma.affiliateProfile.update({
      where: { id: affiliate.id },
      data: {
        socialMedia: {
          ...(currentSocial || {}),
          instagram: normalizedInstagram,
          tiktok: normalizedTiktok,
          other: normalizedOther,
        } as any,
      },
      select: {
        socialMedia: true,
      },
    });

    const updatedSocial = (updated.socialMedia as any) || {};

    return res.json({
      success: true,
      instagram: updatedSocial.instagram || null,
      tiktok: updatedSocial.tiktok || null,
      other: updatedSocial.other || null,
    });
  } catch (error) {
    console.error("Error updating athlete social media:", error);
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Invalid input data", details: error.errors });
    }
    return res.status(500).json({ error: "Failed to update social media" });
  }
});

// Get athlete's discount codes/coupons
router.get("/coupons", async (req: any, res) => {
  try {
    const userId = req.user.id;

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // Get ALL active coupons (discount codes) assigned to this affiliate
    const coupons = await prisma.coupon.findMany({
      where: {
        affiliateId: affiliate.id,
        status: "ACTIVE",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      coupons: coupons.map((coupon) => ({
        id: coupon.id,
        code: coupon.code,
        discount: coupon.discount,
        description: coupon.description,
        freeShipping: coupon.freeShipping,
        status: coupon.status,
      })),
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
});

// Get athlete performance data
router.get("/performance", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { dateRange = "yesterday" } = req.query;

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
      include: {
        coupons: {
          where: { status: "ACTIVE" },
        },
      },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // No early return when coupons are empty — orders are linked by affiliateId,
    // not by coupon codes. The affiliate may have orders without active coupons.

    // Calculate date ranges
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (dateRange) {
      case "yesterday":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        previousEndDate = new Date(startDate);
        previousEndDate.setHours(23, 59, 59, 999);
        break;
      case "last_7_days":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousEndDate = new Date(startDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        previousEndDate.setHours(23, 59, 59, 999);
        break;
      case "last_30_days":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 30);
        previousEndDate = new Date(startDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        previousEndDate.setHours(23, 59, 59, 999);
        break;
      case "last_6_months":
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 6);
        previousStartDate = new Date(startDate);
        previousStartDate.setMonth(previousStartDate.getMonth() - 6);
        previousEndDate = new Date(startDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        previousEndDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        previousEndDate = new Date(startDate);
        previousEndDate.setHours(23, 59, 59, 999);
    }

    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    // Get commission rate
    const commissionRate = (affiliate.commissionRate || 10) / 100;

    // Query orders by affiliateId only — no need to cross-check referralCode
    const currentOrdersWhere = {
      affiliateId: affiliate.id,
      orderCreatedAt: { gte: startDate, lte: endDate },
      status: { not: "CANCELLED" },
    };

    const previousOrdersWhere = {
      affiliateId: affiliate.id,
      orderCreatedAt: { gte: previousStartDate, lte: previousEndDate },
      status: { not: "CANCELLED" },
    };

    // Fetch orders from database (synced from Shopify)
    const [currentOrders, previousOrders] = await Promise.all([
      prisma.affiliateOrder.findMany({
        where: currentOrdersWhere,
        orderBy: { orderCreatedAt: "asc" },
      }),
      prisma.affiliateOrder.findMany({
        where: previousOrdersWhere,
      }),
    ]);

    // Calculate current period stats
    const currentConversions = currentOrders.length;
    const currentCommissionAmount = currentOrders.reduce(
      (sum, order) => sum + order.commissionAmount,
      0
    );

    // Calculate previous period stats
    const previousConversions = previousOrders.length;
    const previousCommissionAmount = previousOrders.reduce(
      (sum, order) => sum + order.commissionAmount,
      0
    );

    // Calculate change percentages
    const conversionChange = previousConversions > 0
      ? ((currentConversions - previousConversions) / previousConversions) * 100
      : currentConversions > 0 ? 100 : 0;

    const commissionChange = previousCommissionAmount > 0
      ? ((currentCommissionAmount - previousCommissionAmount) / previousCommissionAmount) * 100
      : currentCommissionAmount > 0 ? 100 : 0;

    // Generate chart data based on date range
    let chartData: any[] = [];
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 7) {
      // Group by day
      const grouped = new Map<string, typeof currentOrders>();
      currentOrders.forEach(order => {
        const date = new Date(order.orderCreatedAt || order.createdAt);
        const key = date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(order);
      });

      chartData = Array.from(grouped.entries()).map(([name, dayOrders]) => ({
        name,
        conversions: dayOrders.length,
        commission: dayOrders.reduce((sum, o) => sum + o.commissionAmount, 0),
      }));
    } else if (daysDiff <= 60) {
      // Group by week
      const grouped = new Map<string, typeof currentOrders>();
      currentOrders.forEach(order => {
        const date = new Date(order.orderCreatedAt || order.createdAt);
        const weekNum = Math.ceil(((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) / 7);
        const key = `Week ${weekNum}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(order);
      });

      chartData = Array.from(grouped.entries()).map(([name, weekOrders]) => ({
        name,
        conversions: weekOrders.length,
        commission: weekOrders.reduce((sum, o) => sum + o.commissionAmount, 0),
      }));
    } else {
      // Group by month
      const grouped = new Map<string, typeof currentOrders>();
      currentOrders.forEach(order => {
        const date = new Date(order.orderCreatedAt || order.createdAt);
        const key = date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(order);
      });

      chartData = Array.from(grouped.entries()).map(([name, monthOrders]) => ({
        name,
        conversions: monthOrders.length,
        commission: monthOrders.reduce((sum, o) => sum + o.commissionAmount, 0),
      }));
    }

    // Get currency from first order or default
    const currency = currentOrders[0]?.currency || "USD";
    const currencySymbol = currency === "CAD" ? "CA$" : currency === "GBP" ? "£" : "$";

    // Determine pending status
    const hasPendingOrders = currentOrders.some(o => o.status === "PENDING");
    const commissionEarned = `${currencySymbol}${currentCommissionAmount.toFixed(2)}${hasPendingOrders ? " (Pending)" : ""}`;

    // Get total discount code usage
    const discountCodeUsage = await prisma.affiliateOrder.count({
      where: { affiliateId: affiliate.id },
    });

    res.json({
      conversions: currentConversions,
      commissionEarned,
      conversionChange: Math.round(conversionChange * 10) / 10,
      commissionChange: Math.round(commissionChange * 10) / 10,
      currentDateRange: `${formatDate(startDate)} - ${formatDate(endDate)}`,
      previousPeriod: `${formatDate(previousStartDate)} - ${formatDate(previousEndDate)}`,
      conversionChartData: chartData.map(d => ({ name: d.name, value: d.conversions })),
      commissionChartData: chartData.map(d => ({ name: d.name, value: d.commission })),
      discountCodeUsage,
    });
  } catch (error) {
    console.error("Error fetching performance data:", error);
    res.status(500).json({ error: "Failed to fetch performance data" });
  }
});

// Submit deliverable
const deliverableSchema = z.object({
  month: z.string(),
  links: z.array(
    z.object({
      url: z.string().url(),
      platform: z.enum(["Instagram", "TikTok", "YouTube", "Other"]),
      customPlatformName: z.string().optional(), // Required when platform is "Other"
      photoUrl: z.string().url().optional(),
    })
  ),
});

router.post("/deliverables", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const data = deliverableSchema.parse(req.body);

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // Validate that customPlatformName is provided when platform is "Other"
    for (const link of data.links) {
      if (link.platform === "Other" && (!link.customPlatformName || link.customPlatformName.trim() === "")) {
        return res.status(400).json({ 
          error: "customPlatformName is required when platform is 'Other'",
          details: [{ path: ["links"], message: "Please specify the platform name when selecting 'Other'" }]
        });
      }
    }

    // Store deliverables in Activity table with approval status
    const deliverables = await Promise.all(
      data.links.map((link) =>
        prisma.activity.create({
          data: {
            userId,
            action: "deliverable_submitted",
            resource: "Deliverable",
            status: "PENDING", // Initial status for admin review
            details: {
              month: data.month,
              url: link.url,
              platform: link.platform === "Other" && link.customPlatformName 
                ? link.customPlatformName.trim() 
                : link.platform,
              originalPlatform: link.platform, // Keep track of original selection
              customPlatformName: link.platform === "Other" ? link.customPlatformName?.trim() : null,
              photoUrl: link.photoUrl || null,
            } as any,
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
          },
        })
      )
    );

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            type: "INFO",
            title: "New deliverable submission",
            message: `${affiliate.id} submitted ${data.links.length} deliverable(s) for ${data.month}.`,
            data: {
              affiliateId: affiliate.id,
              month: data.month,
              submittedCount: data.links.length,
              category: "DELIVERABLE_SUBMISSION",
            } as any,
          },
        })
      )
    );

    res.json({
      message: "Deliverables submitted successfully",
      deliverables,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error submitting deliverables:", error);
    res.status(500).json({ error: "Failed to submit deliverables" });
  }
});

// Get deliverables submissions
router.get("/deliverables", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { month } = req.query;

    const activities = await prisma.activity.findMany({
      where: {
        userId,
        action: "deliverable_submitted",
        ...(month && {
          details: {
            path: ["month"],
            equals: month,
          } as any,
        }),
      },
      orderBy: { createdAt: "desc" },
    });

    const submissions = activities.map((activity) => {
      const details = activity.details as any;
      // Use customPlatformName if available (for "Other" platform), otherwise use platform
      const displayPlatform = details.customPlatformName || details.platform;
      return {
        id: activity.id,
        date: formatDate(activity.createdAt),
        platform: displayPlatform,
        url: details.url,
        photoUrl: details.photoUrl || null,
        status: activity.status || "PENDING",
        adminComment: activity.adminComment || null,
        reviewedAt: activity.reviewedAt ? formatDate(activity.reviewedAt) : null,
      };
    });

    res.json(submissions);
  } catch (error) {
    console.error("Error fetching deliverables:", error);
    res.status(500).json({ error: "Failed to fetch deliverables" });
  }
});

// Submit feedback
const feedbackSchema = z.object({
  feedback: z.string().min(1),
  name: z.string().optional(),
  photoUrl: z.string().url().optional(),
  email: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().email().optional()
  ),
});

router.post("/feedback", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const data = feedbackSchema.parse(req.body);

    // Determine if submission is anonymous
    const hasName = data.name && data.name.trim().length > 0;
    const hasEmail = data.email && data.email.trim().length > 0;
    const isAnonymous = !hasName && !hasEmail;

    // Store feedback in Activity table
    const feedbackActivity = await prisma.activity.create({
      data: {
        userId,
        action: "feedback_submitted",
        resource: "Feedback",
        details: {
          feedback: data.feedback,
          photoUrl: data.photoUrl || null,
          anonymous: isAnonymous,
          name: hasName ? data.name?.trim() : undefined,
          email: hasEmail ? data.email?.trim() : undefined,
        } as any,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    await Promise.all(
      admins.map(async (admin) => {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: admin.id,
            title: "New affiliate feedback",
            data: {
              path: ["feedbackId"],
              equals: feedbackActivity.id,
            },
          } as any,
        });

        if (!existing) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              type: "INFO",
              title: "New affiliate feedback",
              message: `A new general feedback submission was received.`,
              data: {
                affiliateId: null,
                category: "GENERAL_FEEDBACK",
                hasPhoto: Boolean(data.photoUrl),
                feedbackId: feedbackActivity.id,
              } as any,
            },
          });
        }
      })
    );

    res.json({ message: "Feedback submitted successfully" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error submitting feedback:", error);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

router.get("/dashboard-notifications", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const activities = await prisma.activity.findMany({
      where: {
        userId,
        action: "deliverable_submitted",
        adminComment: { not: null },
      },
      orderBy: { reviewedAt: "desc" },
      take: 10,
    });

    const items = activities.map((activity) => {
      const details = (activity.details as any) || {};
      return {
        id: activity.id,
        type: "DELIVERABLE_COMMENT",
        title: "Deliverable review update",
        message: activity.adminComment || "Your deliverable has a new admin comment.",
        month: details.month || null,
        platform: details.customPlatformName || details.platform || null,
        reviewedAt: activity.reviewedAt,
      };
    });

    res.json({
      unreadCount: items.length,
      items,
    });
  } catch (error) {
    console.error("Error fetching dashboard notifications:", error);
    res.status(500).json({ error: "Failed to fetch dashboard notifications" });
  }
});

// Get orders list
router.get("/orders", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0, storeId } = req.query;

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
      include: {
        coupons: {
          where: { status: "ACTIVE" },
        },
      },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // Build where clause - query by affiliateId only
    const whereClause: any = { 
      affiliateId: affiliate.id,
    };
    if (storeId && storeId !== "all") {
      whereClause.storeId = storeId;
    }

    const orders = await prisma.affiliateOrder.findMany({
      where: whereClause,
      orderBy: { orderCreatedAt: "desc" },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    // Get store names mapping
    const stores = shopifyService.getAllStores();
    const storeMap = new Map(stores.map(s => [s.id, s.name]));

    const formattedOrders = orders.map((order) => {
      const currencySymbol = order.currency === "CAD" ? "CA$" : order.currency === "GBP" ? "£" : "$";
      const storeName = storeMap.get(order.storeId) || order.storeId;
      const shippingAddress = order.shippingAddress as any;

      return {
      id: order.orderId,
        shopifyOrderNumber: order.shopifyOrderNumber,
        placedOn: (order.orderCreatedAt || order.createdAt).toLocaleString(),
        orderTotal: `${currencySymbol}${order.orderValue.toFixed(2)}`,
        orderValue: order.orderValue,
        currency: order.currency,
      items: (order.items as any)?.length || 0,
        date: (order.orderCreatedAt || order.createdAt).toLocaleString(),
        storeId: order.storeId,
        store: storeName,
        status: order.status,
        financialStatus: order.financialStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        commission: `${currencySymbol}${order.commissionAmount.toFixed(2)}`,
        commissionAmount: order.commissionAmount,
        discountCode: order.referralCode,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
      shipping: {
          address: shippingAddress ? 
            `${shippingAddress.address1 || ""} ${shippingAddress.address2 || ""}, ${shippingAddress.city || ""}, ${shippingAddress.province || ""} ${shippingAddress.zip || ""}, ${shippingAddress.country || ""}`.trim() 
            : null,
        method: "Standard",
        timeframe: "3-5 Working Days",
      },
      orderItems: (order.items as any) || [],
      };
    });

    res.json(formattedOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Get single order details
router.get("/orders/:orderId", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    const order = await prisma.affiliateOrder.findFirst({
      where: {
        affiliateId: affiliate.id,
        orderId,
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Get store name
    const stores = shopifyService.getAllStores();
    const store = stores.find(s => s.id === order.storeId);
    const storeName = store?.name || order.storeId;

    const currencySymbol = order.currency === "CAD" ? "CA$" : order.currency === "GBP" ? "£" : "$";
    const shippingAddress = order.shippingAddress as any;

    const formattedOrder = {
      id: order.orderId,
      shopifyOrderNumber: order.shopifyOrderNumber,
      placedOn: (order.orderCreatedAt || order.createdAt).toLocaleString(),
      orderTotal: `${currencySymbol}${order.orderValue.toFixed(2)}`,
      subtotal: order.subtotalPrice ? `${currencySymbol}${order.subtotalPrice.toFixed(2)}` : null,
      tax: order.totalTax ? `${currencySymbol}${order.totalTax.toFixed(2)}` : null,
      orderValue: order.orderValue,
      currency: order.currency,
      items: (order.items as any)?.length || 0,
      date: (order.orderCreatedAt || order.createdAt).toLocaleString(),
      storeId: order.storeId,
      store: storeName,
      status: order.status,
      financialStatus: order.financialStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      commission: `${currencySymbol}${order.commissionAmount.toFixed(2)}`,
      commissionAmount: order.commissionAmount,
      commissionRate: `${order.commissionRate}%`,
      discountCode: order.referralCode,
      discountCodes: order.discountCodes,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      shipping: {
        address: shippingAddress ? 
          `${shippingAddress.address1 || ""} ${shippingAddress.address2 || ""}, ${shippingAddress.city || ""}, ${shippingAddress.province || ""} ${shippingAddress.zip || ""}, ${shippingAddress.country || ""}`.trim() 
          : null,
        firstName: shippingAddress?.first_name,
        lastName: shippingAddress?.last_name,
        city: shippingAddress?.city,
        province: shippingAddress?.province,
        country: shippingAddress?.country,
        zip: shippingAddress?.zip,
        method: "Standard",
        timeframe: "3-5 Working Days",
      },
      orderItems: ((order.items as any) || []).map((item: any) => ({
        name: item.title,
        variant: item.variant_title,
        quantity: item.quantity,
        price: `${currencySymbol}${parseFloat(item.price).toFixed(2)}`,
        sku: item.sku,
      })),
      note: order.note,
      tags: order.tags,
    };

    res.json(formattedOrder);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// Get social media stats
router.get("/socials", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { from, to } = req.query;

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    const socialMedia = affiliate.socialMedia as any || {};

    // Calculate dates
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Format dates for display
    const formatDateDisplay = (date: Date) => {
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    };

    // TODO: Replace hardcoded data with API data from database
    // For now, using hardcoded data - will be replaced with real API data later
    
    // Hardcoded data - to be replaced with database query
    const instagramCount = "41135";
    const tiktokCount = "118700";
    const instagramChangePrevious = "-3";
    const instagramChange7Days = "-18";
    const tiktokChangePrevious = "-100";
    const tiktokChange7Days = "-100";

    // Generate history data based on date range
    const startDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const endDate = to ? new Date(to) : now;

    // Generate daily data points for charts with realistic up/down variations
    const generateHistoryData = (baseCount: number, platform: string) => {
      const data = [];
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const points = Math.min(daysDiff, 30); // Max 30 points
      
      // Create realistic fluctuations - start near base and fluctuate up and down
      let currentCount = baseCount;
      const variationRange = Math.floor(baseCount * 0.08); // 8% variation range
      
      for (let i = 0; i < points; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + Math.floor((daysDiff / points) * i));
        
        // Create trend with randomness - sometimes go up, sometimes down
        // Use sine wave pattern with randomness for natural-looking fluctuations
        const sineWave = Math.sin((i / points) * Math.PI * 4) * 0.3; // Multiple waves
        const randomVariation = (Math.random() - 0.5) * 0.4; // Random component
        const trend = sineWave + randomVariation;
        
        // Apply variation to current count
        const change = Math.floor(trend * variationRange);
        currentCount = Math.max(
          baseCount - variationRange, 
          Math.min(baseCount + variationRange, currentCount + change)
        );
        
        data.push({
          date: date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
          followers: Math.floor(currentCount),
        });
      }
      return data;
    };

    res.json({
      instagram: {
        username: socialMedia.instagram || null,
        count: instagramCount,
        date: formatDateDisplay(now),
        changeVsPrevious: instagramChangePrevious,
        changeVs7Days: instagramChange7Days,
        previousDate: formatDateDisplay(yesterday),
        sevenDaysAgoDate: formatDateDisplay(sevenDaysAgo),
        history: generateHistoryData(parseInt(instagramCount), "instagram"),
      },
      tiktok: {
        username: socialMedia.tiktok || null,
        count: tiktokCount,
        date: formatDateDisplay(now),
        changeVsPrevious: tiktokChangePrevious,
        changeVs7Days: tiktokChange7Days,
        previousDate: formatDateDisplay(yesterday),
        sevenDaysAgoDate: formatDateDisplay(sevenDaysAgo),
        history: generateHistoryData(parseInt(tiktokCount), "tiktok"),
      },
      lastUpdated: `${formatDateDisplay(now)} at ${now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} (BST)`,
    });
  } catch (error) {
    console.error("Error fetching social stats:", error);
    res.status(500).json({ error: "Failed to fetch social stats" });
  }
});

// Get detailed performance data for charts
router.get("/detailed-performance", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { dateRange = "yesterday" } = req.query;

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // Calculate date ranges
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;
    let months: number = 1;

    switch (dateRange) {
      case "yesterday":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        previousEndDate = new Date(startDate);
        previousEndDate.setHours(23, 59, 59, 999);
        months = 1;
        break;
      case "last_7_days":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousEndDate = new Date(startDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        previousEndDate.setHours(23, 59, 59, 999);
        months = 1;
        break;
      case "last_30_days":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 30);
        previousEndDate = new Date(startDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        previousEndDate.setHours(23, 59, 59, 999);
        months = 1;
        break;
      case "last_6_months":
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 6);
        previousStartDate = new Date(startDate);
        previousStartDate.setMonth(previousStartDate.getMonth() - 6);
        previousEndDate = new Date(startDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        previousEndDate.setHours(23, 59, 59, 999);
        months = 6;
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        previousEndDate = new Date(startDate);
        previousEndDate.setHours(23, 59, 59, 999);
        months = 1;
    }

    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    // TODO: Replace hardcoded data with real API data from database
    // For now, using hardcoded data - will be replaced with real API data later
    
    // Hardcoded detailed performance data
    let currentData: any[] = [];
    let previousData: any[] = [];

    if (dateRange === "last_6_months") {
      // Hardcoded data for Last 6 months - matching the image
      const months = ["Jun 2025", "Jul 2025", "Aug 2025", "Sep 2025", "Oct 2025", "Nov 2025"];
      const currentConversions = [4, 27, 20, 7, 6, 3];
      const currentCommissions = [0, 65, 35, 0, 0, 0];
      const previousConversions = [0, 0, 4, 21, 13, 17];
      const previousCommissions = [0, 0, 0, 0, 0, 0];

      currentData = months.map((month, index) => ({
        name: month,
        value: currentConversions[index],
        commission: currentCommissions[index],
      }));

      previousData = months.map((month, index) => ({
        name: month,
        value: previousConversions[index],
        commission: previousCommissions[index],
      }));
    } else {
      // For other date ranges, generate simple data
      for (let i = 0; i < months; i++) {
        const monthStart = new Date(startDate);
        monthStart.setMonth(monthStart.getMonth() + i);
        const monthName = monthStart.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
        
        currentData.push({
          name: monthName,
          value: 10 + Math.floor(Math.random() * 10),
          commission: 25 + Math.floor(Math.random() * 20),
        });
        
        previousData.push({
          name: monthName,
          value: 8 + Math.floor(Math.random() * 8),
          commission: 20 + Math.floor(Math.random() * 15),
        });
      }
    }

    res.json({
      conversions: {
        current: currentData.map(d => ({ name: d.name, value: d.value })),
        previous: previousData.map(d => ({ name: d.name, value: d.value })),
      },
      commission: {
        current: currentData.map(d => ({ name: d.name, value: d.commission })),
        previous: previousData.map(d => ({ name: d.name, value: d.commission })),
      },
    });
  } catch (error) {
    console.error("Error fetching detailed performance:", error);
    res.status(500).json({ error: "Failed to fetch detailed performance" });
  }
});

// Get commission summary
router.get("/commission-summary", async (req: any, res) => {
  try {
    const userId = req.user.id;

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
      include: {
        coupons: {
          where: { status: "ACTIVE" },
        },
      },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // No early return when coupons are empty — orders are linked by affiliateId

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Query by affiliateId only
    const currentMonthWhere = {
      affiliateId: affiliate.id,
      createdAt: { gte: currentMonthStart, lte: currentMonthEnd },
    };

    // Get current month data
    const [currentOrders, currentCommission] = await Promise.all([
      prisma.affiliateOrder.findMany({
        where: currentMonthWhere,
      }),
      prisma.affiliateOrder.aggregate({
        where: currentMonthWhere,
        _sum: { commissionAmount: true },
      }),
    ]);

    const totalUnits = currentOrders.reduce((sum, order) => {
      const items = order.items as any;
      return sum + (items?.length || 0);
    }, 0);

    const currentMonth = {
      month: now.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
      status: "Pending",
      totalOrders: currentOrders.length,
      totalUnits,
      commission: currentCommission._sum.commissionAmount
        ? `$${currentCommission._sum.commissionAmount.toFixed(2)}`
        : "Commission not calculated yet",
    };

    // Get previous months (last 12 months)
    const previousMonths: any[] = [];
    for (let i = 1; i <= 12; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);

      const monthWhere = {
        affiliateId: affiliate.id,
        createdAt: { gte: monthStart, lte: monthEnd },
      };

      const [orders, commissionSum] = await Promise.all([
        prisma.affiliateOrder.findMany({
          where: monthWhere,
        }),
        prisma.affiliateOrder.aggregate({
          where: monthWhere,
          _sum: { commissionAmount: true },
        }),
      ]);

      const units = orders.reduce((sum, order) => {
        const items = order.items as any;
        return sum + (items?.length || 0);
      }, 0);

      // Determine status (approved if older than current month, pending otherwise)
      const isApproved = monthDate < currentMonthStart;

      previousMonths.push({
        month: monthDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
        status: isApproved ? "Approved" : "Pending",
        totalOrders: orders.length,
        totalUnits: units,
        commission: commissionSum._sum.commissionAmount
          ? `$${commissionSum._sum.commissionAmount.toFixed(2)}`
          : "$0.00",
      });
    }

    res.json({
      currentMonth,
      previousMonths,
    });
  } catch (error) {
    console.error("Error fetching commission summary:", error);
    res.status(500).json({ error: "Failed to fetch commission summary" });
  }
});

// Get connected Shopify stores
router.get("/stores", async (req: any, res) => {
  try {
    const stores = shopifyService.getAllStores();
    
    // Test connection for each store
    const storesWithStatus = await Promise.all(
      stores.map(async (store) => {
        try {
          const connection = await shopifyService.testConnection(store.id);
          return {
            id: store.id,
            name: store.name,
            domain: store.domain,
            currency: store.currency,
            country: store.country,
            connected: connection.success,
            shopName: connection.shop?.name,
          };
        } catch (error) {
          return {
            id: store.id,
            name: store.name,
            domain: store.domain,
            currency: store.currency,
            country: store.country,
            connected: false,
          };
        }
      })
    );

    res.json({ stores: storesWithStatus });
  } catch (error) {
    console.error("Error fetching stores:", error);
    res.status(500).json({ error: "Failed to fetch stores" });
  }
});

// Get shop page data (store info + recent orders)
router.get("/shop", async (req: any, res) => {
  try {
    const userId = req.user.id;

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
      include: {
        coupons: {
          where: { status: "ACTIVE" },
        },
      },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // No early return when coupons are empty — orders are linked by affiliateId

    // Get stores
    const stores = shopifyService.getAllStores();
    const storesInfo = await Promise.all(
      stores.map(async (store) => {
        try {
          const connection = await shopifyService.testConnection(store.id);
          return {
            id: store.id,
            name: store.name,
            domain: store.domain,
            currency: store.currency,
            country: store.country,
            connected: connection.success,
            shopName: connection.shop?.name,
          };
        } catch (error) {
          return {
            id: store.id,
            name: store.name,
            domain: store.domain,
            currency: store.currency,
            country: store.country,
            connected: false,
          };
        }
      })
    );

    // Query by affiliateId only
    const ordersWhere = {
      affiliateId: affiliate.id,
    };

    // Get recent orders (last 10)
    const recentOrders = await prisma.affiliateOrder.findMany({
      where: ordersWhere,
      orderBy: { orderCreatedAt: "desc" },
      take: 10,
    });

    // Get order stats by store
    const orderStats = await Promise.all(
      stores.map(async (store) => {
        const storeOrdersWhere = {
          ...ordersWhere,
          storeId: store.id,
        };
        const [count, sum] = await Promise.all([
          prisma.affiliateOrder.count({
            where: storeOrdersWhere,
          }),
          prisma.affiliateOrder.aggregate({
            where: storeOrdersWhere,
            _sum: { commissionAmount: true },
          }),
        ]);

        const currencySymbol = store.currency === "CAD" ? "CA$" : store.currency === "GBP" ? "£" : "$";

        return {
          storeId: store.id,
          storeName: store.name,
          totalOrders: count,
          totalCommission: sum._sum.commissionAmount || 0,
          formattedCommission: `${currencySymbol}${(sum._sum.commissionAmount || 0).toFixed(2)}`,
        };
      })
    );

    // Format recent orders
    const storeMap = new Map(stores.map(s => [s.id, s]));
    const formattedOrders = recentOrders.map((order) => {
      const store = storeMap.get(order.storeId);
      const currencySymbol = order.currency === "CAD" ? "CA$" : order.currency === "GBP" ? "£" : "$";

      return {
        id: order.orderId,
        shopifyOrderNumber: order.shopifyOrderNumber,
        date: (order.orderCreatedAt || order.createdAt).toLocaleString(),
        orderTotal: `${currencySymbol}${order.orderValue.toFixed(2)}`,
        commission: `${currencySymbol}${order.commissionAmount.toFixed(2)}`,
        store: store?.name || order.storeId,
        status: order.status,
        financialStatus: order.financialStatus,
      };
    });

    res.json({
      stores: storesInfo,
      orderStats,
      recentOrders: formattedOrders,
      discountCodes: affiliate.coupons.map(c => ({
        code: c.code,
        discount: c.discount,
        status: c.status,
      })),
    });
  } catch (error) {
    console.error("Error fetching shop data:", error);
    res.status(500).json({ error: "Failed to fetch shop data" });
  }
});

// Get products from a store for affiliate to order
router.get("/shop/products/:storeId", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { storeId } = req.params;
    const { limit = 50 } = req.query;

    // Verify affiliate exists
    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // Get all stores to find the one matching storeId
    const stores = shopifyService.getAllStores();
    const store = stores.find(s => s.id === storeId);

    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    // Fetch products from Shopify
    const allProducts = await shopifyService.getProducts(store.id, {
      limit: parseInt(limit as string),
    });

    // Filter to only show active/published products (exclude drafts and archived)
    const products = allProducts.filter(
      (product: any) => product.status === "active" && product.published_at !== null
    );

    // Get affiliate's discount codes for linking
    const coupons = await prisma.coupon.findMany({
      where: {
        affiliateId: affiliate.id,
        status: "ACTIVE",
      },
      select: {
        code: true,
        discount: true,
      },
    });

    res.json({
      products,
      discountCodes: coupons,
      store: {
        id: store.id,
        name: store.name,
        domain: store.domain,
      },
    });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: error.message || "Failed to fetch products" });
  }
});

// Sync orders from Shopify
router.post("/sync-orders", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { days = 30, testMode = false } = req.body; // testMode: true = fetch ALL orders

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
      include: {
        coupons: {
          where: { status: "ACTIVE" },
        },
      },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // In test mode, we don't need discount codes
    if (!testMode && affiliate.coupons.length === 0) {
      return res.json({ message: "No discount codes found", synced: 0 });
    }

    const discountCodes = affiliate.coupons.map(c => c.code);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    // Fetch orders from all stores (testMode = fetch ALL orders, limit to 50 in test mode)
    const orders = await shopifyService.getOrdersByDiscountCodesAllStores(
      discountCodes,
      { 
        created_at_min: startDate.toISOString(), 
        testMode,
        limit: testMode ? 50 : 250, // Limit to 50 orders in test mode
      }
    );

    let synced = 0;
    let skipped = 0;

    // Create a case-insensitive map of discount codes for fast lookup
    const affiliateCodesMap = new Map(
      affiliate.coupons.map(c => [c.code.toUpperCase(), c.code])
    );

    for (const order of orders) {
      const existingOrder = await prisma.affiliateOrder.findUnique({
        where: { orderId: order.id.toString() },
      });

      if (existingOrder) {
        skipped++;
        continue;
      }

      // Verify that the matched code belongs to this affiliate
      // Match case-insensitively
      const matchedCodeUpper = order.matchedCode?.toUpperCase();
      if (!matchedCodeUpper || !affiliateCodesMap.has(matchedCodeUpper)) {
        skipped++;
        continue; // Skip orders that don't match this affiliate's codes
      }

      // Get the actual code (preserving case)
      const actualCode = affiliateCodesMap.get(matchedCodeUpper)!;

      const orderValue = getCommissionableValue(order as any);
      const commissionRate = (affiliate.commissionRate || 10) / 100;
      const commissionAmount = orderValue * commissionRate;

      await prisma.affiliateOrder.create({
        data: {
          affiliateId: affiliate.id,
          referralCode: actualCode,
          storeId: order.storeId,
          orderId: order.id.toString(),
          shopifyOrderId: order.id.toString(),
          shopifyOrderNumber: order.name,
          orderValue,
          subtotalPrice: parseFloat(order.subtotal_price),
          totalTax: parseFloat(order.total_tax),
          currency: order.currency,
          customerEmail: order.email || order.customer?.email,
          customerName: order.customer
            ? `${order.customer.first_name} ${order.customer.last_name}`.trim()
            : null,
          commissionAmount,
          commissionRate: commissionRate * 100,
          status: "PENDING",
          financialStatus: order.financial_status,
          fulfillmentStatus: order.fulfillment_status,
          items: order.line_items,
          shippingAddress: order.shipping_address,
          discountCodes: order.discount_codes,
          referringSite: order.referring_site,
          orderCreatedAt: new Date(order.created_at),
        },
      });

      synced++;
    }

    res.json({
      message: "Sync completed",
      synced,
      skipped,
      total: orders.length,
    });
  } catch (error) {
    console.error("Error syncing orders:", error);
    res.status(500).json({ error: "Failed to sync orders" });
  }
});

// Create order in Shopify for affiliate
router.post("/orders/create", async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    const schema = z.object({
      storeId: z.string(),
      email: z.string().email(),
      lineItems: z.array(z.object({
        variant_id: z.number(),
        quantity: z.number().positive(),
      })),
      shippingAddress: z.object({
        first_name: z.string(),
        last_name: z.string(),
        address1: z.string(),
        address2: z.string().optional(),
        city: z.string(),
        province: z.string(),
        zip: z.string(),
        country: z.string(),
        phone: z.string(),
      }),
      note: z.string().optional(),
      discountCode: z.string().optional(),
    });

    const data = schema.parse(req.body);

    // Get affiliate profile
    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // Get store config from ShopifyService (not database)
    const store = shopifyService.getStore(data.storeId);

    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    // Prepare order data for Shopify
    const orderData: any = {
      email: data.email,
      line_items: data.lineItems,
      shipping_address: data.shippingAddress,
      billing_address: data.shippingAddress, // Use same address
      financial_status: "pending",
      send_receipt: true,
      send_fulfillment_receipt: true,
      note: data.note || `Order placed by affiliate: ${affiliate.id}`,
      tags: `affiliate,${affiliate.id}`,
    };

    // Add discount code if provided
    if (data.discountCode) {
      orderData.discount_codes = [{ code: data.discountCode, amount: "0.00", type: "percentage" }];
    }

    // Create order via Shopify API
    const shopifyOrder = await shopifyService.createOrder(data.storeId, orderData);

    if (!shopifyOrder || !shopifyOrder.id) {
      throw new Error("Failed to create order in Shopify");
    }

    // Calculate commission (after discount, before shipping & tax)
    const orderValue = getCommissionableValue(shopifyOrder as any);
    const commissionRate = affiliate.commissionRate || 10;
    const commissionAmount = (orderValue * commissionRate) / 100;

    // Create order record in database
    const affiliateOrder = await prisma.affiliateOrder.create({
      data: {
        affiliateId: affiliate.id,
        referralCode: data.discountCode || "DIRECT_ORDER",
        storeId: data.storeId,
        orderId: `shopify-${shopifyOrder.id}`,
        shopifyOrderId: shopifyOrder.id.toString(),
        shopifyOrderNumber: shopifyOrder.name || `#${shopifyOrder.order_number}`,
        orderValue: orderValue,
        subtotalPrice: parseFloat(shopifyOrder.subtotal_price || "0"),
        totalTax: parseFloat(shopifyOrder.total_tax || "0"),
        currency: store.currency || "USD",
        customerEmail: data.email,
        customerName: `${data.shippingAddress.first_name} ${data.shippingAddress.last_name}`,
        commissionAmount,
        commissionRate,
        status: "PENDING",
        financialStatus: shopifyOrder.financial_status || "pending",
        fulfillmentStatus: shopifyOrder.fulfillment_status,
        items: shopifyOrder.line_items || [],
        shippingAddress: data.shippingAddress,
        discountCodes: shopifyOrder.discount_codes || [],
        note: data.note,
        orderCreatedAt: shopifyOrder.created_at ? new Date(shopifyOrder.created_at) : new Date(),
      },
    });

    // Update affiliate stats
    await prisma.affiliateProfile.update({
      where: { id: affiliate.id },
      data: {
        totalConversions: { increment: 1 },
        totalEarnings: { increment: commissionAmount },
      },
    });

    res.json({
      success: true,
      message: "Order created successfully",
      orderId: affiliateOrder.id,
      orderNumber: shopifyOrder.name || `#${shopifyOrder.order_number}`,
      shopifyOrderId: shopifyOrder.id,
      commissionAmount,
    });
  } catch (error: any) {
    console.error("Error creating order:", error);
    res.status(500).json({ 
      error: "Failed to create order",
      details: error.message 
    });
  }
});

// Helper function to format dates
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default router;
