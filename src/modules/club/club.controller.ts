import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import * as clubService from './club.service';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

export const createClub = asyncHandler(async (req: AuthRequest, res: Response) => {
  const club = await clubService.createClub(req.user.id, req.body);
  sendResponse(res, 201, true, 'Club created successfully', club);
});

export const updateClub = asyncHandler(async (req: AuthRequest, res: Response) => {
  const clubId = req.params.id;
  const existingClub = await clubService.getClubById(clubId);
  if (!existingClub || existingClub.ownerId !== req.user.id) {
    return sendResponse(res, 403, false, 'Not authorized to update this club');
  }
  const club = await clubService.updateClub(clubId, req.user.id, req.body);
  sendResponse(res, 200, true, 'Club updated successfully', club);
});

export const getMyClubs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const clubs = await clubService.getClubs({ ownerId: req.user.id });
  sendResponse(res, 200, true, 'My clubs fetched successfully', clubs);
});

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export const getClubs = asyncHandler(async (req: Request, res: Response) => {
  const filters: any = {};
  if (req.query.locationId) filters.locationId = req.query.locationId;
  
  let clubs = await clubService.getClubs(filters);

  const { lat, lng } = req.query;
  if (lat && lng) {
    const userLat = parseFloat(lat as string);
    const userLng = parseFloat(lng as string);

    clubs = clubs.map(club => {
      if (club.lat && club.lng) {
        const distance = getDistanceFromLatLonInKm(userLat, userLng, club.lat, club.lng);
        return { ...club, distance };
      }
      return { ...club, distance: Infinity };
    }).sort((a: any, b: any) => a.distance - b.distance);
  }

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
