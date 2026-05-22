import { Router } from 'express';
import { toggleFavorite, getMyFavorites } from './favorites.controller';
import { protect } from '../../middlewares/auth.middleware';

const router = Router();

router.use(protect);

router.post('/toggle', toggleFavorite);
router.get('/', getMyFavorites);

export default router;
