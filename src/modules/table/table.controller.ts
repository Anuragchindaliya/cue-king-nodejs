import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import prisma from '../../config/db';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

// Create a new table
export const createTable = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, type, pricePerHour, clubId } = req.body;

  if (!name || !type || pricePerHour === undefined || !clubId) {
    return sendResponse(res, 400, false, 'Name, type, pricePerHour, and clubId are required');
  }

  // Check if club exists and belongs to user
  const club = await prisma.club.findUnique({
    where: { id: clubId },
  });

  if (!club) {
    return sendResponse(res, 404, false, 'Club not found');
  }

  if (club.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
    return sendResponse(res, 403, false, 'Unauthorized to add tables to this club');
  }

  const table = await prisma.table.create({
    data: {
      name,
      type,
      pricePerHour: parseFloat(pricePerHour),
      clubId,
      status: 'AVAILABLE',
    },
  });

  sendResponse(res, 201, true, 'Table created successfully', table);
});

// Get all tables for a club
export const getClubTables = asyncHandler(async (req: AuthRequest, res: Response) => {
  const clubId = req.params.clubId as string;

  const tables = await prisma.table.findMany({
    where: { clubId },
    orderBy: { name: 'asc' },
  });

  sendResponse(res, 200, true, 'Tables fetched successfully', tables);
});

// Update a table
export const updateTable = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { name, type, pricePerHour, status } = req.body;

  const table = await prisma.table.findUnique({
    where: { id },
    include: { club: true },
  });

  if (!table) {
    return sendResponse(res, 404, false, 'Table not found');
  }

  if (table.club.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
    return sendResponse(res, 403, false, 'Unauthorized to modify this table');
  }

  const updatedTable = await prisma.table.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(type && { type }),
      ...(pricePerHour !== undefined && { pricePerHour: parseFloat(pricePerHour) }),
      ...(status && { status }),
    },
  });

  sendResponse(res, 200, true, 'Table updated successfully', updatedTable);
});

// Delete a table
export const deleteTable = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  const table = await prisma.table.findUnique({
    where: { id },
    include: { club: true },
  });

  if (!table) {
    return sendResponse(res, 404, false, 'Table not found');
  }

  if (table.club.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
    return sendResponse(res, 403, false, 'Unauthorized to delete this table');
  }

  await prisma.table.delete({
    where: { id },
  });

  sendResponse(res, 200, true, 'Table deleted successfully');
});
