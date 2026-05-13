import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import locationRoutes from './modules/location/location.routes';
import clubRoutes from './modules/club/club.routes';
import bookingRoutes from './modules/booking/booking.routes';
import productRoutes from './modules/product/product.routes';
const router = Router();
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/locations', locationRoutes);
router.use('/clubs', clubRoutes);
router.use('/bookings', bookingRoutes);
router.use('/products', productRoutes);
export default router;
//# sourceMappingURL=routes.js.map