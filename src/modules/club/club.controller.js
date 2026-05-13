import * as clubService from './club.service';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
export const createClub = asyncHandler(async (req, res) => {
    const club = await clubService.createClub(req.user.id, req.body);
    sendResponse(res, 201, true, 'Club created successfully', club);
});
export const getClubs = asyncHandler(async (req, res) => {
    const filters = {};
    if (req.query.locationId)
        filters.locationId = req.query.locationId;
    let clubs = await clubService.getClubs(filters);
    // If lat and lng are provided, sort by distance
    const { lat, lng } = req.query;
    if (lat && lng) {
        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);
        clubs = clubs.map(club => {
            if (club.lat && club.lng) {
                // Simple Pythagorean distance for sorting (not actual miles/km but works for relative sorting)
                const dLat = club.lat - userLat;
                const dLng = club.lng - userLng;
                const distance = Math.sqrt(dLat * dLat + dLng * dLng);
                return { ...club, distance };
            }
            return { ...club, distance: Infinity };
        }).sort((a, b) => a.distance - b.distance);
    }
    sendResponse(res, 200, true, 'Clubs fetched successfully', clubs);
});
export const getClubById = asyncHandler(async (req, res) => {
    const clubId = req.params.id;
    if (typeof clubId !== "string") {
        return sendResponse(res, 400, false, 'Club ID is required');
    }
    const club = await clubService.getClubById(clubId);
    if (!club) {
        return sendResponse(res, 404, false, 'Club not found');
    }
    sendResponse(res, 200, true, 'Club fetched successfully', club);
});
export const addTableCategory = asyncHandler(async (req, res) => {
    // Add an extra check here to ensure req.user.id is the owner of req.params.id (club)
    const clubId = req.params.id;
    if (typeof clubId !== "string") {
        return sendResponse(res, 400, false, 'Club ID is required');
    }
    const club = await clubService.getClubById(clubId);
    if (!club || club.ownerId !== req.user.id) {
        return sendResponse(res, 403, false, 'Not authorized to add categories to this club');
    }
    const category = await clubService.addTableCategory(clubId, req.body);
    sendResponse(res, 201, true, 'Table category added successfully', category);
});
//# sourceMappingURL=club.controller.js.map