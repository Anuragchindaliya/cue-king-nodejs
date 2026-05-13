import prisma from '../../config/db';
export const getUserProfile = async (id) => {
    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
        },
    });
    if (!user) {
        throw new Error('User not found');
    }
    return user;
};
//# sourceMappingURL=user.service.js.map