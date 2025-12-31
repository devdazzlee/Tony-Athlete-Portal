import express, { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import shopifyService from "../services/ShopifyService";

const router: Router = express.Router();
const prisma = new PrismaClient();

// Default commission rate (10%)
const DEFAULT_COMMISSION_RATE = 0.10;

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
      },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    const socialMedia = affiliate.socialMedia as any || {};
    
    // Get ALL active coupons (discount codes) assigned to this affiliate
    const coupons = await prisma.coupon.findMany({
      where: {
        affiliateId: affiliate.id,
        status: "ACTIVE",
        isAffiliate: true, // Only get affiliate allowance codes
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format discount codes with descriptions
    const discountCodes = coupons.map((coupon) => {
      const discountValue = parseFloat(coupon.discount) || 0;
      const valueText = discountValue > 0 ? `${discountValue}% off` : "";
      const shippingText = coupon.freeShipping ? "Free Shipping" : "";
      const combinedValue = [valueText, shippingText].filter(Boolean).join(" + ");

      return {
        code: coupon.code,
        value: combinedValue || "No discount",
        description: coupon.description,
        freeShipping: coupon.freeShipping,
      };
    });

    res.json({
      instagram: socialMedia.instagram || null,
      tiktok: socialMedia.tiktok || null,
      discountCodes,
      spendingLimit: affiliate.spendingLimit ? `$${affiliate.spendingLimit.toFixed(2)}` : "Not Set",
      deliverablesNote: affiliate.deliverablesNote || null,
    });
  } catch (error) {
    console.error("Error fetching athlete profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
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

    // Get affiliate's discount codes
    const affiliateCodes = affiliate.coupons.map(c => c.code);
    if (affiliateCodes.length === 0) {
      return res.json({
        conversions: 0,
        commissionEarned: "$0.00",
        conversionChange: 0,
        commissionChange: 0,
        currentDateRange: "",
        previousPeriod: "",
        conversionChartData: [],
        commissionChartData: [],
        discountCodeUsage: 0,
      });
    }

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

    // Build where clauses - must match affiliateId AND referralCode must be in affiliate's codes
    const currentOrdersWhere = {
      affiliateId: affiliate.id,
      referralCode: { in: affiliateCodes },
      orderCreatedAt: { gte: startDate, lte: endDate },
      status: { not: "CANCELLED" },
    };

    const previousOrdersWhere = {
      affiliateId: affiliate.id,
      referralCode: { in: affiliateCodes },
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
      platform: z.enum(["Instagram", "TikTok", "YouTube"]),
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
              platform: link.platform,
              photoUrl: link.photoUrl || null,
            } as any,
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
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
      return {
        id: activity.id,
        date: formatDate(activity.createdAt),
        platform: details.platform,
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
    await prisma.activity.create({
      data: {
        userId,
        action: "feedback_submitted",
        resource: "Feedback",
        details: {
          feedback: data.feedback,
          anonymous: isAnonymous,
          name: hasName ? data.name?.trim() : undefined,
          email: hasEmail ? data.email?.trim() : undefined,
        } as any,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      },
    });

    res.json({ message: "Feedback submitted successfully" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error submitting feedback:", error);
    res.status(500).json({ error: "Failed to submit feedback" });
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

    // Get affiliate's discount codes (case-insensitive matching)
    const affiliateCodes = affiliate.coupons.map(c => c.code);
    if (affiliateCodes.length === 0) {
      return res.json([]);
    }

    // Build where clause - must match affiliateId AND referralCode must be in affiliate's codes
    const whereClause: any = { 
      affiliateId: affiliate.id,
      referralCode: { in: affiliateCodes },
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

    // Get affiliate's discount codes
    const affiliateCodes = (await prisma.coupon.findMany({
      where: {
        affiliateId: affiliate.id,
        status: "ACTIVE",
      },
    })).map(c => c.code);

    if (affiliateCodes.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = await prisma.affiliateOrder.findFirst({
      where: {
        affiliateId: affiliate.id,
        referralCode: { in: affiliateCodes },
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

    // Get affiliate's discount codes
    const affiliateCodes = affiliate.coupons.map(c => c.code);
    if (affiliateCodes.length === 0) {
      return res.json({
        currentMonth: {
          month: new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
          status: "Pending",
          totalOrders: 0,
          totalUnits: 0,
          commission: "£0.00",
        },
        previousMonths: [],
      });
    }

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Build where clause - must match affiliateId AND referralCode must be in affiliate's codes
    const currentMonthWhere = {
      affiliateId: affiliate.id,
      referralCode: { in: affiliateCodes },
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
        ? `£${currentCommission._sum.commissionAmount.toFixed(2)}`
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
        referralCode: { in: affiliateCodes },
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
          ? `£${commissionSum._sum.commissionAmount.toFixed(2)}`
          : "£0.00",
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

    // Get affiliate's discount codes
    const affiliateCodes = affiliate.coupons.map(c => c.code);
    if (affiliateCodes.length === 0) {
      return res.json({
        stores: [],
        orderStats: [],
        recentOrders: [],
        discountCodes: [],
      });
    }

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

    // Build where clause - must match affiliateId AND referralCode must be in affiliate's codes
    const ordersWhere = {
      affiliateId: affiliate.id,
      referralCode: { in: affiliateCodes },
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

      const orderValue = parseFloat(order.total_price);
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

// Helper function to format dates
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default router;

