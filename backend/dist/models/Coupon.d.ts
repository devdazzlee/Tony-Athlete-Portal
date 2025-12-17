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
export declare class CouponModel {
    static create(data: Partial<Coupon>): Promise<Coupon>;
    static findById(id: string): Promise<Coupon | null>;
    static findByCode(code: string): Promise<Coupon | null>;
    static update(id: string, data: Partial<Coupon>): Promise<Coupon>;
    static delete(id: string): Promise<void>;
    static list(filters?: any, page?: number, limit?: number): Promise<Coupon[]>;
    static validateCoupon(code: string, orderAmount: number, productIds: string[]): Promise<{
        valid: boolean;
        coupon?: Coupon;
        discount?: number;
        error?: string;
    }>;
    static recordUsage(couponId: string, orderId: string, customerId: string, affiliateId: string, discountAmount: number): Promise<CouponUsage>;
    static importFromCSV(csvData: string, affiliateId?: string, offerId?: string): Promise<Coupon[]>;
}
//# sourceMappingURL=Coupon.d.ts.map