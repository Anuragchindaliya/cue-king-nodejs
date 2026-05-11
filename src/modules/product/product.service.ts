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
