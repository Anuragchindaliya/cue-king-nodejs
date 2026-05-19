import prisma from '../../config/db';

export const checkAvailability = async (
  tableCategoryId: string,
  startTime: Date,
  endTime: Date
) => {
  const category = await prisma.tableCategory.findUnique({
    where: { id: tableCategoryId },
  });

  if (!category) {
    throw new Error('Table category not found');
  }

  // Find overlapping bookings
  // A booking overlaps if: booking.startTime < req.endTime AND booking.endTime > req.startTime
  const overlappingBookings = await prisma.booking.count({
    where: {
      tableCategoryId,
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
    available: overlappingBookings < category.quantity,
    remaining: category.quantity - overlappingBookings,
    total: category.quantity,
  };
};

export const createBooking = async (
  userId: string,
  clubId: string,
  tableCategoryId: string,
  startTime: Date,
  endTime: Date
) => {
  const availability = await checkAvailability(tableCategoryId, startTime, endTime);

  if (!availability.available) {
    throw new Error('No tables available for the selected time slot');
  }

  return prisma.booking.create({
    data: {
      userId,
      clubId,
      tableCategoryId,
      startTime,
      endTime,
      status: 'PENDING',
    },
  });
};

export const getUserBookings = async (userId: string) => {
  return prisma.booking.findMany({
    where: { userId },
    include: { club: true, tableCategory: true },
    orderBy: { startTime: 'desc' },
  });
};

export const getOwnerBookings = async (ownerId: string) => {
  return prisma.booking.findMany({
    where: { club: { ownerId } },
    include: {
      user: { select: { id: true, name: true, email: true } },
      club: true,
      tableCategory: true,
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
    include: { club: true },
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
    if (booking.status !== 'PENDING') {
      throw new Error('Can only withdraw pending bookings');
    }
  } else if (role === 'CLUB_OWNER') {
    if (booking.club.ownerId !== userId) {
      throw new Error('Unauthorized: You can only manage bookings for your own clubs');
    }
    if (status !== 'CONFIRMED' && status !== 'REJECTED') {
      throw new Error('Unauthorized: Owners can only accept or reject bookings');
    }
    if (booking.status !== 'PENDING') {
      throw new Error('Can only accept or reject pending bookings');
    }
  } else {
    throw new Error('Unauthorized role');
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: { status: status as any },
  });
};
