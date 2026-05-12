import prisma from '../../config/db';

import { Prisma } from '@prisma/client';

export const getAllLocations = async (filters: { city?: string; area?: string } = {}) => {
  const where: Prisma.LocationWhereInput = {};

  if (filters.city) {
    where.city = { contains: filters.city, mode: 'insensitive' };
  }
  if (filters.area) {
    where.area = { contains: filters.area, mode: 'insensitive' };
  }

  return prisma.location.findMany({ where });
};

export const createLocation = async (data: { city: string; area: string }) => {
  return prisma.location.create({
    data,
  });
};
