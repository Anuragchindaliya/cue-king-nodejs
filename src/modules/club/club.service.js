import prisma from '../../config/db';
export const createClub = async (ownerId, data) => {
    return prisma.club.create({
        data: {
            ...data,
            ownerId,
        },
    });
};
export const getClubs = async (filters = {}) => {
    return prisma.club.findMany({
        where: filters,
        include: { location: true, tableCategories: true },
    });
};
export const getClubById = async (id) => {
    return prisma.club.findUnique({
        where: { id },
        include: { location: true, tableCategories: true },
    });
};
export const addTableCategory = async (clubId, data) => {
    return prisma.tableCategory.create({
        data: {
            ...data,
            clubId,
        },
    });
};
//# sourceMappingURL=club.service.js.map