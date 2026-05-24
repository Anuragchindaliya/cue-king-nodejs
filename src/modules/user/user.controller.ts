import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import * as userService from './user.service';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await userService.getUserProfile(req.user.id);
  sendResponse(res, 200, true, 'User profile fetched successfully', user);
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, telegramChatId, upiId } = req.body;
  const user = await userService.updateUserProfile(req.user.id, name, telegramChatId, upiId);
  sendResponse(res, 200, true, 'User profile updated successfully', user);
});
