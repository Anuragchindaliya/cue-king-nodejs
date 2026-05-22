import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from './db';
import logger from '../utils/logger';

let io: Server | null = null;

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const initSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: '*', // In production, replace with frontend URL
      methods: ['GET', 'POST'],
    },
  });

  // Authentication Middleware for Socket.IO
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      let token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

      if (token && token.startsWith('Bearer ')) {
        token = token.split(' ')[1];
      }

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, role: true },
      });

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      logger.error('Socket authentication failed:', error);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.user) return;

    const userId = socket.user.id;
    const userRole = socket.user.role;

    logger.info(`Socket connected: User ${userId} (${userRole})`);

    // 1. Join user-specific room
    socket.join(`user:${userId}`);

    // 2. Join owner-specific room if they are a club owner or admin
    if (userRole === 'CLUB_OWNER' || userRole === 'ADMIN') {
      socket.join(`owner:${userId}`);
      logger.info(`User ${userId} joined room owner:${userId}`);
    }

    // 3. Handle joining a club room (for active booking selection)
    socket.on('join-club', (clubId: string) => {
      socket.join(`club:${clubId}`);
      logger.info(`User ${userId} joined room club:${clubId}`);
    });

    socket.on('leave-club', (clubId: string) => {
      socket.leave(`club:${clubId}`);
      logger.info(`User ${userId} left room club:${clubId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: User ${userId}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Please call initSocket first.');
  }
  return io;
};

// Helper utilities for broadcasting
export const emitToUser = (userId: string, event: string, data: any) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

export const emitToOwner = (ownerId: string, event: string, data: any) => {
  if (io) {
    io.to(`owner:${ownerId}`).emit(event, data);
  }
};

export const emitToClub = (clubId: string, event: string, data: any) => {
  if (io) {
    io.to(`club:${clubId}`).emit(event, data);
  }
};
