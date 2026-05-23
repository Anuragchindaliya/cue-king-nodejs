import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import prisma from '../../config/db';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  publishLobbyUpdate,
  setupSSEHeaders,
  startHeartbeat,
  registerLobbyClient,
  unregisterLobbyClient
} from '../../services/sse.service';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';

// Fetch the aggregated lobby state (members, votes, messages)
const getLobbyState = async (lobbyId: string) => {
  const lobby: any = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    include: {
      club: {
        select: {
          id: true,
          name: true,
          coverImage: true,
          openingTime: true,
          closingTime: true,
          tables: {
            where: { status: 'AVAILABLE' }
          }
        }
      },
      members: true,
      votes: true,
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 50
      }
    }
  });

  if (!lobby) return null;

  // Format votes into the required gate contract
  const tablesVotes: Record<string, string[]> = {};
  const foodPackagesVotes: Record<string, string[]> = {};
  const timeslotsVotes: Record<string, string[]> = {};

  // Initialize tables
  if (lobby.club && Array.isArray(lobby.club.tables)) {
    lobby.club.tables.forEach((table: any) => {
      tablesVotes[table.id] = [];
    });
  }

  // Group votes by type
  if (Array.isArray(lobby.votes)) {
    lobby.votes.forEach((vote: any) => {
      const memberName = lobby.members.find((m: any) => m.id === vote.voterId)?.name || 'Unknown';
      if (vote.itemType === 'TABLE') {
        if (!tablesVotes[vote.itemId]) tablesVotes[vote.itemId] = [];
        tablesVotes[vote.itemId]!.push(memberName);
      } else if (vote.itemType === 'FOOD_PACKAGE') {
        if (!foodPackagesVotes[vote.itemId]) foodPackagesVotes[vote.itemId] = [];
        foodPackagesVotes[vote.itemId]!.push(memberName);
      } else if (vote.itemType === 'TIMESLOT') {
        if (!timeslotsVotes[vote.itemId]) timeslotsVotes[vote.itemId] = [];
        timeslotsVotes[vote.itemId]!.push(memberName);
      }
    });
  }

  return {
    lobbyId: lobby.id,
    clubId: lobby.clubId,
    clubName: lobby.club?.name || '',
    hostId: lobby.hostId,
    isLocked: lobby.isLocked,
    expiresAt: lobby.expiresAt,
    activeUsers: Array.isArray(lobby.members) ? lobby.members.map((m: any) => ({
      id: m.id,
      name: m.name,
      role: m.userId === lobby.hostId ? 'HOST' : 'GUEST',
      status: m.socketId ? 'ONLINE' : 'OFFLINE'
    })) : [],
    tables: lobby.club?.tables || [],
    votes: {
      tables: tablesVotes,
      foodPackages: foodPackagesVotes,
      timeslots: timeslotsVotes
    },
    messages: lobby.messages || []
  };
};

// Create a new Booking Lobby (Host action)
export const createLobby = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { clubId, allowVoting } = req.body;
  const hostId = req.user?.id;
  const hostName = req.user?.name || req.user?.email?.split('@')[0] || 'Host';

  if (!clubId) {
    return sendResponse(res, 400, false, 'clubId is required');
  }

  if (!hostId) {
    return sendResponse(res, 401, false, 'Authentication required');
  }

  // Set expiration to 2 hours from now
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 2);

  // Check if club exists
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) {
    return sendResponse(res, 404, false, 'Club not found');
  }

  // Create Lobby inside db transaction
  const lobby = await prisma.$transaction(async (tx) => {
    const newLobby = await tx.lobby.create({
      data: {
        clubId,
        hostId,
        isLocked: allowVoting !== undefined ? !allowVoting : false,
        expiresAt
      }
    });

    // Add host as the first member
    await tx.lobbyMember.create({
      data: {
        lobbyId: newLobby.id,
        userId: hostId,
        name: hostName,
        socketId: 'online' // host is online on creation
      }
    });

    return newLobby;
  });

  sendResponse(res, 201, true, 'Lobby created successfully', { lobbyId: lobby.id });
});

// Join Lobby (Guests & Users)
export const joinLobby = asyncHandler(async (req: Request, res: Response) => {
  const lobbyId = req.params.lobbyId as string;
  const name = req.body.name as string;

  const lobby: any = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    include: { members: true }
  });

  if (!lobby) {
    return sendResponse(res, 404, false, 'Lobby not found or expired');
  }

  // Check if lobby is expired
  if (new Date() > new Date(lobby.expiresAt)) {
    return sendResponse(res, 410, false, 'This booking lobby has expired');
  }

  // Check if user is logged in
  const authHeader = req.headers.authorization;
  let tokenUser: any = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      tokenUser = jwt.verify(token as string, process.env.JWT_SECRET as string) as any;
    } catch (err) {
      // Ignore token verification errors and treat as guest
    }
  }

  let member = null;

  if (tokenUser && tokenUser.id) {
    // Registered User
    const existingMember = lobby.members.find((m: any) => m.userId === tokenUser.id);
    if (existingMember) {
      member = existingMember;
    } else {
      // Get user nickname
      const dbUser = await prisma.user.findUnique({ where: { id: tokenUser.id } });
      member = await prisma.lobbyMember.create({
        data: {
          lobbyId,
          userId: tokenUser.id,
          name: dbUser?.name || tokenUser.email?.split('@')[0] || name || 'Player',
          socketId: 'online'
        }
      });
    }
  } else {
    // Guest Entry
    if (!name) {
      return sendResponse(res, 400, false, 'Name is required to join as a guest');
    }

    // Check if name is already taken in this lobby
    const nameTaken = lobby.members.some((m: any) => m.name.toLowerCase() === name.toLowerCase());
    const finalName = nameTaken ? `${name}#${Math.floor(100 + Math.random() * 900)}` : name;

    member = await prisma.lobbyMember.create({
      data: {
        lobbyId,
        name: finalName,
        socketId: 'online'
      }
    });
  }

  // Create Guest JWT Token if guest
  let jwtToken = null;
  if (!tokenUser) {
    jwtToken = jwt.sign(
      {
        lobbyId,
        lobbyMemberId: member.id,
        name: member.name,
        isGuest: true
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '2h' }
    );
  }

  // Send System announcement
  await prisma.chatMessage.create({
    data: {
      lobbyId,
      senderName: 'System',
      message: `${member.name} joined the lobby!`
    }
  });

  // Broadcast updated lobby state
  const updatedState = await getLobbyState(lobbyId);
  if (updatedState) {
    await publishLobbyUpdate(lobbyId, 'lobby_state_update', updatedState);
  }

  sendResponse(res, 200, true, 'Joined lobby successfully', {
    member,
    lobby,
    token: jwtToken
  });
});

// SSE Stream Connection for Lobby Events
export const getLobbyEvents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lobbyId = req.params.lobbyId as string;
  const memberId = req.user?.id as string; // Either userId (if registered) or lobbyMemberId (if guest)

  if (!memberId) {
    return sendResponse(res, 401, false, 'Authentication required');
  }

  // Verify lobby member exists
  const member = await prisma.lobbyMember.findFirst({
    where: {
      lobbyId,
      OR: [
        { id: memberId },
        { userId: memberId }
      ]
    }
  });

  if (!member) {
    return sendResponse(res, 403, false, 'Not authorized: You must join the lobby first');
  }

  // Mark member as online in database
  await prisma.lobbyMember.update({
    where: { id: member.id },
    data: { socketId: 'online' }
  });

  // Initialize SSE Headers
  setupSSEHeaders(res);

  // Send initial lobby state
  const initialState = await getLobbyState(lobbyId);
  if (initialState) {
    res.write(`event: lobby_state_update\ndata: ${JSON.stringify(initialState)}\n\n`);
  }

  // Register client
  registerLobbyClient(lobbyId, res);

  // Broadcast updated member online status
  const updatedState = await getLobbyState(lobbyId);
  if (updatedState) {
    await publishLobbyUpdate(lobbyId, 'lobby_state_update', updatedState);
  }

  // Keep connection alive
  const heartbeatInterval = startHeartbeat(res);

  req.on('close', async () => {
    clearInterval(heartbeatInterval);
    unregisterLobbyClient(lobbyId, res);

    try {
      // Mark member offline
      await prisma.lobbyMember.update({
        where: { id: member.id },
        data: { socketId: null }
      });

      // Broadcast offline update
      const offlineState = await getLobbyState(lobbyId);
      if (offlineState) {
        await publishLobbyUpdate(lobbyId, 'lobby_state_update', offlineState);
      }
    } catch (err) {
      // Ignore database errors on close
    }

    res.end();
  });
});

// Cast Vote
export const castVote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lobbyId = req.params.lobbyId as string;
  const { itemType, itemId } = req.body;
  const memberId = req.user?.id as string;

  if (!itemType || !itemId) {
    return sendResponse(res, 400, false, 'itemType and itemId are required');
  }

  if (!memberId) {
    return sendResponse(res, 401, false, 'Authentication required');
  }

  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId }
  });

  if (!lobby) {
    return sendResponse(res, 404, false, 'Lobby not found');
  }

  // Find LobbyMember record
  const member = await prisma.lobbyMember.findFirst({
    where: {
      lobbyId,
      OR: [
        { id: memberId },
        { userId: memberId }
      ]
    }
  });

  if (!member) {
    return sendResponse(res, 403, false, 'You are not a member of this lobby');
  }

  // Check if locked
  if (lobby.isLocked && req.user?.role === 'GUEST') {
    return sendResponse(res, 403, false, 'This parameter has been locked by the host.');
  }

  // Toggle vote
  const existingVote = await prisma.vote.findFirst({
    where: {
      lobbyId,
      voterId: member.id,
      itemType,
      itemId
    }
  });

  let messageText = '';
  if (existingVote) {
    await prisma.vote.delete({ where: { id: existingVote.id } });
    messageText = `${member.name} removed vote for ${itemType.toLowerCase()} ${itemId.substring(0, 8)}`;
  } else {
    await prisma.vote.create({
      data: {
        lobbyId,
        voterId: member.id,
        itemType,
        itemId
      }
    });
    messageText = `${member.name} voted for ${itemType.toLowerCase()} ${itemId.substring(0, 8)}`;
  }

  // Create System message log
  await prisma.chatMessage.create({
    data: {
      lobbyId,
      senderName: 'System',
      message: messageText
    }
  });

  // Broadcast updated lobby state
  const updatedState = await getLobbyState(lobbyId);
  if (updatedState) {
    await publishLobbyUpdate(lobbyId, 'lobby_state_update', updatedState);
  }

  sendResponse(res, 200, true, 'Vote registered successfully');
});

// Send Chat Message
export const sendMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lobbyId = req.params.lobbyId as string;
  const { message } = req.body;
  const memberId = req.user?.id as string;

  if (!message) {
    return sendResponse(res, 400, false, 'Message content is required');
  }

  if (!memberId) {
    return sendResponse(res, 401, false, 'Authentication required');
  }

  const member = await prisma.lobbyMember.findFirst({
    where: {
      lobbyId,
      OR: [
        { id: memberId },
        { userId: memberId }
      ]
    }
  });

  if (!member) {
    return sendResponse(res, 403, false, 'You are not a member of this lobby');
  }

  const chatMessage = await prisma.chatMessage.create({
    data: {
      lobbyId,
      senderName: member.name,
      message
    }
  });

  // Broadcast new chat message
  await publishLobbyUpdate(lobbyId, 'new_message', chatMessage);

  sendResponse(res, 201, true, 'Message sent successfully', chatMessage);
});

// Toggle Lock settings (Host only)
export const toggleLock = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lobbyId = req.params.lobbyId as string;
  const { isLocked } = req.body;
  const hostId = req.user?.id as string;

  const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } });
  if (!lobby) {
    return sendResponse(res, 404, false, 'Lobby not found');
  }

  if (lobby.hostId !== hostId) {
    return sendResponse(res, 403, false, 'Only the host can lock or unlock parameters');
  }

  const updatedLobby = await prisma.lobby.update({
    where: { id: lobbyId },
    data: { isLocked }
  });

  // Create System message log
  await prisma.chatMessage.create({
    data: {
      lobbyId,
      senderName: 'System',
      message: `Host ${isLocked ? 'locked' : 'unlocked'} voting on lobby parameters.`
    }
  });

  // Broadcast updated lobby state
  const updatedState = await getLobbyState(lobbyId);
  if (updatedState) {
    await publishLobbyUpdate(lobbyId, 'lobby_state_update', updatedState);
  }

  sendResponse(res, 200, true, 'Lobby lock setting toggled', updatedLobby);
});

// Finalize Booking (Host only)
export const finalizeBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lobbyId = req.params.lobbyId as string;
  const { tableId, startTime, endTime, totalPrice } = req.body;
  const hostId = req.user?.id as string;

  if (!tableId || !startTime || !endTime) {
    return sendResponse(res, 400, false, 'tableId, startTime, and endTime are required');
  }

  if (!hostId) {
    return sendResponse(res, 401, false, 'Authentication required');
  }

  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    include: { club: true }
  });

  if (!lobby) {
    return sendResponse(res, 404, false, 'Lobby not found');
  }

  if (lobby.hostId !== hostId) {
    return sendResponse(res, 403, false, 'Only the host can finalize the booking');
  }

  try {
    // Database transaction to secure table availability
    const booking = await prisma.$transaction(async (tx) => {
      // Check availability inside transaction
      const overlappingBooking = await tx.booking.findFirst({
        where: {
          tableId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          AND: [
            { startTime: { lt: new Date(endTime) } },
            { endTime: { gt: new Date(startTime) } }
          ]
        }
      });

      if (overlappingBooking) {
        throw new Error('Slot already booked');
      }

      // Create Booking in PENDING state
      return await tx.booking.create({
        data: {
          userId: lobby.hostId, // booking is registered under host's user account
          clubId: lobby.clubId,
          tableId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          status: 'PENDING',
          totalPrice: parseFloat(totalPrice) || 150 // default price if missing
        }
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });

    // Notify all guests that payment is processing (this locks their UI screens)
    await publishLobbyUpdate(lobbyId, 'booking_processing', {
      bookingId: booking.id,
      hostName: req.user?.name || 'Host'
    });

    // Send payment link to host
    const paymentUrl = `/lobby/${lobbyId}/payment?bookingId=${booking.id}&price=${booking.totalPrice}`;
    sendResponse(res, 200, true, 'Booking initiated, proceed to payment', {
      bookingId: booking.id,
      paymentUrl
    });
  } catch (error: any) {
    if (error.message === 'Slot already booked') {
      return sendResponse(res, 409, false, 'Table or timeslot was already booked. Please choose another slot.');
    }
    throw error;
  }
});

// Confirm simulated Payment (Online or Offline later)
export const paymentSuccess = asyncHandler(async (req: Request, res: Response) => {
  const lobbyId = req.params.lobbyId as string;
  const { bookingId, paymentType } = req.body; // paymentType: "ONLINE" or "OFFLINE"

  if (!bookingId || !paymentType) {
    return sendResponse(res, 400, false, 'bookingId and paymentType are required');
  }

  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId }
  });

  if (!lobby) {
    return sendResponse(res, 404, false, 'Lobby not found');
  }

  // Update Booking Status based on online vs offline payment type
  const targetStatus = paymentType === 'ONLINE' ? 'CONFIRMED' : 'PENDING';

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: targetStatus },
    include: { club: true, table: true }
  });

  // Notify all lobby members of redirect stub page
  await publishLobbyUpdate(lobbyId, 'booking_redirect', {
    redirectUrl: `/lobby/${lobbyId}/ticket?bookingId=${bookingId}&paymentType=${paymentType}`
  });

  sendResponse(res, 200, true, 'Booking payment completed successfully', updatedBooking);
});
