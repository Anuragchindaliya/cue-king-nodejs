export declare const registerUser: (data: any) => Promise<{
    user: {
        id: string;
        email: string;
        name: string | null;
        role: import(".prisma/client").$Enums.Role;
    };
    token: string;
}>;
export declare const loginUser: (data: any) => Promise<{
    user: {
        id: string;
        email: string;
        name: string | null;
        role: import(".prisma/client").$Enums.Role;
    };
    token: string;
}>;
export declare const generateTokenForUser: (user: any) => string;
//# sourceMappingURL=auth.service.d.ts.map