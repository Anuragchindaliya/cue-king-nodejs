import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import * as bookingService from './booking.service';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import { notifyVendor, notifyPlayer } from '../../services/notification.service';
import jwt from 'jsonwebtoken';
import prisma from '../../config/db';

export const createBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { clubId, tableCategoryId, startTime, endTime } = req.body;
  
  const booking = await bookingService.createBooking(
    req.user.id,
    clubId,
    tableCategoryId,
    new Date(startTime),
    new Date(endTime)
  );

  // Trigger notification asynchronously
  notifyVendor(booking.id).catch(console.error);

  sendResponse(res, 201, true, 'Booking created successfully', booking);
});

export const verifyBooking = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return sendResponse(res, 400, false, 'Invalid or missing token');
  }

  const secret = process.env.JWT_SECRET || 'supersecret_jwt_key_for_cue_king';
  try {
    const decoded = jwt.verify(token, secret) as { bookingId: string, action: 'accept' | 'reject' };
    const status = decoded.action === 'accept' ? 'CONFIRMED' : 'CANCELLED';

    const updatedBooking = await prisma.booking.update({
      where: { id: decoded.bookingId },
      data: { status },
    });

    await notifyPlayer(decoded.bookingId, status);
    
    // Return a simple HTML response for the vendor
    res.send(`<h1>Booking ${status.toLowerCase()} successfully!</h1><p>You can close this window.</p>`);
  } catch (err) {
    return sendResponse(res, 400, false, 'Token expired or invalid');
  }
});

export const checkAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { tableCategoryId, startTime, endTime } = req.query;

  if (!tableCategoryId || !startTime || !endTime) {
    return sendResponse(res, 400, false, 'tableCategoryId, startTime, and endTime are required');
  }

  const availability = await bookingService.checkAvailability(
    tableCategoryId as string,
    new Date(startTime as string),
    new Date(endTime as string)
  );

  sendResponse(res, 200, true, 'Availability checked', availability);
});

export const getUserBookings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const bookings = await bookingService.getUserBookings(req.user.id);
  sendResponse(res, 200, true, 'User bookings fetched', bookings);
});

export const getOwnerBookings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const bookings = await bookingService.getOwnerBookings(req.user.id);
  sendResponse(res, 200, true, 'Owner bookings fetched', bookings);
});

export const updateBookingStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return sendResponse(res, 400, false, 'Status is required');
  }

  const updatedBooking = await bookingService.updateBookingStatus(
    id as string,
    status,
    req.user.id,
    req.user.role as string
  );

  sendResponse(res, 200, true, 'Booking status updated', updatedBooking);
});
