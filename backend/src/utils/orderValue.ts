import { ShopifyOrder } from "../services/ShopifyService";

/**
 * Returns the commissionable value of a Shopify order: item total after discounts
 * and before shipping, tax, duties, and tips.
 */
export function getCommissionableValue(order: ShopifyOrder): number {
  const o: any = order as any;

  const candidates = [
    o.current_subtotal_price,
    o.subtotal_price,
    o.current_subtotal_price_set?.shop_money?.amount,
    o.subtotal_price_set?.shop_money?.amount,
  ];

  for (const value of candidates) {
    const parsed = Number.parseFloat(value as any);
    if (!Number.isNaN(parsed)) return parsed;
  }

  const total = Number.parseFloat(
    o.current_total_price || o.total_price || "0"
  );

  const shippingFromSet = Number.parseFloat(
    o.total_shipping_price_set?.shop_money?.amount || "0"
  );
  const shippingFromLines = Array.isArray(o.shipping_lines)
    ? o.shipping_lines.reduce((sum: number, line: any) => {
        const price = Number.parseFloat((line as any).price || "0");
        return sum + (Number.isNaN(price) ? 0 : price);
      }, 0)
    : 0;

  const shipping = !Number.isNaN(shippingFromSet)
    ? shippingFromSet
    : shippingFromLines;

  const tax = Number.parseFloat(o.total_tax || o.current_total_tax || "0");
  const duties = Number.parseFloat(o.total_duties || "0");
  const tips = Number.parseFloat(o.total_tip_received || "0");

  const base = total - shipping - tax - duties - tips;
  return base > 0 ? base : 0;
}
