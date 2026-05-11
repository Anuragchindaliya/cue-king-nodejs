import prisma from '../../config/db';

export const createClub = async (ownerId: string, data: any) => {
  return prisma.club.create({
    data: {
      ...data,
      ownerId,
    },
  });
};

export const getClubs = async (filters: any = {}) => {
  return prisma.club.findMany({
    where: filters,
    include: { location: true, tableCategories: true },
  });
};

export const getClubById = async (id: string) => {
  return prisma.club.findUnique({
    where: { id },
    include: { location: true, tableCategories: true },
  });
};

export const addTableCategory = async (clubId: string, data: any) => {
  return prisma.tableCategory.create({
    data: {
      ...data,
      clubId,
    },
  });
};
