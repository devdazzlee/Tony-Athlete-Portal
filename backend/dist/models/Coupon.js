"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class CouponModel {
    static async create(data) {
        return (await prisma.coupon.create({
            data: {
                code: data.code,
                description: data.description || "",
                discount: data.value?.toString() || "0",
                validUntil: data.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                usage: 0,
                maxUsage: data.usageLimit,
                status: data.status || "ACTIVE",
                affiliateId: data.affiliateId || "default",
            },
        }));
    }
    static async findById(id) {
        return (await prisma.coupon.findUnique({
            where: { id },
        }));
    }
    static async findByCode(code) {
        return (await prisma.coupon.findUnique({
            where: { code },
        }));
    }
    static async update(id, data) {
        return (await prisma.coupon.update({
            where: { id },
            data: {
                ...data,
                discount: data.value?.toString() || data.discount,
                validUntil: data.endDate || data.validUntil,
                maxUsage: data.usageLimit || data.maxUsage,
            },
        }));
    }
    static async delete(id) {
        await prisma.coupon.delete({
            where: { id },
        });
    }
    static async list(filters = {}, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const where = {};
        if (filters.status)
            where.status = filters.status;
        if (filters.type)
            where.type = filters.type;
        if (filters.affiliateId)
            where.affiliateId = filters.affiliateId;
        if (filters.offerId)
            where.offerId = filters.offerId;
        return (await prisma.coupon.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async validateCoupon(code, orderAmount, productIds) {
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
        if (coupon.maxUsage &&
            coupon.usage >= coupon.maxUsage) {
            return { valid: false, error: "Coupon usage limit reached" };
        }
        let discount = 0;
        const discountValue = parseFloat(coupon.discount) || 0;
        if (discountValue <= 100) {
            discount = (orderAmount * discountValue) / 100;
        }
        else {
            discount = discountValue;
        }
        return { valid: true, coupon, discount };
    }
    static async recordUsage(couponId, orderId, customerId, affiliateId, discountAmount) {
        const usage = (await prisma.couponUsage.create({
            data: {
                couponId,
                orderId,
                customerId,
                affiliateId,
                discountAmount,
                usedAt: new Date(),
            },
        }));
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
    static async importFromCSV(csvData, affiliateId, offerId) {
        const lines = csvData.split("\n");
        const coupons = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line)
                continue;
            const columns = line.split(",");
            if (columns.length < 4)
                continue;
            const coupon = await this.create({
                code: columns[0].trim(),
                name: columns[1].trim(),
                description: columns[2].trim(),
                type: columns[3].trim(),
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
            });
            coupons.push(coupon);
        }
        return coupons;
    }
}
exports.CouponModel = CouponModel;
//# sourceMappingURL=Coupon.js.map