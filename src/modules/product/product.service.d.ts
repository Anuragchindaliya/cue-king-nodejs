export declare const createProduct: (clubId: string, data: any, imagePath?: string) => Promise<{
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    clubId: string;
    description: string | null;
    price: number;
    image: string | null;
}>;
export declare const getProductsByClub: (clubId: string) => Promise<{
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    clubId: string;
    description: string | null;
    price: number;
    image: string | null;
}[]>;
export declare const getAllProducts: (filters?: {
    name?: string;
    minPrice?: string;
    maxPrice?: string;
    clubId?: string;
}) => Promise<({
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
} & {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    clubId: string;
    description: string | null;
    price: number;
    image: string | null;
})[]>;
//# sourceMappingURL=product.service.d.ts.map