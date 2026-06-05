import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import * as chatService from './chat.service';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import { emitToUser } from '../../config/socket';
import prisma from '../../config/db';

// Start a new chat room or get existing one
export const startChat = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { productId } = req.body;
  const buyerId = req.user.id;

  if (!productId) {
    return sendResponse(res, 400, false, 'Product ID is required');
  }

  try {
    const room = await chatService.getOrCreateRoom(productId, buyerId);
    sendResponse(res, 200, true, 'Chat room retrieved successfully', room);
  } catch (error: any) {
    sendResponse(res, 400, false, error.message || 'Failed to start chat room');
  }
});

// Get list of chat rooms for logged in user
export const getRooms = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;
  const rooms = await chatService.getRoomsForUser(userId);
  sendResponse(res, 200, true, 'Chat rooms fetched successfully', rooms);
});

// Get room details & message history
export const getRoomDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const roomId = req.params.roomId as string;
  const userId = req.user.id as string;

  try {
    const data = await chatService.getRoomWithMessages(roomId, userId);
    sendResponse(res, 200, true, 'Chat messages fetched successfully', data);
  } catch (error: any) {
    sendResponse(res, 400, false, error.message || 'Failed to fetch messages');
  }
});

// Send a message in a chat room
export const sendMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const roomId = req.params.roomId as string;
  const senderId = req.user.id as string;
  const { message: messageText } = req.body;

  if (!messageText || messageText.trim() === '') {
    return sendResponse(res, 400, false, 'Message content is required');
  }

  try {
    // Save message to database
    const savedMessage = await chatService.saveMessage(roomId, senderId, messageText);
    
    // Fetch room to determine recipient
    const room = await prisma.productChatRoom.findUnique({
      where: { id: roomId },
    });

    if (room) {
      const recipientId = room.buyerId === senderId ? room.sellerId : room.buyerId;
      
      // Emit to recipient and sender for real-time sync
      emitToUser(recipientId, 'new-product-message', { roomId, message: savedMessage });
      emitToUser(senderId, 'new-product-message', { roomId, message: savedMessage });
    }

    sendResponse(res, 201, true, 'Message sent successfully', savedMessage);
  } catch (error: any) {
    sendResponse(res, 400, false, error.message || 'Failed to send message');
  }
});
