import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import * as clubService from './club.service';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

export const createClub = asyncHandler(async (req: AuthRequest, res: Response) => {
  const club = await clubService.createClub(req.user.id, req.body);
  sendResponse(res, 201, true, 'Club created successfully', club);
});

export const getClubs = asyncHandler(async (req: Request, res: Response) => {
  const filters: any = {};
  if (req.query.locationId) filters.locationId = req.query.locationId;
  
  const clubs = await clubService.getClubs(filters);
  sendResponse(res, 200, true, 'Clubs fetched successfully', clubs);
});

export const getClubById = asyncHandler(async (req: Request, res: Response) => {
  const clubId = req.params.id;
  if(typeof clubId !== "string"){
    return sendResponse(res, 400, false, 'Club ID is required');
  }
  const club = await clubService.getClubById(clubId);
  if (!club) {
    return sendResponse(res, 404, false, 'Club not found');
  }
  sendResponse(res, 200, true, 'Club fetched successfully', club);
});

export const addTableCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Add an extra check here to ensure req.user.id is the owner of req.params.id (club)
  const clubId = req.params.id;
  if(typeof clubId !== "string"){
    return sendResponse(res, 400, false, 'Club ID is required');
  }
  const club = await clubService.getClubById(clubId);
  if (!club || club.ownerId !== req.user.id) {
    return sendResponse(res, 403, false, 'Not authorized to add categories to this club');
  }

  const category = await clubService.addTableCategory(clubId, req.body);
  sendResponse(res, 201, true, 'Table category added successfully', category);
});
