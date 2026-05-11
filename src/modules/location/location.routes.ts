import { Router } from 'express';
import { getLocations, addLocation } from './location.controller';
import { protect, authorize } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware'; // Wait, let's just use authorize

const router = Router();

router.get('/', getLocations);

// Only admins can add locations
import { authorize as requireRole } from '../../middlewares/role.middleware';
router.post('/', protect, requireRole('ADMIN'), addLocation);

export default router;
