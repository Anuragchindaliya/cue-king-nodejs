import prisma from '../../config/db';

export const getUserProfile = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      telegramChatId: true,
      upiId: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

export const updateUserProfile = async (id: string, name?: string, telegramChatId?: string, upiId?: string) => {
  const data: any = {};
  if (name !== undefined) data.name = name;
  if (telegramChatId !== undefined) data.telegramChatId = telegramChatId;
  if (upiId !== undefined) data.upiId = upiId;

  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      telegramChatId: true,
      upiId: true,
      role: true,
      createdAt: true,
    },
  });
};
