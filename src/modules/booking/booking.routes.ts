import { Router } from 'express';
import { createBooking, checkAvailability, getUserBookings, verifyBooking, getOwnerBookings, updateBookingStatus, getClubBookings, getBookingById } from './booking.controller';
import { protect } from '../../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/bookings/club/{clubId}/slots:
 *   get:
 *     summary: Get booked slots for a club by date
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of booked slots
 */
router.get('/club/:clubId/slots', getClubBookings);


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

/**
 * @swagger
 * /api/bookings/owner-bookings:
 *   get:
 *     summary: Get owner bookings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bookings
 */
router.get('/owner-bookings', protect, getOwnerBookings);

/**
 * @swagger
 * /api/bookings/{id}/status:
 *   patch:
 *     summary: Update booking status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', protect, updateBookingStatus);
router.get('/:id', protect, getBookingById);

export default router;
