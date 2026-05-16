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
 if(typeof clubId !== "string"){
    return sendResponse(res, 400, false, 'Club ID is required');
  }
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

import redisClient from '../../config/redisClient';

export const getSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query || query.length < 2) {
    return sendResponse(res, 200, true, 'Suggestions fetched successfully', []);
  }

  const cacheKey = `suggestions:${query.toLowerCase()}`;
  
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return sendResponse(res, 200, true, 'Suggestions fetched successfully', JSON.parse(cached));
    }
  } catch (err) {
    console.warn('Redis read error', err);
  }

  const suggestions = await clubService.getSuggestions(query);
  
  try {
    // Cache for 1 hour
    await redisClient.setex(cacheKey, 3600, JSON.stringify(suggestions));
  } catch (err) {
    console.warn('Redis write error', err);
  }

  sendResponse(res, 200, true, 'Suggestions fetched successfully', suggestions);
});

export const getClubs = asyncHandler(async (req: Request, res: Response) => {
  const { 
    search, 
    sortBy, 
    tableTypes, 
    minPrice, 
    maxPrice, 
    lat, 
    lng, 
    radius,
    amenities,
    openNow,
    is24_7,
    page = '1', 
    limit = '10' 
  } = req.query;

  const filters: any = {};
  if (req.query.locationId) filters.locationId = req.query.locationId;
  if (search) filters.search = String(search);
  if (sortBy) filters.sortBy = String(sortBy);
  if (tableTypes) filters.tableTypes = String(tableTypes).split(',');
  if (amenities) filters.amenities = String(amenities).split(',');
  if (minPrice) filters.minPrice = Number(minPrice);
  if (maxPrice) filters.maxPrice = Number(maxPrice);
  if (openNow === 'true') filters.openNow = true;
  if (is24_7 === 'true') filters.is24_7 = true;
  if (lat && lng) {
    filters.lat = parseFloat(String(lat));
    filters.lng = parseFloat(String(lng));
  }
  if (radius) filters.radius = Number(radius);
  
  filters.page = Math.max(1, parseInt(String(page)));
  filters.limit = Math.max(1, parseInt(String(limit)));

  const result = await clubService.getClubs(filters);

  sendResponse(res, 200, true, 'Clubs fetched successfully', result.data, result.meta);
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
