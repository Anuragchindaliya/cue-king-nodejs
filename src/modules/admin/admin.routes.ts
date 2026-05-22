import { Router } from 'express';
import { getPlatformMetrics, getAdminClubs, updateClubStatus, getAdminUsers } from './admin.controller';
import { protect } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';

const router = Router();

router.use(protect);
router.use(authorize('ADMIN'));

router.get('/metrics', getPlatformMetrics);
router.get('/clubs', getAdminClubs);
router.patch('/clubs/:clubId/status', updateClubStatus);
router.get('/users', getAdminUsers);

export default router;
