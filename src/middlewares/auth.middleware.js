import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { sendResponse } from '../utils/response';
export const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: { id: true, email: true, role: true }, // Don't return password
            });
            if (!user) {
                return sendResponse(res, 401, false, 'Not authorized, user not found');
            }
            req.user = user;
            next();
        }
        catch (error) {
            return sendResponse(res, 401, false, 'Not authorized, token failed');
        }
    }
    if (!token) {
        return sendResponse(res, 401, false, 'Not authorized, no token');
    }
};
//# sourceMappingURL=auth.middleware.js.map