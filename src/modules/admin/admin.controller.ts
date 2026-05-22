import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import prisma from '../../config/db';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

// Get platform metrics
export const getPlatformMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const [
    totalUsers,
    totalClubs,
    totalBookings,
    revenueAgg,
    pendingClubs,
    recentBookings,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.club.count(),
    prisma.booking.count(),
    prisma.booking.aggregate({
      where: { status: 'CONFIRMED' },
      _sum: { totalPrice: true },
    }),
    prisma.club.count({ where: { status: 'PENDING' } }),
    prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        club: { select: { name: true } },
      },
    }),
  ]);

  const metrics = {
    totalUsers,
    totalClubs,
    totalBookings,
    totalRevenue: revenueAgg._sum.totalPrice || 0,
    pendingClubs,
    recentBookings,
  };

  sendResponse(res, 200, true, 'Metrics fetched successfully', metrics);
});

// Get all clubs (including pending)
export const getAdminClubs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const clubs = await prisma.club.findMany({
    include: {
      location: true,
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { tables: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  sendResponse(res, 200, true, 'All clubs fetched for admin', clubs);
});

// Update club status (Approve/Reject)
export const updateClubStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const clubId = req.params.clubId as string;
  const { status } = req.body;

  if (!status || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
    return sendResponse(res, 400, false, 'Invalid or missing status');
  }

  const club = await prisma.club.findUnique({
    where: { id: clubId },
  });

  if (!club) {
    return sendResponse(res, 404, false, 'Club not found');
  }

  const updatedClub = await prisma.club.update({
    where: { id: clubId },
    data: { status },
  });

  sendResponse(res, 200, true, `Club status updated to ${status}`, updatedClub);
});

// Get all users
export const getAdminUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { search } = req.query;

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } },
          ],
        }
      : {},
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  sendResponse(res, 200, true, 'Users fetched successfully', users);
});
