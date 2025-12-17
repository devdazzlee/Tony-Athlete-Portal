import { Router } from 'express';
import { OffersController } from '../controllers/OffersController';
import { authenticateToken } from '../middleware/auth';

const router: Router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// CRUD Operations
router.post('/', OffersController.createOffer);
router.get('/', OffersController.listOffers);
router.get('/dashboard', OffersController.getOffersDashboard);
router.get('/stats', OffersController.getOfferStats);
router.post('/default', OffersController.createDefaultOffers);

// Individual Offer Operations
router.get('/:id', OffersController.getOffer);
router.put('/:id', OffersController.updateOffer);
router.delete('/:id', OffersController.deleteOffer);
router.post('/:id/stats/update', OffersController.updateStats);

// Landing Pages Management
router.post('/:offerId/landing-pages', OffersController.addLandingPage);
router.put('/:offerId/landing-pages/:landingPageId', OffersController.updateLandingPage);
router.delete('/:offerId/landing-pages/:landingPageId', OffersController.removeLandingPage);

// Creatives Management
router.post('/:offerId/creatives', OffersController.addCreative);
router.put('/:offerId/creatives/:creativeId', OffersController.updateCreative);
router.delete('/:offerId/creatives/:creativeId', OffersController.removeCreative);

// Integrations Management
router.post('/:offerId/integrations', OffersController.addIntegration);
router.put('/:offerId/integrations/:integrationId', OffersController.updateIntegration);
router.delete('/:offerId/integrations/:integrationId', OffersController.removeIntegration);

// Tracking Code Generation
router.post('/:offerId/tracking-code', OffersController.generateTrackingCode);

// Offer Applications
router.post('/:offerId/applications', OffersController.createApplication);
router.get('/:offerId/applications', OffersController.getApplications);
router.get('/applications/:id', OffersController.getApplication);
router.put('/applications/:id/status', OffersController.updateApplicationStatus);

export default router;


