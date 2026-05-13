import { Router } from 'express';
import { createProduct, getProducts, getAllProducts } from './product.controller';
import { protect } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { upload } from '../../middlewares/upload.middleware';
const router = Router();
// Get all products globally (with filters)
router.get('/', getAllProducts);
// Assuming products belong to a specific club: /api/products/club/:clubId
router.get('/club/:clubId', getProducts);
router.post('/club/:clubId', protect, authorize('CLUB_OWNER', 'ADMIN'), upload.single('image'), createProduct);
export default router;
//# sourceMappingURL=product.routes.js.map