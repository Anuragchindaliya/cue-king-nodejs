import { Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import prisma from '../../config/db';
import { sendResponse } from '../../utils/response';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const searchPlayers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = (req.query.query as string || '').trim().toLowerCase();

  // Find all clubs owned by this owner
  const ownerClubs = await prisma.club.findMany({
    where: { ownerId: req.user?.id }
  });
  const clubIds = ownerClubs.map(c => c.id);

  // 1. Get registered players who have booked at owner's clubs
  const bookings = await prisma.booking.findMany({
    where: { clubId: { in: clubIds } },
    include: { user: true }
  });

  const bookedUsersMap = new Map<string, any>();
  bookings.forEach((b: any) => {
    if (b.user) {
      bookedUsersMap.set(b.user.id, {
        id: b.user.id,
        name: b.user.name || 'Anonymous Player',
        email: b.user.email,
        phone: b.user.phoneNumber || null,
        type: 'REGISTERED'
      });
    }
  });

  // 2. Get walk-in players entered in previous timers
  const timers = await prisma.tableTimer.findMany({
    where: {
      table: { clubId: { in: clubIds } }
    }
  });

  const walkInsMap = new Map<string, any>();
  timers.forEach((t: any) => {
    if (t.playerName || t.playerPhone || t.playerEmail) {
      // Use phone or email as unique key for walk-ins
      const key = (t.playerPhone || t.playerEmail || t.playerName || '').toLowerCase();
      walkInsMap.set(key, {
        id: key,
        name: t.playerName || 'Walk-in Player',
        email: t.playerEmail || null,
        phone: t.playerPhone || null,
        type: 'WALK_IN'
      });
    }
  });

  let results = [...bookedUsersMap.values(), ...walkInsMap.values()];

  // If a search query is provided, filter the results
  if (query) {
    results = results.filter(p => 
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.email && p.email.toLowerCase().includes(query)) ||
      (p.phone && p.phone.includes(query))
    );

    // If query looks like an exact email or phone number, and it isn't in previous interactions, 
    // search the global User table to allow onboarding them.
    const isEmail = query.includes('@');
    const isPhone = /^\d{5,15}$/.test(query);

    if (results.length === 0 && (isEmail || isPhone)) {
      const globalUsers = await prisma.user.findMany({
        where: {
          OR: [
            isEmail ? { email: { equals: query, mode: 'insensitive' } } : {},
            isPhone ? { phoneNumber: { contains: query } } : {}
          ]
        },
        take: 5
      });

      globalUsers.forEach(gu => {
        results.push({
          id: gu.id,
          name: gu.name || 'Registered Player',
          email: gu.email,
          phone: gu.phoneNumber || null,
          type: 'REGISTERED'
        });
      });
    }
  }

  return sendResponse(res, 200, true, 'Players searched successfully', results);
});

export const getPlayerMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params; // Can be a userId or a walk-in phone/email key
  const { type, email, phone } = req.query;

  // Find all clubs owned by this owner
  const ownerClubs = await prisma.club.findMany({
    where: { ownerId: req.user?.id }
  });
  const clubIds = ownerClubs.map(c => c.id);

  let bookings: any[] = [];
  let timers: any[] = [];
  let name = 'Player';
  let playerEmail = (email as string) || '';
  let playerPhone = (phone as string) || '';

  if (type === 'REGISTERED') {
    const user = await prisma.user.findUnique({
      where: { id: id as string }
    });
    if (user) {
      name = user.name || 'Anonymous Player';
      playerEmail = user.email;
      playerPhone = user.phoneNumber || '';

      bookings = await prisma.booking.findMany({
        where: {
          userId: id as string,
          clubId: { in: clubIds },
          status: { in: ['CONFIRMED', 'COMPLETED'] }
        },
        include: { table: true, club: true },
        orderBy: { startTime: 'desc' }
      });
    }
  }

  // Query timers matching email/phone/name
  timers = await prisma.tableTimer.findMany({
    where: {
      table: { clubId: { in: clubIds } },
      status: 'PAID',
      OR: [
        playerEmail ? { playerEmail: { equals: playerEmail, mode: 'insensitive' } } : {},
        playerPhone ? { playerPhone } : {},
        (!playerEmail && !playerPhone) ? { playerName: { equals: id as string, mode: 'insensitive' } } : {}
      ]
    },
    include: { table: true },
    orderBy: { startTime: 'desc' }
  });

  if (timers.length > 0 && name === 'Player') {
    name = timers[0].playerName || 'Walk-in Player';
  }

  // Calculate Metrics
  const bookingSpend = bookings.reduce((sum, b) => sum + b.totalPrice, 0);
  const timerSpend = timers.reduce((sum, t) => sum + (t.finalAmount || 0), 0);
  const totalSpend = bookingSpend + timerSpend;
  const frequency = bookings.length + timers.length;

  // Find Preferred Table
  const tableCounts = new Map<string, number>();
  bookings.forEach((b: any) => {
    if (b.table?.name) {
      tableCounts.set(b.table.name, (tableCounts.get(b.table.name) || 0) + 1);
    }
  });
  timers.forEach((t: any) => {
    if (t.table?.name) {
      tableCounts.set(t.table.name, (tableCounts.get(t.table.name) || 0) + 1);
    }
  });

  let preferredTable = 'None';
  let maxCount = 0;
  tableCounts.forEach((count, table) => {
    if (count > maxCount) {
      maxCount = count;
      preferredTable = table;
    }
  });

  // Construct combined booking + timer history sorted by date
  const history = [
    ...bookings.map((b: any) => ({
      id: b.id,
      type: 'BOOKING',
      date: b.startTime,
      tableName: b.table?.name || 'Unknown Table',
      clubName: b.club?.name || 'Unknown Club',
      amount: b.totalPrice,
      status: b.status
    })),
    ...timers.map((t: any) => ({
      id: t.id,
      type: 'WALK_IN_TIMER',
      date: t.startTime,
      tableName: t.table?.name || 'Unknown Table',
      clubName: 'Club Desk Walk-in',
      amount: t.finalAmount || 0,
      status: t.status
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return sendResponse(res, 200, true, 'Player metrics fetched successfully', {
    name,
    email: playerEmail || 'N/A',
    phone: playerPhone || 'N/A',
    metrics: {
      totalSpend: Math.round((totalSpend + Number.EPSILON) * 100) / 100,
      frequency,
      preferredTable
    },
    history
  });
});
