import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import * as bookingService from './booking.service';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import { notifyVendor, notifyPlayer, createAppNotification } from '../../services/notification.service';
import { emitToOwner, emitToClub } from '../../config/socket';
import { publishNotification } from '../../services/sse.service';
import jwt from 'jsonwebtoken';
import prisma from '../../config/db';

export const createBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { clubId, tableId, startTime, endTime } = req.body;
  
  try {
    const booking = await bookingService.createBooking(
      req.user.id,
      clubId,
      tableId,
      new Date(startTime),
      new Date(endTime)
    );

    // Trigger notifications asynchronously
    notifyVendor(booking.id).catch(console.error);
    createAppNotification(
      booking.club.ownerId,
      'BOOKING_CREATED',
      'New Booking Request',
      `A new booking has been requested for ${booking.table.name} at ${booking.club.name} by ${booking.user.name || booking.user.email}.`
    ).catch(console.error);

    // Send real-time updates via Socket.IO
    emitToOwner(booking.club.ownerId, 'new-booking', booking);
    // Send real-time updates via Server-Sent Events (SSE)
    publishNotification(booking.club.ownerId, 'new-booking', booking).catch(console.error);
    emitToClub(booking.clubId, 'availability-updated', {
      clubId: booking.clubId,
      tableId: booking.tableId,
    });

    sendResponse(res, 201, true, 'Booking created successfully', booking);
  } catch (error: any) {
    if (error.code === 'P2034' || error.message === 'Slot already booked') {
      return sendResponse(res, 409, false, 'Slot already booked. Please choose another slot.');
    }
    throw error;
  }
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
  const { tableId, startTime, endTime } = req.query;

  if (!tableId || !startTime || !endTime) {
    return sendResponse(res, 400, false, 'tableId, startTime, and endTime are required');
  }

  const availability = await bookingService.checkAvailability(
    tableId as string,
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

export const getClubBookings = asyncHandler(async (req: Request, res: Response) => {
  const { clubId } = req.params;
  const { date } = req.query;

  if (!clubId || !date) {
    return sendResponse(res, 400, false, 'clubId and date query param are required');
  }

  const bookings = await bookingService.getClubBookingsForDate(clubId as string, date as string);
  sendResponse(res, 200, true, 'Club bookings fetched successfully', bookings);
});

export const getBookingById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      club: {
        include: { location: true }
      },
      table: true,
      user: { select: { id: true, name: true, email: true } }
    }
  });

  if (!booking) {
    return sendResponse(res, 404, false, 'Booking not found');
  }

  sendResponse(res, 200, true, 'Booking fetched successfully', booking);
});

