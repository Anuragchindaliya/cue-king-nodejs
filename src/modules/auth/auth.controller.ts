import { Request, Response } from 'express';
import * as authService from './auth.service';
import { sendResponse } from '../../utils/response';

export const register = async (req: Request, res: Response) => {
  try {
    const result = await authService.registerUser(req.body);
    sendResponse(res, 201, true, 'User registered successfully', result);
  } catch (error: any) {
    sendResponse(res, 400, false, error.message);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const result = await authService.loginUser(req.body);
    sendResponse(res, 200, true, 'Login successful', result);
  } catch (error: any) {
    sendResponse(res, 401, false, error.message);
  }
};

export const googleCallback = (req: Request, res: Response) => {
  // Successful authentication, generate token and redirect
  const user = req.user as any;
  const token = authService.generateTokenForUser(user);

  // Redirect to frontend with token
  res.redirect(`${req.protocol}://${req.get('host')}/login?token=${token}`);
};
