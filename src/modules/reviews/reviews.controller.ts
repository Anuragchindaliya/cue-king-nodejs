import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import prisma from '../../config/db';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

// Create a review
export const createReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { clubId, rating, comment } = req.body;

  if (!clubId || rating === undefined) {
    return sendResponse(res, 400, false, 'clubId and rating are required');
  }

  const ratingInt = parseInt(rating);
  if (ratingInt < 1 || ratingInt > 5) {
    return sendResponse(res, 400, false, 'Rating must be between 1 and 5');
  }

  // Verify club exists
  const club = await prisma.club.findUnique({
    where: { id: clubId },
  });

  if (!club) {
    return sendResponse(res, 404, false, 'Club not found');
  }

  // Optional: Check if user has bookings at this club to allow review
  const bookingsCount = await prisma.booking.count({
    where: {
      userId: req.user.id,
      clubId,
      status: 'COMPLETED',
    },
  });

  // Create review
  const review = await prisma.review.create({
    data: {
      userId: req.user.id,
      clubId,
      rating: ratingInt,
      comment,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // Recalculate average rating for the club
  const reviews = await prisma.review.aggregate({
    where: { clubId },
    _avg: {
      rating: true,
    },
  });

  const avgRating = reviews._avg.rating || 0;

  await prisma.club.update({
    where: { id: clubId },
    data: {
      rating: parseFloat(avgRating.toFixed(1)),
    },
  });

  sendResponse(res, 201, true, 'Review submitted successfully', review);
});

// Fetch reviews for a club
export const getClubReviews = asyncHandler(async (req: Request, res: Response) => {
  const clubId = req.params.clubId as string;

  const reviews = await prisma.review.findMany({
    where: { clubId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  sendResponse(res, 200, true, 'Reviews fetched successfully', reviews);
});

// Delete review
export const deleteReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  const review = await prisma.review.findUnique({
    where: { id },
  });

  if (!review) {
    return sendResponse(res, 404, false, 'Review not found');
  }

  if (review.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return sendResponse(res, 403, false, 'Unauthorized to delete this review');
  }

  await prisma.review.delete({
    where: { id },
  });

  // Recalculate average rating
  const reviews = await prisma.review.aggregate({
    where: { clubId: review.clubId },
    _avg: {
      rating: true,
    },
  });

  const avgRating = reviews._avg.rating || 0;

  await prisma.club.update({
    where: { id: review.clubId },
    data: {
      rating: parseFloat(avgRating.toFixed(1)),
    },
  });

  sendResponse(res, 200, true, 'Review deleted successfully');
});
