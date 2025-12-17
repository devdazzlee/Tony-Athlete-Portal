import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

const getShortUrlBase = () =>
  (
    process.env.SHORT_URL_DOMAIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

export interface GenerateLinkData {
  url: string;
  websiteId?: string;
  referralCodeId?: string;
  campaignName?: string;
  offerId?: string;
}

export interface GenerateCouponData {
  description: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minPurchase?: number;
  maxUsage?: number;
  validDays?: number;
}

export interface TrackClickData {
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
  country?: string;
  device?: string;
}

export class LinksService {
  /**
   * Generate a unique short URL slug
   */
  private async generateUniqueSlug(customAlias?: string): Promise<string> {
    if (customAlias) {
      // Check if custom alias is available
      const existing = await prisma.affiliateLink.findFirst({
        where: { customSlug: customAlias },
      });

      if (existing) {
        throw new Error("Custom alias is already taken");
      }

      return customAlias;
    }

    // Generate random slug and ensure it's unique
    let slug: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      slug = crypto.randomBytes(6).toString("hex");
      const existing = await prisma.affiliateLink.findFirst({
        where: { customSlug: slug },
      });

      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error("Failed to generate unique slug");
    }

    return slug;
  }

  /**
   * Generate affiliate tracking link
   */
  async generateLink(userId: string, data: GenerateLinkData) {
    // Find affiliate profile
    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
      include: { user: true },
    });

    if (!affiliate) {
      throw new Error("Affiliate profile not found");
    }

    // Generate unique slug (use referral code as part of slug if available)
    let slug: string;
    if (data.referralCodeId) {
      // Get referral code to use in slug
      const referralCode = await prisma.referralCode.findUnique({
        where: { id: data.referralCodeId },
      });

      if (referralCode && referralCode.affiliateId === affiliate.id) {
        // Use referral code as part of slug
        slug = `${referralCode.code}-${crypto.randomBytes(4).toString("hex")}`;
      } else {
        // Fallback to random slug
        slug = await this.generateUniqueSlug();
      }
    } else {
      slug = await this.generateUniqueSlug();
    }

    // Create short URL (you can customize the domain)
    const shortUrl = `${getShortUrlBase()}/link/${slug}`;

    // The URL is already generated in the format: {domain}?websiteId={websiteId}&ref={referralCode}
    // So we can use it directly as the affiliate URL
    const affiliateUrl = data.url;

    // Create affiliate link in database
    const link = await prisma.affiliateLink.create({
      data: {
        affiliateId: affiliate.id,
        offerId: data.offerId || null,
        originalUrl: affiliateUrl,
        shortUrl: shortUrl,
        customSlug: slug,
        clicks: 0,
        conversions: 0,
        earnings: 0,
        isActive: true,
      },
    });

    return {
      id: link.id,
      originalUrl: link.originalUrl,
      affiliateUrl: affiliateUrl,
      shortUrl: link.shortUrl,
      trackingCode: slug,
      websiteId: data.websiteId || null,
      referralCodeId: data.referralCodeId || null,
      campaignName: data.campaignName || "Default Campaign",
      clicks: link.clicks,
      conversions: link.conversions,
      earnings: link.earnings,
      status: link.isActive ? "Active" : "Inactive",
      createdAt: link.createdAt,
    };
  }

  /**
   * Get all affiliate links
   */
  async getMyLinks(userId: string) {
    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    if (!affiliate) {
      throw new Error("Affiliate profile not found");
    }

    const links = await prisma.affiliateLink.findMany({
      where: { affiliateId: affiliate.id },
      include: {
        offer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch aggregated performance metrics for each link
    const [orderAggregates, clickAggregates] = await Promise.all([
      prisma.affiliateOrder.groupBy({
        by: ["referralCode"],
        where: {
          affiliateId: affiliate.id,
          referralCode: {
            in: links
              .map((link) => [
                link.customSlug,
                link.customSlug?.split("-")[0],
                link.id,
              ])
              .flat()
              .filter((code): code is string => !!code),
          },
        },
        _sum: {
          commissionAmount: true,
          orderValue: true,
        },
        _count: {
          id: true,
        },
      }),
      prisma.affiliateClick.groupBy({
        by: ["referralCode"],
        where: {
          affiliateId: affiliate.id,
          referralCode: {
            in: links
              .map((link) => [
                link.customSlug,
                link.customSlug?.split("-")[0],
                link.id,
              ])
              .flat()
              .filter((code): code is string => !!code),
          },
        },
        _count: { id: true },
      }),
    ]);

    const shortUrlBase = getShortUrlBase();

    const mappedLinks = links.map((link) => {
      const identifiers = [
        link.customSlug,
        link.customSlug?.split("-")[0],
        link.id,
      ].filter((value): value is string => !!value);

      const linkClicks =
        clickAggregates.find((aggregate) =>
          identifiers.includes(aggregate.referralCode || "")
        )?._count.id || 0;

      const linkOrders = orderAggregates.find((aggregate) =>
        identifiers.includes(aggregate.referralCode || "")
      );

      const conversions = linkOrders?._count.id || 0;
      const earnings = linkOrders?._sum.commissionAmount || 0;

      return {
        id: link.id,
        name: link.customSlug || link.id,
        url: link.originalUrl,
        shortUrl: `${shortUrlBase}/link/${link.customSlug || link.id}`,
        trackingCode: link.customSlug || link.id,
        campaignName: link.offer?.name || "Direct Link",
        clicks: linkClicks,
        conversions,
        earnings,
        status: link.isActive ? "Active" : "Inactive",
        createdAt: link.createdAt,
      };
    });

    console.log(
      "LinksService.getMyLinks - Raw database links:",
      links.map((l) => ({ id: l.id, customSlug: l.customSlug }))
    );
    console.log(
      "LinksService.getMyLinks - Mapped links:",
      mappedLinks.map((l) => ({ id: l.id, name: l.name }))
    );

    return mappedLinks;
  }

  /**
   * Get link statistics
   */
  async getLinkStats(userId: string, linkId: string) {
    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    if (!affiliate) {
      throw new Error("Affiliate profile not found");
    }

    const link = await prisma.affiliateLink.findFirst({
      where: {
        id: linkId,
        affiliateId: affiliate.id,
      },
    });

    if (!link) {
      throw new Error("Link not found");
    }

    // Get click details using tracking code
    const identifiers = [
      link.customSlug,
      link.customSlug?.split("-")[0],
      link.id,
      link.shortUrl,
    ].filter((value): value is string => !!value);

    const clicks = await prisma.affiliateClick.findMany({
      where: {
        affiliateId: affiliate.id,
        referralCode: { in: identifiers },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const totalClicks = await prisma.affiliateClick.count({
      where: {
        affiliateId: affiliate.id,
        referralCode: { in: identifiers },
      },
    });

    const totalConversions = await prisma.affiliateOrder.count({
      where: {
        affiliateId: affiliate.id,
        referralCode: { in: identifiers },
      },
    });

    const totalEarnings = await prisma.affiliateOrder.aggregate({
      where: {
        affiliateId: affiliate.id,
        referralCode: { in: identifiers },
      },
      _sum: { commissionAmount: true },
    });

    const totalRevenue = await prisma.affiliateOrder.aggregate({
      where: {
        affiliateId: affiliate.id,
        referralCode: { in: identifiers },
      },
      _sum: { orderValue: true },
    });

    return {
      link,
      clicks,
      totalClicks,
      totalConversions,
      totalEarnings: totalEarnings._sum.commissionAmount || 0,
      totalRevenue: totalRevenue._sum.orderValue || 0,
      conversionRate:
        totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
    };
  }

  async getPublicLink(trackingCode: string) {
    const link = await prisma.affiliateLink.findFirst({
      where: {
        OR: [
          { customSlug: trackingCode },
          { shortUrl: { contains: trackingCode } },
        ],
        isActive: true,
      },
      include: {
        affiliate: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!link) {
      throw new Error("Link not found");
    }

    const identifiers = [
      link.customSlug,
      link.customSlug?.split("-")[0],
      link.id,
    ].filter((value): value is string => !!value);

    const [clicksCount, conversionsCount, earningsAggregate] = await Promise.all([
      prisma.affiliateClick.count({
        where: {
          affiliateId: link.affiliateId,
          referralCode: { in: identifiers },
        },
      }),
      prisma.affiliateOrder.count({
        where: {
          affiliateId: link.affiliateId,
          referralCode: { in: identifiers },
        },
      }),
      prisma.affiliateOrder.aggregate({
        where: {
          affiliateId: link.affiliateId,
          referralCode: { in: identifiers },
        },
        _sum: { commissionAmount: true, orderValue: true },
      }),
    ]);

    const shortUrlBase = getShortUrlBase();

    return {
      id: link.id,
      name: link.customSlug || link.id,
      originalUrl: link.originalUrl,
      shortUrl: `${shortUrlBase}/link/${link.customSlug || link.id}`,
      trackingCode: link.customSlug || link.id,
      createdAt: link.createdAt,
      affiliate:
        link.affiliate && link.affiliate.user
          ? {
              id: link.affiliateId,
              name: `${link.affiliate.user.firstName} ${link.affiliate.user.lastName}`,
            }
        : null,
      stats: {
        clicks: clicksCount,
        conversions: conversionsCount,
        earnings: earningsAggregate._sum.commissionAmount || 0,
        revenue: earningsAggregate._sum.orderValue || 0,
        conversionRate:
          clicksCount > 0 ? (conversionsCount / clicksCount) * 100 : 0,
      },
    };
  }

  /**
   * Track link click
   */
  async trackClick(trackingCode: string, clickData: TrackClickData) {
    // Find link by custom slug or short URL
    const link = await prisma.affiliateLink.findFirst({
      where: {
        OR: [
          { customSlug: trackingCode },
          { shortUrl: { contains: trackingCode } },
        ],
        isActive: true,
      },
      include: {
        affiliate: true,
      },
    });

    if (!link) {
      throw new Error("Tracking link not found or inactive");
    }

    // Create click record using existing AffiliateClick schema
    const click = await prisma.affiliateClick.create({
      data: {
        affiliateId: link.affiliateId,
        referralCode: trackingCode,
        storeId: "default", // You can make this dynamic based on your setup
        url: link.shortUrl,
        referrer: clickData.referrer,
        userAgent: clickData.userAgent,
        ipAddress: clickData.ipAddress,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
      },
    });

    // Update link click count
    await prisma.affiliateLink.update({
      where: { id: link.id },
      data: { clicks: { increment: 1 } },
    });

    // Update affiliate total clicks
    await prisma.affiliateProfile.update({
      where: { id: link.affiliateId },
      data: { totalClicks: { increment: 1 } },
    });

    return {
      success: true,
      redirectUrl: link.originalUrl,
      click,
    };
  }

  /**
   * Update link status
   */
  async updateLinkStatus(userId: string, linkId: string, isActive: boolean) {
    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    if (!affiliate) {
      throw new Error("Affiliate profile not found");
    }

    const link = await prisma.affiliateLink.update({
      where: {
        id: linkId,
        affiliateId: affiliate.id,
      },
      data: { isActive },
    });

    return link;
  }

  /**
   * Delete affiliate link
   */
  async deleteLink(userId: string, linkId: string) {
    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    if (!affiliate) {
      throw new Error("Affiliate profile not found");
    }

    await prisma.affiliateLink.delete({
      where: {
        id: linkId,
        affiliateId: affiliate.id,
      },
    });

    return { success: true, message: "Link deleted successfully" };
  }

  /**
   * Get available coupons
   */
  async getAvailableCoupons(userId: string) {
    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    if (!affiliate) {
      throw new Error("Affiliate profile not found");
    }

    const coupons = await prisma.coupon.findMany({
      where: {
        affiliateId: affiliate.id,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
    });

    return coupons.map((coupon) => ({
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discount: coupon.discount,
      type: coupon.discount.includes("%") ? "Percentage" : "Fixed Amount",
      validUntil: coupon.validUntil.toISOString().split("T")[0],
      uses: coupon.usage,
      maxUses: coupon.maxUsage || 1000,
      status: coupon.status,
      createdAt: coupon.createdAt,
    }));
  }

  /**
   * Generate custom coupon
   */
  async generateCoupon(userId: string, data: GenerateCouponData) {
    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    if (!affiliate) {
      throw new Error("Affiliate profile not found");
    }

    // Generate unique coupon code
    let couponCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      couponCode = `${data.discountType === "PERCENTAGE" ? "PCT" : "FIX"}-${crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase()}`;

      const existing = await prisma.coupon.findUnique({
        where: { code: couponCode },
      });

      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error("Failed to generate unique coupon code");
    }

    // Calculate expiration date
    const validDays = data.validDays || 90;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    // Format discount string
    const discount =
      data.discountType === "PERCENTAGE"
        ? `${data.discountValue}%`
        : `$${data.discountValue}`;

    // Create coupon
    const coupon = await prisma.coupon.create({
      data: {
        affiliateId: affiliate.id,
        code: couponCode,
        description: data.description,
        discount: discount,
        validUntil: validUntil,
        usage: 0,
        maxUsage: data.maxUsage || 100,
        status: "ACTIVE",
      },
    });

    return {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discount: coupon.discount,
      type: data.discountType === "PERCENTAGE" ? "Percentage" : "Fixed Amount",
      minPurchase: data.minPurchase ? `$${data.minPurchase}` : "None",
      validUntil: coupon.validUntil.toISOString().split("T")[0],
      uses: coupon.usage,
      maxUses: coupon.maxUsage,
      status: coupon.status,
      createdAt: coupon.createdAt,
    };
  }

  /**
   * Validate and use coupon
   */
  async useCoupon(couponCode: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode },
      include: { affiliate: true },
    });

    if (!coupon) {
      throw new Error("Coupon not found");
    }

    if (coupon.status !== "ACTIVE") {
      throw new Error("Coupon is not active");
    }

    if (coupon.validUntil < new Date()) {
      throw new Error("Coupon has expired");
    }

    if (coupon.maxUsage && coupon.usage >= coupon.maxUsage) {
      throw new Error("Coupon usage limit reached");
    }

    // Increment usage
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { usage: { increment: 1 } },
    });

    return {
      valid: true,
      discount: coupon.discount,
      affiliateId: coupon.affiliateId,
    };
  }

  /**
   * Deactivate coupon
   */
  async deactivateCoupon(userId: string, couponId: string) {
    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    if (!affiliate) {
      throw new Error("Affiliate profile not found");
    }

    const coupon = await prisma.coupon.update({
      where: {
        id: couponId,
        affiliateId: affiliate.id,
      },
      data: { status: "INACTIVE" },
    });

    return coupon;
  }
}

export default new LinksService();
