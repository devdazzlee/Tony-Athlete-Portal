import express, { Router } from 'express';
import { OfferController } from '../controllers/OfferController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router: Router = express.Router();
const offerController = new OfferController();

// All routes require authentication
router.use(authenticateToken);

// Offer management routes
router.get('/', offerController.getAllOffers);
router.get('/:id', offerController.getOfferById);
router.post('/', requireRole(['ADMIN', 'MANAGER']), offerController.createOffer);
router.put('/:id', requireRole(['ADMIN', 'MANAGER']), offerController.updateOffer);
router.delete('/:id', requireRole(['ADMIN']), offerController.deleteOffer);

// Offer applications routes
router.get('/:id/applications', offerController.getOfferApplications);
router.post('/:id/apply', offerController.applyForOffer);
router.put('/applications/:applicationId', requireRole(['ADMIN', 'MANAGER']), offerController.updateApplication);
router.delete('/applications/:applicationId', requireRole(['ADMIN']), offerController.deleteApplication);

// Offer creatives routes
router.get('/:id/creatives', offerController.getOfferCreatives);
router.post('/:id/creatives', requireRole(['ADMIN', 'MANAGER']), offerController.createCreative);
router.put('/creatives/:creativeId', requireRole(['ADMIN', 'MANAGER']), offerController.updateCreative);
router.delete('/creatives/:creativeId', requireRole(['ADMIN']), offerController.deleteCreative);

// Offer analytics routes
router.get('/:id/analytics', offerController.getOfferAnalytics);
router.get('/:id/analytics/clicks', offerController.getOfferClicks);
router.get('/:id/analytics/conversions', offerController.getOfferConversions);

export default router;