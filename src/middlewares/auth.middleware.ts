import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { sendResponse } from '../utils/response';

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      if(!token){
        return sendResponse(res, 401, false, 'Not authorized, no token');
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, role: true }, // Don't return password
      });

      if (!user) {
        return sendResponse(res, 401, false, 'Not authorized, user not found');
      }

      req.user = user;
      next();
    } catch (error) {
      return sendResponse(res, 401, false, 'Not authorized, token failed');
    }
  }

  if (!token) {
    return sendResponse(res, 401, false, 'Not authorized, no token');
  }
};
