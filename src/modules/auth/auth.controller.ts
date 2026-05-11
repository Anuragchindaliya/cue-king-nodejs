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
  // Successful authentication, generate token and redirect or return JSON
  const user = req.user as any;
  const token = authService.generateTokenForUser(user);

  // Usually, for OAuth, we redirect to frontend with token in URL or set a cookie.
  // For API standard response, we return json (if frontend handles popup)
  // Example returning JSON (useful if testing via API tools, but standard OAuth requires redirect)
  
  res.status(200).json({
    success: true,
    message: 'Google login successful',
    data: {
      user: { id: user.id, email: user.email, role: user.role },
      token
    }
  });
};
