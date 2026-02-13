import { prisma } from "../lib/prisma";
import { z } from "zod";
import { SystemSettingsService } from "../services/SystemSettingsService";

export interface ReferralCode {
  id: string;
  affiliateId: string;
  code: string;
  type: "SIGNUP" | "PRODUCT" | "BOTH";
  commissionRate: number;
  productId?: string | null;
  maxUses?: number | null;
  currentUses: number;
  expiresAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReferralUsage {
  id: string;
  referralCodeId: string;
  userId: string;
  type: "SIGNUP" | "PRODUCT" | "BOTH";
  productId?: string | null;
  orderValue?: number | null;
  commissionAmount: number;
  status: "PENDING" | "APPROVED" | "PAID";
  createdAt: Date;
}

export interface ReferralStats {
  totalReferrals: number;
  totalCommissions: number;
  pendingCommissions: number;
  conversionRate: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    referrals: number;
    commissions: number;
  }>;
}

export class ReferralSystemModel {
  /**
   * Generate a unique referral code for an affiliate
   */
  static async generateReferralCode(
    affiliateId: string,
    data: {
      type: "SIGNUP" | "PRODUCT" | "BOTH";
      commissionRate?: number;
      productId?: string;
      maxUses?: number;
      expiresAt?: Date;
    }
  ): Promise<ReferralCode> {
    // Generate unique code
    let code: string;
    let attempts = 0;

    do {
      if (data.productId) {
        // Product-specific code: PRODUCT_ABC123
        code = `PROD_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      } else {
        // General affiliate code: AFF_ABC123
        code = `AFF_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }

      const existing = await prisma.referralCode.findFirst({
        where: { code },
      });

      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new Error("Unable to generate unique referral code");
    }

    const commissionRate =
      data.commissionRate ??
      (await SystemSettingsService.getDefaultCommissionRate());

    const referralCode = await prisma.referralCode.create({
      data: {
        affiliateId,
        code,
        type: data.type,
        commissionRate,
        productId: data.productId,
        maxUses: data.maxUses,
        expiresAt: data.expiresAt,
        isActive: true,
        currentUses: 0,
      },
    });

    return referralCode as ReferralCode;
  }

  /**
   * Process a referral usage (signup or purchase)
   */
  static async processReferral(
    code: string,
    userId: string,
    type: "SIGNUP" | "PRODUCT",
    data?: {
      productId?: string;
      orderValue?: number;
    }
  ): Promise<ReferralUsage> {
    // Find the referral code
    const referralCode = await prisma.referralCode.findFirst({
      where: {
        code,
        isActive: true,
        OR: [{ type: type }, { type: "BOTH" }],
        AND: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        affiliate: true,
      },
    });

    if (!referralCode) {
      throw new Error("Invalid or expired referral code");
    }

    // Check if max uses reached
    if (
      referralCode.maxUses &&
      referralCode.currentUses >= referralCode.maxUses
    ) {
      throw new Error("Referral code usage limit reached");
    }

    // Check if product-specific code matches
    if (referralCode.productId && data?.productId !== referralCode.productId) {
      throw new Error("Referral code not valid for this product");
    }

    // Calculate commission
    let commissionAmount = 0;
    if (type === "PRODUCT" && data?.orderValue) {
      commissionAmount = (data.orderValue * referralCode.commissionRate) / 100;
    } else if (type === "SIGNUP") {
      // Fixed signup bonus
      commissionAmount = 5.0; // $5 signup bonus
    }

    // Create referral usage record
    const referralUsage = await prisma.referralUsage.create({
      data: {
        referralCodeId: referralCode.id,
        userId,
        type,
        productId: data?.productId,
        orderValue: data?.orderValue,
        commissionAmount,
        status: "PENDING",
      },
    });

    // Update referral code usage count
    await prisma.referralCode.update({
      where: { id: referralCode.id },
      data: { currentUses: { increment: 1 } },
    });

    // Update affiliate total earnings
    if (commissionAmount > 0) {
      await prisma.affiliateProfile.update({
        where: { id: referralCode.affiliateId },
        data: {
          totalEarnings: { increment: commissionAmount },
          totalConversions: { increment: 1 },
        },
      });
    }

    // Note: Commission creation requires a conversion record in the database
    // For now, we track the commission amount in the referralUsage
    // Admin can manually create commission records from the referral usages

    return referralUsage as ReferralUsage;
  }

  /**
   * Get referral statistics for an affiliate
   */
  static async getReferralStats(affiliateId: string): Promise<ReferralStats> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get all AffiliateOrder records for this affiliate — this is the real source of truth.
    // Orders are linked by affiliateId (set when order comes through a discount code / coupon).
    const [
      allOrders,
      recentOrders,
      affiliateClicks,
      allTimeClicksCount,
    ] = await Promise.all([
      // All-time orders for totals
      prisma.affiliateOrder.findMany({
        where: { affiliateId },
      }),
      // Last 30 days orders
      prisma.affiliateOrder.findMany({
        where: {
          affiliateId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      // Clicks for conversion rate (last 30 days)
      prisma.affiliateClick.count({
        where: {
          affiliateId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      // All-time clicks
      prisma.affiliateClick.count({
        where: { affiliateId },
      }),
    ]);

    // Total referrals = total number of orders attributed to this affiliate (all time)
    const totalReferrals = allOrders.length;

    // Total commissions = sum of ALL commissions (not just PAID — matches Commission Management page)
    const totalCommissions = allOrders.reduce(
      (sum, order) => sum + (order.commissionAmount || 0),
      0
    );

    // Pending commissions = sum of commissions where status is PENDING (or not PAID/CANCELLED)
    const pendingCommissions = allOrders
      .filter((order) => order.status !== "PAID" && order.status !== "CANCELLED")
      .reduce((sum, order) => sum + (order.commissionAmount || 0), 0);

    // Conversion rate: (recent orders / recent clicks) * 100
    const totalClicks = affiliateClicks > 0 ? affiliateClicks : allTimeClicksCount;
    const recentReferrals = recentOrders.length;
    const conversionRate =
      totalClicks > 0 ? (recentReferrals / totalClicks) * 100 : 0;

    const roundedConversionRate = Math.round(conversionRate * 100) / 100;

    // Top products from orders grouped by referralCode (discount code)
    const productStats = allOrders
      .filter((o) => o.referralCode)
      .reduce(
        (acc, o) => {
          const key = o.referralCode;
          if (!acc[key]) {
            acc[key] = {
              productId: key,
              productName: key,
              referrals: 0,
              commissions: 0,
            };
          }
          acc[key].referrals++;
          acc[key].commissions += o.commissionAmount || 0;
          return acc;
        },
        {} as Record<string, any>
      );

    const topProducts = Object.values(productStats)
      .sort((a: any, b: any) => b.commissions - a.commissions)
      .slice(0, 5);

    return {
      totalReferrals,
      totalCommissions,
      pendingCommissions,
      conversionRate: roundedConversionRate,
      topProducts,
    };
  }

  /**
   * Get all referral codes for an affiliate
   */
  static async getAffiliateReferralCodes(affiliateId: string) {
    const codes = await prisma.referralCode.findMany({
      where: { affiliateId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        commissionRate: true, // Explicitly select commissionRate from database
        productId: true,
        maxUses: true,
        currentUses: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Return codes with actual commissionRate from database
    // Return the exact value from database - no transformation
    return codes.map((code) => ({
      ...code,
      // Return the actual commissionRate from database as-is
      // Ensure it's a number type (not undefined/null)
      commissionRate:
        code.commissionRate != null ? Number(code.commissionRate) : 0,
    }));
  }

  /**
   * Generate shareable affiliate links with referral codes
   */
  static async generateShareableLinks(
    affiliateId: string,
    platforms: string[] = [
      "facebook",
      "twitter",
      "instagram",
      "linkedin",
      "tiktok",
    ]
  ) {
    const affiliate = await prisma.affiliateProfile.findUnique({
      where: { id: affiliateId },
      include: { user: true },
    });

    if (!affiliate) {
      throw new Error("Affiliate not found");
    }

    const baseUrl = process.env.FRONTEND_URL || "https://trackdesk.com";
    const links: Record<string, string> = {};

    // Get the most recent general referral code
    let generalCode: ReferralCode | null = (await prisma.referralCode.findFirst(
      {
        where: {
          affiliateId,
          type: "BOTH",
          isActive: true,
        },
        orderBy: {
          createdAt: "desc", // Get the most recently created code
        },
      }
    )) as ReferralCode | null;

    if (!generalCode) {
      generalCode = await this.generateReferralCode(affiliateId, {
        type: "BOTH",
        commissionRate: affiliate.commissionRate,
      });
    }

    // Generate platform-specific links
    platforms.forEach((platform) => {
      const trackingParams = new URLSearchParams({
        ref: generalCode?.code || "",
        utm_source: platform,
        utm_medium: "affiliate",
        utm_campaign:
          `${affiliate.user.firstName}_${affiliate.user.lastName}`.toLowerCase(),
      });

      links[platform] = `${baseUrl}/signup?${trackingParams.toString()}`;
    });

    return {
      referralCode: generalCode?.code || "",
      links,
      qrCode: `${baseUrl}/qr/${generalCode?.code || ""}`, // QR code for easy sharing
    };
  }
}
