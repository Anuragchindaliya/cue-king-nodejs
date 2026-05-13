export declare const checkAvailability: (tableCategoryId: string, startTime: Date, endTime: Date) => Promise<{
    available: boolean;
    remaining: number;
    total: number;
}>;
export declare const createBooking: (userId: string, clubId: string, tableCategoryId: string, startTime: Date, endTime: Date) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    clubId: string;
    startTime: Date;
    endTime: Date;
    status: import(".prisma/client").$Enums.BookingStatus;
    userId: string;
    tableCategoryId: string;
}>;
export declare const getUserBookings: (userId: string) => Promise<({
    club: {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        lat: number | null;
        lng: number | null;
        openingTime: string;
        closingTime: string;
        ownerId: string;
        locationId: string;
    };
    tableCategory: {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        quantity: number;
        pricePerHour: number;
        clubId: string;
    };
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    clubId: string;
    startTime: Date;
    endTime: Date;
    status: import(".prisma/client").$Enums.BookingStatus;
    userId: string;
    tableCategoryId: string;
})[]>;
//# sourceMappingURL=booking.service.d.ts.map