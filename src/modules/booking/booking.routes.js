import { Router } from 'express';
import { createBooking, checkAvailability, getUserBookings, verifyBooking } from './booking.controller';
import { protect } from '../../middlewares/auth.middleware';
const router = Router();
router.get('/availability', checkAvailability);
router.post('/', protect, createBooking);
router.get('/my-bookings', protect, getUserBookings);
router.get('/verify-booking', verifyBooking);
export default router;
//# sourceMappingURL=booking.routes.js.map