import { Request, Response } from 'express';
import * as locationService from './location.service';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

export const getLocations = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    city: req.query.city as string,
    area: req.query.area as string,
  };
  const locations = await locationService.getAllLocations(filters);
  sendResponse(res, 200, true, 'Locations fetched successfully', locations);
});

export const addLocation = asyncHandler(async (req: Request, res: Response) => {
  const location = await locationService.createLocation(req.body);
  sendResponse(res, 201, true, 'Location created successfully', location);
});
