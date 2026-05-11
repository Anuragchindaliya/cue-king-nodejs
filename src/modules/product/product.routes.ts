import { Router } from 'express';
import { createProduct, getProducts } from './product.controller';
import { protect } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { upload } from '../../middlewares/upload.middleware';

const router = Router();

// Assuming products belong to a specific club: /api/products/club/:clubId
router.get('/club/:clubId', getProducts);
router.post('/club/:clubId', protect, authorize('CLUB_OWNER', 'ADMIN'), upload.single('image'), createProduct);

export default router;
