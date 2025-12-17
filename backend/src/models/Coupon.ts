import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
  value: number;
  minimumAmount?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  startDate: Date;
  endDate?: Date;
  status: "ACTIVE" | "INACTIVE" | "EXPIRED";
  applicableTo: "ALL_PRODUCTS" | "SPECIFIC_PRODUCTS" | "CATEGORIES";
  productIds?: string[];
  categoryIds?: string[];
  affiliateId?: string;
  offerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CouponUsage {
  id: string;
  couponId: string;
  orderId: string;
  customerId: string;
  affiliateId: string;
  discountAmount: number;
  usedAt: Date;
}

export class CouponModel {
  static async create(data: Partial<Coupon>): Promise<Coupon> {
    return (await prisma.coupon.create({
      data: {
        code: data.code!,
        description: data.description || "",
        discount: data.value?.toString() || "0",
        validUntil:
          data.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        usage: 0,
        maxUsage: data.usageLimit,
        status: data.status || "ACTIVE",
        affiliateId: data.affiliateId || "default",
      },
    } as any)) as any as Coupon;
  }

  static async findById(id: string): Promise<Coupon | null> {
    return (await prisma.coupon.findUnique({
      where: { id },
    })) as any as Coupon | null;
  }

  static async findByCode(code: string): Promise<Coupon | null> {
    return (await prisma.coupon.findUnique({
      where: { code },
    })) as any as Coupon | null;
  }

  static async update(id: string, data: Partial<Coupon>): Promise<Coupon> {
    return (await prisma.coupon.update({
      where: { id },
      data: {
        ...data,
        discount: data.value?.toString() || (data as any).discount,
        validUntil: data.endDate || (data as any).validUntil,
        maxUsage: data.usageLimit || (data as any).maxUsage,
      } as any,
    })) as any as Coupon;
  }

  static async delete(id: string): Promise<void> {
    await prisma.coupon.delete({
      where: { id },
    });
  }

  static async list(
    filters: any = {},
    page: number = 1,
    limit: number = 10
  ): Promise<Coupon[]> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.affiliateId) where.affiliateId = filters.affiliateId;
    if (filters.offerId) where.offerId = filters.offerId;

    return (await prisma.coupon.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    })) as any as Coupon[];
  }

  static async validateCoupon(
    code: string,
    orderAmount: number,
    productIds: string[]
  ): Promise<{
    valid: boolean;
    coupon?: Coupon;
    discount?: number;
    error?: string;
  }> {
    const coupon = await this.findByCode(code);

    if (!coupon) {
      return { valid: false, error: "Coupon not found" };
    }

    if (coupon.status !== "ACTIVE") {
      return { valid: false, error: "Coupon is not active" };
    }

    if (coupon.endDate && new Date() > coupon.endDate) {
      return { valid: false, error: "Coupon has expired" };
    }

    if (
      (coupon as any).maxUsage &&
      (coupon as any).usage >= (coupon as any).maxUsage
    ) {
      return { valid: false, error: "Coupon usage limit reached" };
    }

    // Note: minimumAmount is not available in the actual Prisma model
    // if (coupon.minimumAmount && orderAmount < coupon.minimumAmount) {
    //   return { valid: false, error: `Minimum order amount of ${coupon.minimumAmount} required` };
    // }

    let discount = 0;
    // Parse discount from the actual Prisma model field
    const discountValue = parseFloat((coupon as any).discount) || 0;
    // Assume percentage if value is between 0-100, otherwise fixed amount
    if (discountValue <= 100) {
      discount = (orderAmount * discountValue) / 100;
    } else {
      discount = discountValue;
    }

    return { valid: true, coupon, discount };
  }

  static async recordUsage(
    couponId: string,
    orderId: string,
    customerId: string,
    affiliateId: string,
    discountAmount: number
  ): Promise<CouponUsage> {
    // Record usage - using a generic approach since couponUsage doesn't exist in Prisma
    const usage = (await (prisma as any).couponUsage.create({
      data: {
        couponId,
        orderId,
        customerId,
        affiliateId,
        discountAmount,
        usedAt: new Date(),
      },
    })) as CouponUsage;

    // Update usage count
    await prisma.coupon.update({
      where: { id: couponId },
      data: {
        usage: {
          increment: 1,
        },
      },
    });

    return usage;
  }

  static async importFromCSV(
    csvData: string,
    affiliateId?: string,
    offerId?: string
  ): Promise<Coupon[]> {
    const lines = csvData.split("\n");
    const coupons: Coupon[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Skip header
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split(",");
      if (columns.length < 4) continue;

      const coupon = await this.create({
        code: columns[0].trim(),
        name: columns[1].trim(),
        description: columns[2].trim(),
        type: columns[3].trim() as
          | "PERCENTAGE"
          | "FIXED_AMOUNT"
          | "FREE_SHIPPING",
        value: parseFloat(columns[4].trim()),
        minimumAmount: columns[5] ? parseFloat(columns[5].trim()) : undefined,
        maximumDiscount: columns[6] ? parseFloat(columns[6].trim()) : undefined,
        usageLimit: columns[7] ? parseInt(columns[7].trim()) : undefined,
        startDate: new Date(columns[8].trim()),
        endDate: columns[9] ? new Date(columns[9].trim()) : undefined,
        status: "ACTIVE",
        applicableTo: "ALL_PRODUCTS",
        affiliateId,
        offerId,
      } as any);

      coupons.push(coupon);
    }

    return coupons;
  }
}
