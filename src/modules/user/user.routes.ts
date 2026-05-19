import { Router } from 'express';
import { getProfile, updateProfile } from './user.controller';
import { protect } from '../../middlewares/auth.middleware';

const router = Router();

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

export default router;
