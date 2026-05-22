import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import prisma from '../../config/db';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

// Toggle favorite status
export const toggleFavorite = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { clubId } = req.body;

  if (!clubId) {
    return sendResponse(res, 400, false, 'clubId is required');
  }

  // Verify club exists
  const club = await prisma.club.findUnique({
    where: { id: clubId },
  });

  if (!club) {
    return sendResponse(res, 404, false, 'Club not found');
  }

  const existingFav = await prisma.favorite.findUnique({
    where: {
      userId_clubId: {
        userId: req.user.id,
        clubId,
      },
    },
  });

  if (existingFav) {
    // Remove favorite
    await prisma.favorite.delete({
      where: {
        id: existingFav.id,
      },
    });
    return sendResponse(res, 200, true, 'Club removed from favorites', { favorited: false });
  } else {
    // Add favorite
    const fav = await prisma.favorite.create({
      data: {
        userId: req.user.id,
        clubId,
      },
    });
    return sendResponse(res, 201, true, 'Club added to favorites', { favorited: true, favorite: fav });
  }
});

// Fetch user favorites list
export const getMyFavorites = asyncHandler(async (req: AuthRequest, res: Response) => {
  const favorites = await prisma.favorite.findMany({
    where: { userId: req.user.id },
    include: {
      club: {
        include: {
          location: true,
          tables: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  sendResponse(res, 200, true, 'Favorites fetched successfully', favorites);
});
