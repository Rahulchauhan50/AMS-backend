import { Router } from 'express';
import { SearchController } from './search.controller';
import { protect } from '../../middlewares/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(protect);

/**
 * GET /api/v1/search?q=searchTerm
 * Global search across all entities
 */
router.get('/', SearchController.globalSearch);

/**
 * GET /api/v1/search/advanced?q=searchTerm&type=asset
 * Advanced search with entity type filter
 */
router.get('/advanced', SearchController.advancedSearch);

export default router;
