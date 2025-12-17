/**
 * Shopify Routes
 * 
 * Handles:
 * - Webhook endpoints (no auth - verified by Shopify signature)
 * - Store management endpoints (admin auth)
 * - Order sync endpoints (auth required)
 */

import express, { Router } from 'express';
import { authenticateToken, requireAdmin, requireRole } from '../middleware/auth';
import ShopifyController from '../controllers/ShopifyController';

const router: Router = express.Router();

// ==================== WEBHOOK ENDPOINTS (No Auth) ====================
// These endpoints receive webhooks from Shopify

/**
 * POST /api/shopify/webhooks/orders
 * Receives order webhooks from Shopify (create, update, paid, cancelled)
 */
router.post('/webhooks/orders', express.json({ verify: (req: any, res, buf) => {
  // Store raw body for signature verification
  req.rawBody = buf.toString();
}}), ShopifyController.handleOrderWebhook);

/**
 * POST /api/webhooks/shopify
 * Alternative webhook endpoint (for backward compatibility)
 */
router.post('/webhooks/shopify', express.json({ verify: (req: any, res, buf) => {
  req.rawBody = buf.toString();
}}), ShopifyController.handleOrderWebhook);

// ==================== STORE MANAGEMENT (Admin Only) ====================

/**
 * GET /api/shopify/stores
 * Get all connected Shopify stores with status
 */
router.get('/stores', authenticateToken, requireRole(['ADMIN', 'MANAGER']), ShopifyController.getStores);

/**
 * GET /api/shopify/stores/:storeId/test
 * Test connection to a specific store
 */
router.get('/stores/:storeId/test', authenticateToken, requireAdmin, ShopifyController.testConnection);

/**
 * POST /api/shopify/sync
 * Sync all orders from Shopify (admin only)
 */
router.post('/sync', authenticateToken, requireAdmin, ShopifyController.syncAllOrders);

// ==================== AFFILIATE ORDER SYNC ====================

/**
 * POST /api/shopify/affiliates/:affiliateId/sync
 * Sync orders for a specific affiliate
 */
router.post('/affiliates/:affiliateId/sync', authenticateToken, ShopifyController.syncAffiliateOrders);

export default router;

