import { Coupon } from "@prisma/client";

type CouponLike = Pick<Coupon, "description" | "isAffiliate" | "validUntil">;

const LEGACY_AUDIENCE_CODE_EXPIRY_CUTOFF = new Date("2090-01-01T00:00:00.000Z");

/**
 * Audience codes were historically created with isAffiliate=true by mistake.
 * Those records were also stored with a far-future expiry to represent "no expiry".
 * We keep a small compatibility layer so legacy records still render in the
 * correct bucket without changing the surrounding flow.
 */
export function isLegacyAudienceCoupon(coupon: CouponLike): boolean {
  if (!coupon.isAffiliate) {
    return false;
  }

  const description = (coupon.description || "").toLowerCase();
  const hasAllowanceDescription =
    description.includes("allowance") || description.includes("paired with");
  const hasFarFutureExpiry =
    coupon.validUntil >= LEGACY_AUDIENCE_CODE_EXPIRY_CUTOFF;

  return hasFarFutureExpiry && !hasAllowanceDescription;
}

export function isAudienceCoupon(coupon: CouponLike): boolean {
  return !coupon.isAffiliate || isLegacyAudienceCoupon(coupon);
}

export function isMonthlyAllowanceCoupon(coupon: CouponLike): boolean {
  return coupon.isAffiliate && !isLegacyAudienceCoupon(coupon);
}
