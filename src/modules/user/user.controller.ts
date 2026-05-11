import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import * as userService from './user.service';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await userService.getUserProfile(req.user.id);
  sendResponse(res, 200, true, 'User profile fetched successfully', user);
});
