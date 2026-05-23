import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes';

import userRoutes from './modules/user/user.routes';
import locationRoutes from './modules/location/location.routes';

import clubRoutes from './modules/club/club.routes';
import bookingRoutes from './modules/booking/booking.routes';
import productRoutes from './modules/product/product.routes';
import uploadRoutes from './modules/upload/upload.routes';
import tableRoutes from './modules/table/table.routes';
import notificationRoutes from './modules/notification/notification.routes';
import favoritesRoutes from './modules/favorites/favorites.routes';
import reviewsRoutes from './modules/reviews/reviews.routes';
import adminRoutes from './modules/admin/admin.routes';
import lobbyRoutes from './modules/lobby/lobby.routes';
import timerRoutes from './modules/timer/timer.routes';
import financeRoutes from './modules/finance/finance.routes';
import crmRoutes from './modules/crm/crm.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/locations', locationRoutes);
router.use('/clubs', clubRoutes);
router.use('/bookings', bookingRoutes);
router.use('/products', productRoutes);
router.use('/uploads', uploadRoutes);
router.use('/tables', tableRoutes);
router.use('/notifications', notificationRoutes);
router.use('/favorites', favoritesRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/admin', adminRoutes);
router.use('/lobby', lobbyRoutes);
router.use('/timers', timerRoutes);
router.use('/finance', financeRoutes);
router.use('/crm', crmRoutes);

export default router;
