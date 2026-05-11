import { Router } from 'express';
import { createBooking, checkAvailability, getUserBookings } from './booking.controller';
import { protect } from '../../middlewares/auth.middleware';

const router = Router();

router.get('/availability', checkAvailability);
router.post('/', protect, createBooking);
router.get('/my-bookings', protect, getUserBookings);

export default router;
