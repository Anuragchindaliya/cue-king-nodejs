import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import prisma from '../../config/db';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

// Fetch notifications for current user
export const getMyNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  });

  sendResponse(res, 200, true, 'Notifications fetched successfully', notifications);
});

// Mark single notification as read
export const markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  const notif = await prisma.notification.findFirst({
    where: { id, userId: req.user.id },
  });

  if (!notif) {
    return sendResponse(res, 404, false, 'Notification not found');
  }

  const updatedNotif = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  sendResponse(res, 200, true, 'Notification marked as read', updatedNotif);
});

// Mark all notifications as read
export const markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true },
  });

  sendResponse(res, 200, true, 'All notifications marked as read');
});
