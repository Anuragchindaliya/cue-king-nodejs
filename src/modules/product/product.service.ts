import prisma from '../../config/db';

export const createProduct = async (clubId: string, data: any, imagePath?: string) => {
  return prisma.product.create({
    data: {
      ...data,
      clubId,
      image: imagePath,
      price: parseFloat(data.price),
    },
  });
};

export const getProductsByClub = async (clubId: string) => {
  return prisma.product.findMany({
    where: { clubId },
  });
};
import { Prisma } from '@prisma/client';

export const getAllProducts = async (filters: { name?: string; minPrice?: string; maxPrice?: string; clubId?: string } = {}) => {
  const where: Prisma.ProductWhereInput = {};

  if (filters.name) {
    where.name = { contains: filters.name, mode: 'insensitive' };
  }
  if (filters.clubId) {
    where.clubId = filters.clubId;
  }
  
  if (filters.minPrice || filters.maxPrice) {
    where.price = {};
    if (filters.minPrice) {
      where.price.gte = parseFloat(filters.minPrice);
    }
    if (filters.maxPrice) {
      where.price.lte = parseFloat(filters.maxPrice);
    }
  }

  return prisma.product.findMany({ where, include: { club: true } });
};
