import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import * as bookingService from './booking.service';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

export const createBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { clubId, tableCategoryId, startTime, endTime } = req.body;
  
  const booking = await bookingService.createBooking(
    req.user.id,
    clubId,
    tableCategoryId,
    new Date(startTime),
    new Date(endTime)
  );

  sendResponse(res, 201, true, 'Booking created successfully', booking);
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
