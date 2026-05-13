import * as locationService from './location.service';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
export const getLocations = asyncHandler(async (req, res) => {
    const filters = {
        city: req.query.city,
        area: req.query.area,
    };
    const locations = await locationService.getAllLocations(filters);
    sendResponse(res, 200, true, 'Locations fetched successfully', locations);
});
export const addLocation = asyncHandler(async (req, res) => {
    const location = await locationService.createLocation(req.body);
    sendResponse(res, 201, true, 'Location created successfully', location);
});
//# sourceMappingURL=location.controller.js.map