import express, { Router } from 'express';
import { AffiliateController } from '../controllers/AffiliateController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router: Router = express.Router();
const affiliateController = new AffiliateController();

// All routes require authentication
router.use(authenticateToken);

// Public affiliate routes
router.get('/', affiliateController.getAllAffiliates);
router.get('/:id', affiliateController.getAffiliateById);
router.post('/', requireRole(['ADMIN', 'MANAGER']), affiliateController.createAffiliate);
router.put('/:id', requireRole(['ADMIN', 'MANAGER']), affiliateController.updateAffiliate);
router.delete('/:id', requireRole(['ADMIN']), affiliateController.deleteAffiliate);

// Affiliate profile routes
router.get('/profile/me', affiliateController.getMyProfile);
router.put('/profile/me', affiliateController.updateMyProfile);
router.post('/profile/me/avatar', affiliateController.uploadAvatar);

// Affiliate links routes
router.get('/:id/links', affiliateController.getAffiliateLinks);
router.post('/:id/links', affiliateController.createAffiliateLink);
router.put('/links/:linkId', affiliateController.updateAffiliateLink);
router.delete('/links/:linkId', affiliateController.deleteAffiliateLink);

// Affiliate commissions routes
router.get('/:id/commissions', affiliateController.getCommissions);
router.get('/:id/payouts', affiliateController.getPayouts);
router.post('/:id/payouts/request', affiliateController.requestPayout);

// Affiliate analytics routes
router.get('/:id/analytics', affiliateController.getAnalytics);
router.get('/:id/analytics/clicks', affiliateController.getClicksAnalytics);
router.get('/:id/analytics/conversions', affiliateController.getConversionsAnalytics);

export default router;
