import { Router } from 'express';
import { getLocations, addLocation } from './location.controller';
import { protect } from '../../middlewares/auth.middleware';
import { authorize as requireRole } from '../../middlewares/role.middleware';

const router = Router();

router.get('/', getLocations);

// Only admins can add locations
router.post('/', protect, requireRole('ADMIN'), addLocation);

export default router;
