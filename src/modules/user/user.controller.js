import * as userService from './user.service';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
export const getProfile = asyncHandler(async (req, res) => {
    const user = await userService.getUserProfile(req.user.id);
    sendResponse(res, 200, true, 'User profile fetched successfully', user);
});
//# sourceMappingURL=user.controller.js.map