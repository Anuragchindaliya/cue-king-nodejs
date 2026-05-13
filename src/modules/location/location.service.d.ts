export declare const getAllLocations: (filters?: {
    city?: string;
    area?: string;
}) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    city: string;
    area: string;
}[]>;
export declare const createLocation: (data: {
    city: string;
    area: string;
}) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    city: string;
    area: string;
}>;
//# sourceMappingURL=location.service.d.ts.map