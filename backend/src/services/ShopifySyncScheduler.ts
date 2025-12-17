/**
 * ShopifySyncScheduler - Handles scheduled auto-sync of Shopify orders
 * 
 * Runs hourly to sync orders from all connected Shopify stores
 */

import { PrismaClient } from '@prisma/client';
import shopifyService from './ShopifyService';

const prisma = new PrismaClient();

// Default commission rate (10%)
const DEFAULT_COMMISSION_RATE = 0.10;

// Sync interval in milliseconds (1 hour)
const SYNC_INTERVAL = 60 * 60 * 1000;

// Track if scheduler is running
let isSchedulerRunning = false;
let syncIntervalId: NodeJS.Timeout | null = null;

/**
 * Sync orders from all Shopify stores
 */
async function syncAllStores(): Promise<{
  success: boolean;
  storesSynced: number;
  ordersProcessed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let ordersProcessed = 0;
  let storesSynced = 0;

  try {
    console.log('[Shopify Sync] Starting scheduled sync...');

    // Get all active stores from database
    const stores = await prisma.shopifyStore.findMany({
      where: { isActive: true },
    });

    if (stores.length === 0) {
      console.log('[Shopify Sync] No active stores found');
      return { success: true, storesSynced: 0, ordersProcessed: 0, errors: [] };
    }

    // Get all active affiliates with their discount codes
    const affiliates = await prisma.affiliateProfile.findMany({
      where: { status: 'ACTIVE' },
      include: {
        coupons: {
          where: { status: 'ACTIVE' },
          select: { code: true },
        },
        referralCodes: {
          where: { isActive: true },
          select: { code: true },
        },
      },
    });

    // Build a map of discount codes to affiliates
    const codeToAffiliate = new Map<string, { id: string; commissionRate: number }>();
    for (const affiliate of affiliates) {
      const codes = [
        ...affiliate.coupons.map(c => c.code.toLowerCase()),
        ...affiliate.referralCodes.map(r => r.code.toLowerCase()),
      ];
      for (const code of codes) {
        codeToAffiliate.set(code, {
          id: affiliate.id,
          commissionRate: affiliate.commissionRate / 100 || DEFAULT_COMMISSION_RATE,
        });
      }
    }

    // Sync each store
    for (const store of stores) {
      try {
        console.log(`[Shopify Sync] Syncing store: ${store.name}`);

        // Fetch orders from last 24 hours (to catch any missed orders)
        const orders = await shopifyService.getOrders(store.storeId, {
          status: 'any',
          limit: 250,
          created_at_min: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        });

        let storeOrdersProcessed = 0;

        for (const order of orders) {
          // Skip orders without discount codes
          if (!order.discount_codes || order.discount_codes.length === 0) {
            continue;
          }

          // Check if order already exists
          const existingOrder = await prisma.affiliateOrder.findFirst({
            where: { shopifyOrderId: order.id.toString() },
          });

          if (existingOrder) {
            // Update status if changed
            if (existingOrder.financialStatus !== order.financial_status ||
                existingOrder.fulfillmentStatus !== order.fulfillment_status) {
              await prisma.affiliateOrder.update({
                where: { id: existingOrder.id },
                data: {
                  financialStatus: order.financial_status,
                  fulfillmentStatus: order.fulfillment_status,
                  orderValue: parseFloat(order.total_price),
                  updatedAt: new Date(),
                },
              });
            }
            continue;
          }

          // Find matching affiliate by discount code
          for (const discount of order.discount_codes) {
            const affiliate = codeToAffiliate.get(discount.code.toLowerCase());
            if (affiliate) {
              const orderValue = parseFloat(order.total_price);
              const commissionAmount = orderValue * affiliate.commissionRate;

              // Create affiliate order
              await prisma.affiliateOrder.create({
                data: {
                  affiliateId: affiliate.id,
                  referralCode: discount.code,
                  storeId: store.id,
                  orderId: order.order_number?.toString() || order.id.toString(),
                  shopifyOrderId: order.id.toString(),
                  orderValue: orderValue,
                  currency: order.currency,
                  customerEmail: order.email || order.customer?.email,
                  commissionAmount: commissionAmount,
                  commissionRate: affiliate.commissionRate * 100,
                  status: 'PENDING',
                  financialStatus: order.financial_status,
                  fulfillmentStatus: order.fulfillment_status,
                  items: order.line_items,
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

              storeOrdersProcessed++;
              break; // Only process first matching discount code
            }
          }
        }

        // Update store last sync time
        await prisma.shopifyStore.update({
          where: { id: store.id },
          data: { lastSyncAt: new Date() },
        });

        ordersProcessed += storeOrdersProcessed;
        storesSynced++;
        console.log(`[Shopify Sync] Store ${store.name}: ${storeOrdersProcessed} new orders processed`);
      } catch (error: any) {
        const errorMsg = `Store ${store.name}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`[Shopify Sync] Error syncing store ${store.name}:`, error);
      }
    }

    console.log(`[Shopify Sync] Completed. Stores: ${storesSynced}, Orders: ${ordersProcessed}`);
    return { success: errors.length === 0, storesSynced, ordersProcessed, errors };
  } catch (error: any) {
    console.error('[Shopify Sync] Fatal error:', error);
    return { success: false, storesSynced, ordersProcessed, errors: [error.message] };
  }
}

/**
 * Start the auto-sync scheduler
 */
function startScheduler(): void {
  if (isSchedulerRunning) {
    console.log('[Shopify Sync] Scheduler already running');
    return;
  }

  console.log('[Shopify Sync] Starting scheduler (hourly sync)');
  isSchedulerRunning = true;

  // Run immediately on start
  syncAllStores().catch(console.error);

  // Schedule hourly sync
  syncIntervalId = setInterval(() => {
    syncAllStores().catch(console.error);
  }, SYNC_INTERVAL);
}

/**
 * Stop the auto-sync scheduler
 */
function stopScheduler(): void {
  if (!isSchedulerRunning) {
    console.log('[Shopify Sync] Scheduler not running');
    return;
  }

  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }

  isSchedulerRunning = false;
  console.log('[Shopify Sync] Scheduler stopped');
}

/**
 * Get scheduler status
 */
function getSchedulerStatus(): {
  running: boolean;
  interval: string;
} {
  return {
    running: isSchedulerRunning,
    interval: '1 hour',
  };
}

/**
 * Manually trigger a sync
 */
async function triggerSync(): Promise<{
  success: boolean;
  storesSynced: number;
  ordersProcessed: number;
  errors: string[];
}> {
  return syncAllStores();
}

export default {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  triggerSync,
  syncAllStores,
};

