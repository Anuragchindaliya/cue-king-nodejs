import { Router } from 'express';
import { searchPlayers, getPlayerMetrics } from './crm.controller';
import { protect } from '../../middlewares/auth.middleware';

const router = Router();

router.use(protect);

router.get('/search', searchPlayers);
router.get('/:id/metrics', getPlayerMetrics);

export default router;
