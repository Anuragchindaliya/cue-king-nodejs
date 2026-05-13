import prisma from '../../config/db';

export const createClub = async (ownerId: string, data: any) => {
  return prisma.club.create({
    data: {
      ...data,
      ownerId,
    },
  });
};

export const updateClub = async (id: string, ownerId: string, data: any) => {
  return prisma.club.update({
    where: { id },
    data,
  });
};

export const getClubs = async (filters: any = {}) => {
  const whereClause = Object.keys(filters).length > 0 ? filters : undefined;
  
  return prisma.club.findMany({
    ...(whereClause && { where: whereClause }),
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
