import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import * as clubService from './club.service';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import { uploadToCloudinary } from '../../services/cloudinary.service';

// Helper: upload a single buffer to Cloudinary and return the secure_url
const uploadBuffer = async (buffer: Buffer, folder: string, originalName: string): Promise<string> => {
  const baseName = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .toLowerCase();
  const result = await uploadToCloudinary(buffer, folder, `${baseName}_${Date.now()}`);
  return result.secureUrl; // absolute HTTPS URL — stored in PostgreSQL
};

export const createClub = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = { ...req.body };

  if (typeof data.amenities === 'string') {
    try { data.amenities = JSON.parse(data.amenities); } catch (e) {}
  }


  if (typeof data.tableCategories === 'string') {
    try { data.tableCategories = JSON.parse(data.tableCategories); } catch (e) {}
  }


  if (data.tableCategories && Array.isArray(data.tableCategories)) {
    const tables: any[] = [];
    data.tableCategories.forEach((cat: any) => {
      const qty = parseInt(cat.quantity) || 1;
      const type = cat.name.toLowerCase().includes('pool') ? 'EIGHT_BALL_POOL' : 'SNOOKER';
      for (let i = 1; i <= qty; i++) {
        tables.push({
          name: qty > 1 ? `${cat.name} ${i}` : cat.name,
          type,
          pricePerHour: parseFloat(cat.pricePerHour) || 0,
          status: 'AVAILABLE'
        });
      }
    });
    data.tables = tables;
    delete data.tableCategories;
  }


  // Handle location: find or create
  if (data.city && data.area) {
    const prisma = require('../../config/db').default;
    let loc = await prisma.location.findFirst({
      where: { city: { equals: data.city, mode: 'insensitive' }, area: { equals: data.area, mode: 'insensitive' } }
    });
    if (!loc) {
      loc = await prisma.location.create({ data: { city: data.city, area: data.area } });
    }
    data.locationId = loc.id;
  }
  delete data.city;
  delete data.area;

  if (data.lat) data.lat = parseFloat(data.lat);
  if (data.lng) data.lng = parseFloat(data.lng);

  // Step 1 — Create the club without images to get the DB-assigned clubId
  const club = await clubService.createClub(req.user.id, data);
  const clubId = club.id;

  // Step 2 — Upload images to Cloudinary using the real clubId in the path
  const imageUpdates: { coverImage?: string; interiorImages?: string[] } = {};

  if (req.files) {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Cover image: cueking/clubs/{clubId}/cover
    if (files['coverImage'] && files['coverImage'][0]) {
      const f = files['coverImage'][0];
      imageUpdates.coverImage = await uploadBuffer(
        f.buffer,
        `cueking/clubs/${clubId}/cover`,
        f.originalname
      );
    }

    // Interior images: cueking/clubs/{clubId}/interiors
    if (files['interiorImages'] && files['interiorImages'].length > 0) {
      imageUpdates.interiorImages = await Promise.all(
        files['interiorImages'].map((f) =>
          uploadBuffer(f.buffer, `cueking/clubs/${clubId}/interiors`, f.originalname)
        )
      );
    }
  }

  // Step 3 — Patch the club record with absolute Cloudinary URLs (if any images were uploaded)
  const finalClub =
    Object.keys(imageUpdates).length > 0
      ? await clubService.updateClub(clubId, req.user.id, imageUpdates)
      : club;

  sendResponse(res, 201, true, 'Club created successfully', finalClub);
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
