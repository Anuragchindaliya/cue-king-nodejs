import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodEnum<{
            PLAYER: "PLAYER";
            CLUB_OWNER: "CLUB_OWNER";
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=auth.validation.d.ts.map