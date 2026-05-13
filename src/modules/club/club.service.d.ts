export declare const createClub: (ownerId: string, data: any) => Promise<{
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
}>;
export declare const getClubs: (filters?: any) => Promise<({
    location: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        city: string;
        area: string;
    };
    tableCategories: {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        quantity: number;
        pricePerHour: number;
        clubId: string;
    }[];
} & {
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
})[]>;
export declare const getClubById: (id: string) => Promise<({
    location: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        city: string;
        area: string;
    };
    tableCategories: {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        quantity: number;
        pricePerHour: number;
        clubId: string;
    }[];
} & {
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
}) | null>;
export declare const addTableCategory: (clubId: string, data: any) => Promise<{
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    quantity: number;
    pricePerHour: number;
    clubId: string;
}>;
//# sourceMappingURL=club.service.d.ts.map