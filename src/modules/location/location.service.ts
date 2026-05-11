import prisma from '../../config/db';

export const getAllLocations = async () => {
  return prisma.location.findMany();
};

export const createLocation = async (data: { city: string; area: string }) => {
  return prisma.location.create({
    data,
  });
};
