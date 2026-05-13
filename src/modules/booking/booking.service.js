import prisma from '../../config/db';
export const checkAvailability = async (tableCategoryId, startTime, endTime) => {
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
export const createBooking = async (userId, clubId, tableCategoryId, startTime, endTime) => {
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
export const getUserBookings = async (userId) => {
    return prisma.booking.findMany({
        where: { userId },
        include: { club: true, tableCategory: true },
        orderBy: { startTime: 'desc' },
    });
};
//# sourceMappingURL=booking.service.js.map