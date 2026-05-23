import { Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import prisma from '../../config/db';
import { sendResponse } from '../../utils/response';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { publishNotification } from '../../services/sse.service';

export const startTimer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tableId, playerName, playerPhone, playerEmail, targetMinutes } = req.body;

  if (!tableId) {
    return sendResponse(res, 400, false, 'Table ID is required');
  }

  // Verify table exists
  const table = await prisma.table.findUnique({
    where: { id: tableId as string },
    include: { club: true }
  });

  if (!table) {
    return sendResponse(res, 404, false, 'Table not found');
  }

  // Check if table owner is current user
  if (table.club.ownerId !== req.user?.id) {
    return sendResponse(res, 403, false, 'Unauthorized');
  }

  // Check if table already has an active timer running
  const activeTimer = await prisma.tableTimer.findFirst({
    where: {
      tableId,
      status: 'RUNNING'
    }
  });

  if (activeTimer) {
    return sendResponse(res, 400, false, 'Table already has a running timer');
  }

  // Create table timer
  const timer = await prisma.tableTimer.create({
    data: {
      tableId,
      startTime: new Date(),
      hourlyRate: table.pricePerHour,
      targetMinutes: targetMinutes ? parseInt(targetMinutes) : null,
      playerName,
      playerPhone,
      playerEmail,
      status: 'RUNNING'
    }
  });

  // Mark table as UNAVAILABLE
  await prisma.table.update({
    where: { id: tableId as string },
    data: { status: 'UNAVAILABLE' }
  });

  // Notify active owner sockets/clients via SSE
  if (req.user?.id) {
    await publishNotification(req.user.id, 'timer-status-changed', {
      type: 'TIMER_STARTED',
      timerId: timer.id,
      tableId
    });
  }

  return sendResponse(res, 201, true, 'Timer started successfully', timer);
});

export const stopTimer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const timer = await prisma.tableTimer.findUnique({
    where: { id: id as string },
    include: { table: { include: { club: true } } }
  }) as any;

  if (!timer) {
    return sendResponse(res, 404, false, 'Timer not found');
  }

  if (timer.table.club.ownerId !== req.user?.id) {
    return sendResponse(res, 403, false, 'Unauthorized');
  }

  if (timer.status !== 'RUNNING') {
    return sendResponse(res, 400, false, 'Timer is not currently running');
  }

  const endTime = new Date();
  const elapsedMs = endTime.getTime() - new Date(timer.startTime).getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  // Bill calculation
  const calculatedAmount = Math.max(0, elapsedHours * timer.hourlyRate);

  const updatedTimer = await prisma.tableTimer.update({
    where: { id: id as string },
    data: {
      endTime,
      status: 'STOPPED',
      finalAmount: Math.round((calculatedAmount + Number.EPSILON) * 100) / 100
    }
  });

  // Notify active owner sockets/clients via SSE
  if (req.user?.id) {
    await publishNotification(req.user.id, 'timer-status-changed', {
      type: 'TIMER_STOPPED',
      timerId: timer.id,
      tableId: timer.tableId,
      finalAmount: updatedTimer.finalAmount
    });
  }

  return sendResponse(res, 200, true, 'Timer stopped successfully', updatedTimer);
});

export const saveFinalBill = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { finalAmount } = req.body;

  if (finalAmount === undefined || finalAmount === null) {
    return sendResponse(res, 400, false, 'Final amount is required');
  }

  const timer = await prisma.tableTimer.findUnique({
    where: { id: id as string },
    include: { table: { include: { club: true } } }
  }) as any;

  if (!timer) {
    return sendResponse(res, 404, false, 'Timer not found');
  }

  if (timer.table.club.ownerId !== req.user?.id) {
    return sendResponse(res, 403, false, 'Unauthorized');
  }

  const updatedTimer = await prisma.tableTimer.update({
    where: { id: id as string },
    data: {
      finalAmount: parseFloat(finalAmount),
      status: 'PAID'
    }
  });

  // Reset table status to AVAILABLE
  await prisma.table.update({
    where: { id: timer.tableId as string },
    data: { status: 'AVAILABLE' }
  });

  // Notify active owner sockets/clients via SSE
  if (req.user?.id) {
    await publishNotification(req.user.id, 'timer-status-changed', {
      type: 'TIMER_PAID',
      timerId: timer.id,
      tableId: timer.tableId,
      finalAmount: updatedTimer.finalAmount
    });
  }

  return sendResponse(res, 200, true, 'Bill finalized and payment marked complete', updatedTimer);
});

export const getActiveTimers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { clubId } = req.query;

  if (!clubId) {
    return sendResponse(res, 400, false, 'Club ID is required');
  }

  // Verify club belongs to user
  const club = await prisma.club.findUnique({
    where: { id: clubId as string }
  });

  if (!club) {
    return sendResponse(res, 404, false, 'Club not found');
  }

  if (club.ownerId !== req.user?.id) {
    return sendResponse(res, 403, false, 'Unauthorized');
  }

  const timers = await prisma.tableTimer.findMany({
    where: {
      table: { clubId: clubId as string },
      status: { in: ['RUNNING', 'STOPPED'] }
    },
    include: {
      table: true
    },
    orderBy: {
      startTime: 'desc'
    }
  });

  return sendResponse(res, 200, true, 'Active timers fetched successfully', timers);
});
