import prisma from '../../config/db';
import { Prisma } from '@prisma/client';
import { emitToUser, emitToOwner, emitToClub } from '../../config/socket';
import { createAppNotification, notifyVendor, notifyPlayer } from '../../services/notification.service';
import { publishNotification } from '../../services/sse.service';

export const checkAvailability = async (
  tableId: string,
  startTime: Date,
  endTime: Date
) => {
  const table = await prisma.table.findUnique({
    where: { id: tableId },
  });

  if (!table) {
    throw new Error('Table not found');
  }

  if (table.status !== 'AVAILABLE') {
    return {
      available: false,
      reason: 'Table is not available (maintenance or offline)',
    };
  }

  // Find overlapping bookings
  const overlappingBooking = await prisma.booking.findFirst({
    where: {
      tableId,
      status: {
        in: ['PENDING', 'CONFIRMED'],
      },
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    },
  });

  return {
    available: !overlappingBooking,
    pricePerHour: table.pricePerHour,
  };
};

export const createBooking = async (
  userId: string,
  clubId: string,
  tableId: string,
  startTime: Date,
  endTime: Date
) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Get the table details
    const table = await tx.table.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      throw new Error('Table not found');
    }

    if (table.status !== 'AVAILABLE') {
      throw new Error('Table is currently not available');
    }

    // 2. Check for overlapping bookings
    const overlappingBooking = await tx.booking.findFirst({
      where: {
        tableId,
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
    });

    if (overlappingBooking) {
      throw new Error('Slot already booked');
    }

    // Calculate price
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    if (durationHours <= 0) {
      throw new Error('End time must be after start time');
    }
    const totalPrice = table.pricePerHour * durationHours;

    // 3. Create booking
    const booking = await tx.booking.create({
      data: {
        userId,
        clubId,
        tableId,
        startTime,
        endTime,
        status: 'PENDING',
        totalPrice,
      },
      include: {
        table: true,
        club: {
          include: {
            owner: true,
          },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return booking;
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
};

export const getUserBookings = async (userId: string) => {
  return prisma.booking.findMany({
    where: { userId },
    include: { club: true, table: true },
    orderBy: { startTime: 'desc' },
  });
};

export const getOwnerBookings = async (ownerId: string) => {
  return prisma.booking.findMany({
    where: { club: { ownerId } },
    include: {
      user: { select: { id: true, name: true, email: true } },
      club: true,
      table: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const updateBookingStatus = async (
  bookingId: string,
  status: string,
  userId: string,
  role: string
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      club: true,
      table: true,
      user: true,
    },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  if (role === 'PLAYER') {
    if (booking.userId !== userId) {
      throw new Error('Unauthorized: You can only cancel your own bookings');
    }
    if (status !== 'CANCELLED') {
      throw new Error('Unauthorized: Players can only cancel bookings');
    }
    if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
      throw new Error('Cannot cancel completed or already processed bookings');
    }
  } else if (role === 'CLUB_OWNER') {
    if (booking.club.ownerId !== userId) {
      throw new Error('Unauthorized: You can only manage bookings for your own clubs');
    }
    if (status !== 'CONFIRMED' && status !== 'REJECTED' && status !== 'COMPLETED') {
      throw new Error('Unauthorized: Owners can only accept, reject, or complete bookings');
    }
    if (booking.status !== 'PENDING' && status !== 'COMPLETED') {
      throw new Error('Can only accept or reject pending bookings');
    }
  } else if (role !== 'ADMIN') {
    throw new Error('Unauthorized role');
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: status as any },
    include: {
      club: true,
      table: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // 1. Create App Notification & Send Socket notification to player
  let notifType: 'BOOKING_APPROVED' | 'BOOKING_REJECTED' | 'BOOKING_CANCELLED' | 'SYSTEM' = 'SYSTEM';
  let notifTitle = 'Booking Status Updated';
  let notifMessage = `Your booking status has been updated to ${status}.`;

  if (status === 'CONFIRMED') {
    notifType = 'BOOKING_APPROVED';
    notifTitle = 'Booking Confirmed!';
    notifMessage = `Your booking for ${booking.table.name} at ${booking.club.name} has been approved.`;
  } else if (status === 'REJECTED') {
    notifType = 'BOOKING_REJECTED';
    notifTitle = 'Booking Rejected';
    notifMessage = `Your booking for ${booking.table.name} at ${booking.club.name} was rejected.`;
  } else if (status === 'CANCELLED') {
    notifType = 'BOOKING_CANCELLED';
    notifTitle = 'Booking Cancelled';
    notifMessage = `Your booking for ${booking.table.name} at ${booking.club.name} has been cancelled.`;
  }

  // Create database notification and emit via Socket to the player
  await createAppNotification(booking.userId, notifType, notifTitle, notifMessage);

  // Send external notification (Email/Telegram) to player
  if (status === 'CONFIRMED' || status === 'REJECTED') {
    await notifyPlayer(bookingId, status === 'CONFIRMED' ? 'CONFIRMED' : 'CANCELLED');
  }

  // 2. Notify owner if player cancels
  if (role === 'PLAYER' && status === 'CANCELLED') {
    await createAppNotification(
      booking.club.ownerId,
      'BOOKING_CANCELLED',
      'Booking Request Withdrawn',
      `Booking request for ${booking.table.name} at ${booking.club.name} has been withdrawn by ${booking.user.name || booking.user.email}.`
    );
    emitToOwner(booking.club.ownerId, 'booking-cancelled', updatedBooking);
    publishNotification(booking.club.ownerId, 'booking-cancelled', updatedBooking).catch(console.error);
  }

  // 3. Notify all clients on the club page to refresh their availability grid
  emitToClub(booking.clubId, 'availability-updated', {
    clubId: booking.clubId,
    tableId: booking.tableId,
  });

  // Also emit state change to individual player socket
  emitToUser(booking.userId, 'booking-updated', updatedBooking);
  emitToOwner(booking.club.ownerId, 'booking-updated', updatedBooking);

  // Publish via Server-Sent Events (SSE)
  publishNotification(booking.userId, 'booking-updated', updatedBooking).catch(console.error);
  publishNotification(booking.club.ownerId, 'booking-updated', updatedBooking).catch(console.error);

  return updatedBooking;
};

export const getClubBookingsForDate = async (clubId: string, dateStr: string) => {
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

  return prisma.booking.findMany({
    where: {
      clubId,
      status: {
        in: ['PENDING', 'CONFIRMED'],
      },
      startTime: {
        lt: endOfDay,
      },
      endTime: {
        gt: startOfDay,
      },
    },
    select: {
      id: true,
      tableId: true,
      startTime: true,
      endTime: true,
      status: true,
    },
  });
};

