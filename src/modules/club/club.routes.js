import { Router } from 'express';
import { createClub, getClubs, getClubById, addTableCategory } from './club.controller';
import { protect } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
const router = Router();
router.get('/', getClubs);
router.get('/:id', getClubById);
// Protected routes
router.post('/', protect, authorize('CLUB_OWNER', 'ADMIN'), createClub);
router.post('/:id/table-categories', protect, authorize('CLUB_OWNER', 'ADMIN'), addTableCategory);
export default router;
//# sourceMappingURL=club.routes.js.map