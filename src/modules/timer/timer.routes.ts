import { Router } from 'express';
import { startTimer, stopTimer, saveFinalBill, getActiveTimers } from './timer.controller';
import { protect } from '../../middlewares/auth.middleware';

const router = Router();

router.use(protect);

router.post('/start', startTimer);
router.post('/:id/stop', stopTimer);
router.post('/:id/finalize', saveFinalBill);
router.get('/active', getActiveTimers);

export default router;
