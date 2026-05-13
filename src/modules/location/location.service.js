import prisma from '../../config/db';
export const getAllLocations = async (filters = {}) => {
    const where = {};
    if (filters.city) {
        where.city = { contains: filters.city, mode: 'insensitive' };
    }
    if (filters.area) {
        where.area = { contains: filters.area, mode: 'insensitive' };
    }
    return prisma.location.findMany({ where });
};
export const createLocation = async (data) => {
    return prisma.location.create({
        data,
    });
};
//# sourceMappingURL=location.service.js.map