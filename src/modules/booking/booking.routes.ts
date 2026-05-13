import { Router } from 'express';
import { createBooking, checkAvailability, getUserBookings, verifyBooking } from './booking.controller';
import { protect } from '../../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/bookings/availability:
 *   get:
 *     summary: Check table availability
 *     responses:
 *       200:
 *         description: Availability details
 */
router.get('/availability', checkAvailability);

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a booking
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Booking created
 */
router.post('/', protect, createBooking);

/**
 * @swagger
 * /api/bookings/my-bookings:
 *   get:
 *     summary: Get user bookings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bookings
 */
router.get('/my-bookings', protect, getUserBookings);

/**
 * @swagger
 * /api/bookings/verify-booking:
 *   get:
 *     summary: Verify a magic link for booking acceptance
 *     responses:
 *       200:
 *         description: Verification successful
 */
router.get('/verify-booking', verifyBooking);

export default router;
