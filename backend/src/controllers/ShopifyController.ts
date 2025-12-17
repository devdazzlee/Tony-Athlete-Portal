/**
 * ShopifyController - Handles Shopify webhooks and API endpoints
 * 
 * This controller processes:
 * - Order webhooks (create, update, paid, cancelled, refunded)
 * - Store connection management
 * - Order sync operations
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import shopifyService, { ShopifyOrder } from '../services/ShopifyService';

const prisma = new PrismaClient();

// Default commission rate (10%)
const DEFAULT_COMMISSION_RATE = 0.10;

/**
 * Process incoming Shopify order webhook
 */
export async function handleOrderWebhook(req: Request, res: Response) {
  try {
    const shopifyHmac = req.headers['x-shopify-hmac-sha256'] as string;
    const shopifyTopic = req.headers['x-shopify-topic'] as string;
    const shopifyDomain = req.headers['x-shopify-shop-domain'] as string;

    console.log(`[Shopify Webhook] Received ${shopifyTopic} from ${shopifyDomain}`);

    // Find store by domain
    const store = shopifyService.getStoreByDomain(shopifyDomain);
    if (!store) {
      console.error(`[Shopify Webhook] Unknown store domain: ${shopifyDomain}`);
      return res.status(400).json({ error: 'Unknown store' });
    }

    // Verify webhook signature (in production)
    if (process.env.NODE_ENV === 'production' && shopifyHmac) {
      const rawBody = JSON.stringify(req.body);
      const isValid = shopifyService.verifyWebhookSignature(rawBody, shopifyHmac, store.id);
      if (!isValid) {
        console.error(`[Shopify Webhook] Invalid signature for ${store.name}`);
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const order: ShopifyOrder = req.body;

    // Process based on topic
    switch (shopifyTopic) {
      case 'orders/create':
      case 'orders/paid':
        await processNewOrder(order, store.id, store.name);
        break;
      case 'orders/updated':
        await updateExistingOrder(order, store.id);
        break;
      case 'orders/cancelled':
        await cancelOrder(order, store.id);
        break;
      case 'refunds/create':
        await handleRefund(order, store.id);
        break;
      default:
        console.log(`[Shopify Webhook] Unhandled topic: ${shopifyTopic}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Shopify Webhook] Error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Process a new order from Shopify
 */
async function processNewOrder(order: ShopifyOrder, storeId: string, storeName: string) {
  try {
    // Check if order already exists
    const existingOrder = await prisma.affiliateOrder.findUnique({
      where: { orderId: order.id.toString() },
    });

    if (existingOrder) {
      console.log(`[Shopify] Order ${order.id} already exists, skipping`);
      return;
    }

    // Check if order has discount codes
    if (!order.discount_codes || order.discount_codes.length === 0) {
      console.log(`[Shopify] Order ${order.id} has no discount codes, skipping`);
      return;
    }

    // Find affiliate by discount code
    for (const discount of order.discount_codes) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: { equals: discount.code, mode: 'insensitive' },
          status: 'ACTIVE',
        },
        include: {
          affiliate: {
            include: {
              user: true,
            },
          },
        },
      });

      if (coupon) {
        const affiliate = coupon.affiliate;
        const orderValue = parseFloat(order.total_price);
        const commissionRate = affiliate.commissionRate / 100 || DEFAULT_COMMISSION_RATE;
        const commissionAmount = orderValue * commissionRate;

        // Create affiliate order
        await prisma.affiliateOrder.create({
          data: {
            affiliateId: affiliate.id,
            referralCode: discount.code,
            storeId: storeId,
            orderId: order.id.toString(),
            shopifyOrderId: order.id.toString(),
            shopifyOrderNumber: order.name,
            orderValue: orderValue,
            subtotalPrice: parseFloat(order.subtotal_price),
            totalTax: parseFloat(order.total_tax),
            currency: order.currency,
            customerEmail: order.email || order.customer?.email,
            customerName: order.customer 
              ? `${order.customer.first_name} ${order.customer.last_name}`.trim()
              : null,
            commissionAmount: commissionAmount,
            commissionRate: commissionRate * 100,
            status: 'PENDING',
            financialStatus: order.financial_status,
            fulfillmentStatus: order.fulfillment_status,
            items: order.line_items,
            shippingAddress: order.shipping_address,
            discountCodes: order.discount_codes,
            referringSite: order.referring_site,
            note: order.note,
            tags: order.tags,
            orderCreatedAt: new Date(order.created_at),
          },
        });

        // Update coupon usage
        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { usage: { increment: 1 } },
        });

        // Update affiliate stats
        await prisma.affiliateProfile.update({
          where: { id: affiliate.id },
          data: {
            totalConversions: { increment: 1 },
            totalEarnings: { increment: commissionAmount },
          },
        });

        console.log(`[Shopify] Created order ${order.name} for affiliate ${affiliate.user.email} (${storeName})`);
        
        // Only process first matching discount code
        break;
      }
    }
  } catch (error) {
    console.error('[Shopify] Error processing new order:', error);
    throw error;
  }
}

/**
 * Update an existing order
 */
async function updateExistingOrder(order: ShopifyOrder, storeId: string) {
  try {
    const existingOrder = await prisma.affiliateOrder.findUnique({
      where: { orderId: order.id.toString() },
    });

    if (!existingOrder) {
      // Order doesn't exist, might be a new order with discount code
      const store = shopifyService.getStore(storeId);
      if (store && order.discount_codes?.length > 0) {
        await processNewOrder(order, storeId, store.name);
      }
      return;
    }

    // Update order status
    await prisma.affiliateOrder.update({
      where: { orderId: order.id.toString() },
      data: {
        financialStatus: order.financial_status,
        fulfillmentStatus: order.fulfillment_status,
        orderValue: parseFloat(order.total_price),
        items: order.line_items,
        updatedAt: new Date(),
      },
    });

    console.log(`[Shopify] Updated order ${order.name}`);
  } catch (error) {
    console.error('[Shopify] Error updating order:', error);
    throw error;
  }
}

/**
 * Cancel an order
 */
async function cancelOrder(order: ShopifyOrder, storeId: string) {
  try {
    const existingOrder = await prisma.affiliateOrder.findUnique({
      where: { orderId: order.id.toString() },
    });

    if (!existingOrder) {
      console.log(`[Shopify] Cancelled order ${order.id} not found in system`);
      return;
    }

    // Update order status
    await prisma.affiliateOrder.update({
      where: { orderId: order.id.toString() },
      data: {
        status: 'CANCELLED',
        financialStatus: 'cancelled',
        updatedAt: new Date(),
      },
    });

    // Reverse affiliate stats if order was pending
    if (existingOrder.status === 'PENDING') {
      await prisma.affiliateProfile.update({
        where: { id: existingOrder.affiliateId },
        data: {
          totalConversions: { decrement: 1 },
          totalEarnings: { decrement: existingOrder.commissionAmount },
        },
      });
    }

    console.log(`[Shopify] Cancelled order ${order.name}`);
  } catch (error) {
    console.error('[Shopify] Error cancelling order:', error);
    throw error;
  }
}

/**
 * Handle refund
 */
async function handleRefund(order: ShopifyOrder, storeId: string) {
  try {
    const existingOrder = await prisma.affiliateOrder.findUnique({
      where: { orderId: order.id.toString() },
    });

    if (!existingOrder) {
      console.log(`[Shopify] Refunded order ${order.id} not found in system`);
      return;
    }

    // Update order status
    await prisma.affiliateOrder.update({
      where: { orderId: order.id.toString() },
      data: {
        status: 'REFUNDED',
        financialStatus: 'refunded',
        updatedAt: new Date(),
      },
    });

    // Reverse affiliate stats if order was pending or approved
    if (['PENDING', 'APPROVED'].includes(existingOrder.status)) {
      await prisma.affiliateProfile.update({
        where: { id: existingOrder.affiliateId },
        data: {
          totalConversions: { decrement: 1 },
          totalEarnings: { decrement: existingOrder.commissionAmount },
        },
      });
    }

    console.log(`[Shopify] Refunded order ${order.name}`);
  } catch (error) {
    console.error('[Shopify] Error handling refund:', error);
    throw error;
  }
}

/**
 * Get all connected stores
 */
export async function getStores(req: Request, res: Response) {
  try {
    const stores = shopifyService.getAllStores();
    
    // Test connection for each store
    const storesWithStatus = await Promise.all(
      stores.map(async (store) => {
        const connection = await shopifyService.testConnection(store.id);
        return {
          id: store.id,
          name: store.name,
          domain: store.domain,
          currency: store.currency,
          country: store.country,
          connected: connection.success,
          shopName: connection.shop?.name,
          error: connection.error,
        };
      })
    );

    res.json({ stores: storesWithStatus });
  } catch (error) {
    console.error('[Shopify] Error getting stores:', error);
    res.status(500).json({ error: 'Failed to get stores' });
  }
}

/**
 * Test store connection
 */
export async function testConnection(req: Request, res: Response) {
  try {
    const { storeId } = req.params;
    const result = await shopifyService.testConnection(storeId);
    res.json(result);
  } catch (error) {
    console.error('[Shopify] Error testing connection:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
}

/**
 * Sync orders from Shopify for an affiliate
 */
export async function syncAffiliateOrders(req: Request, res: Response) {
  try {
    const { affiliateId } = req.params;
    const { days = 30 } = req.query;

    // Get affiliate's discount codes
    const coupons = await prisma.coupon.findMany({
      where: {
        affiliateId,
        status: 'ACTIVE',
      },
    });

    if (coupons.length === 0) {
      return res.json({ message: 'No discount codes found', synced: 0 });
    }

    const discountCodes = coupons.map(c => c.code);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    // Fetch orders from all stores
    const orders = await shopifyService.getOrdersByDiscountCodesAllStores(
      discountCodes,
      { created_at_min: startDate.toISOString() }
    );

    let synced = 0;
    let skipped = 0;

    for (const order of orders) {
      const existingOrder = await prisma.affiliateOrder.findUnique({
        where: { orderId: order.id.toString() },
      });

      if (existingOrder) {
        skipped++;
        continue;
      }

      const coupon = coupons.find(
        c => c.code.toUpperCase() === order.matchedCode.toUpperCase()
      );

      if (coupon) {
        const affiliate = await prisma.affiliateProfile.findUnique({
          where: { id: affiliateId },
        });

        if (affiliate) {
          const orderValue = parseFloat(order.total_price);
          const commissionRate = affiliate.commissionRate / 100 || DEFAULT_COMMISSION_RATE;
          const commissionAmount = orderValue * commissionRate;

          await prisma.affiliateOrder.create({
            data: {
              affiliateId,
              referralCode: order.matchedCode,
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
              status: 'PENDING',
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
      }
    }

    res.json({
      message: 'Sync completed',
      synced,
      skipped,
      total: orders.length,
    });
  } catch (error) {
    console.error('[Shopify] Error syncing orders:', error);
    res.status(500).json({ error: 'Failed to sync orders' });
  }
}

/**
 * Manual sync all orders from Shopify (admin only)
 */
export async function syncAllOrders(req: Request, res: Response) {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    // Get all active coupons
    const coupons = await prisma.coupon.findMany({
      where: { status: 'ACTIVE' },
      include: {
        affiliate: true,
      },
    });

    if (coupons.length === 0) {
      return res.json({ message: 'No discount codes found', synced: 0 });
    }

    const discountCodes = coupons.map(c => c.code);

    // Fetch orders from all stores
    const orders = await shopifyService.getOrdersByDiscountCodesAllStores(
      discountCodes,
      { created_at_min: startDate.toISOString() }
    );

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const order of orders) {
      try {
        const existingOrder = await prisma.affiliateOrder.findUnique({
          where: { orderId: order.id.toString() },
        });

        if (existingOrder) {
          skipped++;
          continue;
        }

        const coupon = coupons.find(
          c => c.code.toUpperCase() === order.matchedCode.toUpperCase()
        );

        if (coupon && coupon.affiliate) {
          const orderValue = parseFloat(order.total_price);
          const commissionRate = coupon.affiliate.commissionRate / 100 || DEFAULT_COMMISSION_RATE;
          const commissionAmount = orderValue * commissionRate;

          await prisma.affiliateOrder.create({
            data: {
              affiliateId: coupon.affiliateId,
              referralCode: order.matchedCode,
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
              status: 'PENDING',
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
      } catch (err) {
        errors++;
        console.error(`[Shopify] Error syncing order ${order.id}:`, err);
      }
    }

    res.json({
      message: 'Sync completed',
      synced,
      skipped,
      errors,
      total: orders.length,
    });
  } catch (error) {
    console.error('[Shopify] Error syncing all orders:', error);
    res.status(500).json({ error: 'Failed to sync orders' });
  }
}

export default {
  handleOrderWebhook,
  getStores,
  testConnection,
  syncAffiliateOrders,
  syncAllOrders,
};

