import prisma from '../../config/db';
import { Prisma } from '@prisma/client';

export const createProduct = async (ownerId: string, data: any, imagePath?: string) => {
  const productData: Prisma.ProductCreateInput = {
    name: data.name,
    description: data.description || null,
    price: parseFloat(data.price),
    image: imagePath || data.image || null,
    condition: data.condition || null,
    age: data.age || null,
    locationName: data.locationName || null,
    lat: data.lat ? parseFloat(data.lat) : null,
    lng: data.lng ? parseFloat(data.lng) : null,
    status: data.status || 'ACTIVE',
    owner: { connect: { id: ownerId } },
  };

  if (data.clubId) {
    productData.club = { connect: { id: data.clubId } };
  }

  return prisma.product.create({
    data: productData,
    include: {
      owner: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
      club: true,
    },
  });
};

export const getProductsByClub = async (clubId: string) => {
  return prisma.product.findMany({
    where: { clubId, status: 'ACTIVE' },
    include: {
      owner: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
      club: true,
    },
  });
};

export const getProductById = async (id: string) => {
  return prisma.product.findUnique({
    where: { id },
    include: {
      owner: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
      club: true,
    },
  });
};

export const getProductsByOwner = async (ownerId: string) => {
  return prisma.product.findMany({
    where: { ownerId },
    include: {
      owner: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
      club: true,
    },
  });
};

export const getAllProducts = async (filters: {
  name?: string;
  minPrice?: string;
  maxPrice?: string;
  clubId?: string;
  condition?: string;
  status?: string;
  excludeOwnerId?: string;
} = {}) => {
  const where: Prisma.ProductWhereInput = {};

  // Default to ACTIVE products unless status is explicitly filtered
  if (filters.status) {
    where.status = filters.status;
  } else {
    where.status = 'ACTIVE';
  }

  if (filters.name) {
    where.name = { contains: filters.name, mode: 'insensitive' };
  }
  if (filters.clubId) {
    where.clubId = filters.clubId;
  }
  if (filters.condition) {
    where.condition = filters.condition;
  }
  if (filters.excludeOwnerId) {
    where.ownerId = { not: filters.excludeOwnerId };
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

  return prisma.product.findMany({
    where,
    include: {
      owner: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
      club: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const updateProduct = async (id: string, userId: string, userRole: string, data: any, imagePath?: string) => {
  // Check existence and authorization
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new Error('Product not found');
  }

  if (product.ownerId !== userId && userRole !== 'ADMIN') {
    throw new Error('Not authorized to update this product');
  }

  const updateData: any = {
    name: data.name,
    description: data.description,
    price: data.price ? parseFloat(data.price) : undefined,
    condition: data.condition,
    age: data.age,
    locationName: data.locationName,
    lat: data.lat ? parseFloat(data.lat) : undefined,
    lng: data.lng ? parseFloat(data.lng) : undefined,
    status: data.status,
  };

  if (imagePath) {
    updateData.image = imagePath;
  }

  if (data.clubId !== undefined) {
    if (data.clubId === null) {
      updateData.club = { disconnect: true };
    } else {
      updateData.club = { connect: { id: data.clubId } };
    }
  }

  return prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      owner: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
      club: true,
    },
  });
};

export const deleteProduct = async (id: string, userId: string, userRole: string) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new Error('Product not found');
  }

  if (product.ownerId !== userId && userRole !== 'ADMIN') {
    throw new Error('Not authorized to delete this product');
  }

  return prisma.product.delete({ where: { id } });
};

export const updateProductStatus = async (id: string, userId: string, userRole: string, status: string) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new Error('Product not found');
  }

  if (product.ownerId !== userId && userRole !== 'ADMIN') {
    throw new Error('Not authorized to update this product status');
  }

  return prisma.product.update({
    where: { id },
    data: { status },
    include: {
      owner: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
      club: true,
    },
  });
};
