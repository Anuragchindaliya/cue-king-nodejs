import { Router } from 'express';
import { getProfile } from './user.controller';
import { protect } from '../../middlewares/auth.middleware';

const router = Router();

router.get('/profile', protect, getProfile);

export default router;
