import prisma from '../../config/db';

export const getOrCreateRoom = async (productId: string, buyerId: string) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, ownerId: true },
  });

  if (!product) {
    throw new Error('Product not found');
  }

  const sellerId = product.ownerId;
  if (!sellerId) {
    throw new Error('This product does not have a registered owner');
  }

  if (buyerId === sellerId) {
    throw new Error('You cannot start a chat with yourself');
  }

  // Try to find an existing room
  let room = await prisma.productChatRoom.findUnique({
    where: {
      productId_buyerId_sellerId: {
        productId,
        buyerId,
        sellerId,
      },
    },
    include: {
      product: {
        select: { id: true, name: true, price: true, image: true, status: true },
      },
      buyer: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
      seller: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
    },
  });

  // If not found, create a new one
  if (!room) {
    room = await prisma.productChatRoom.create({
      data: {
        productId,
        buyerId,
        sellerId,
      },
      include: {
        product: {
          select: { id: true, name: true, price: true, image: true, status: true },
        },
        buyer: {
          select: { id: true, name: true, email: true, phoneNumber: true },
        },
        seller: {
          select: { id: true, name: true, email: true, phoneNumber: true },
        },
      },
    });
  }

  return room;
};

export const getRoomsForUser = async (userId: string) => {
  return prisma.productChatRoom.findMany({
    where: {
      OR: [
        { buyerId: userId },
        { sellerId: userId },
      ],
    },
    include: {
      product: {
        select: { id: true, name: true, price: true, image: true, status: true },
      },
      buyer: {
        select: { id: true, name: true, email: true },
      },
      seller: {
        select: { id: true, name: true, email: true },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
};

export const getRoomWithMessages = async (roomId: string, userId: string) => {
  const room = await prisma.productChatRoom.findUnique({
    where: { id: roomId },
    include: {
      product: {
        select: { id: true, name: true, price: true, image: true, status: true, ownerId: true },
      },
      buyer: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
      seller: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
    },
  });

  if (!room) {
    throw new Error('Chat room not found');
  }

  if (room.buyerId !== userId && room.sellerId !== userId) {
    throw new Error('Not authorized to access this chat room');
  }

  const messages = await prisma.productChatMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' },
    include: {
      sender: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return { room, messages };
};

export const saveMessage = async (roomId: string, senderId: string, messageText: string) => {
  const room = await prisma.productChatRoom.findUnique({
    where: { id: roomId },
  });

  if (!room) {
    throw new Error('Chat room not found');
  }

  if (room.buyerId !== senderId && room.sellerId !== senderId) {
    throw new Error('Not authorized to message in this chat room');
  }

  // Create message and update room's updatedAt
  const [message] = await prisma.$transaction([
    prisma.productChatMessage.create({
      data: {
        roomId,
        senderId,
        message: messageText,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.productChatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    }),
  ]);

  return message;
};
