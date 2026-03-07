import { z } from 'zod';

// Zod schemas for runtime validation and type inference
export const RoleSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string(),
    type: z.string(),
    createdAt: z.coerce.date(), // coerce allows string to Date conversion
    updatedAt: z.coerce.date(),
    nb_users: z.number().optional(), // Make optional since it may not always be present
    permissions: z.any().optional(), // Keep as any for flexibility, but make optional
});

export const RoleResponseSchema = z.object({
    id: z.number(),
    attributes: RoleSchema,
});

export const RoutesInfoSchema = z.object({
    name: z.string(),
    base: z.string(),
    method: z.string(),
});

export const PermisoSchema = z.object({
    nombre: z.string(),
});

// Type inference from Zod schemas
export type IRole = z.infer<typeof RoleSchema>;
export type IRoleResponse = z.infer<typeof RoleResponseSchema>;
export type IRoutesInfo = z.infer<typeof RoutesInfoSchema>;
export type IPermiso = z.infer<typeof PermisoSchema>;

// Validation helper functions
export const validateRole = (data: unknown): IRole => {
    return RoleSchema.parse(data);
};

export const validateRoleResponse = (data: unknown): IRoleResponse => {
    return RoleResponseSchema.parse(data);
};

export const validateRoutesInfo = (data: unknown): IRoutesInfo => {
    return RoutesInfoSchema.parse(data);
};

export const validatePermiso = (data: unknown): IPermiso => {
    return PermisoSchema.parse(data);
};

// Safe parsing functions (return success/error instead of throwing)
export const safeParseRole = (data: unknown) => {
    return RoleSchema.safeParse(data);
};

export const safeParseRoleResponse = (data: unknown) => {
    return RoleResponseSchema.safeParse(data);
};

export const safeParseRoutesInfo = (data: unknown) => {
    return RoutesInfoSchema.safeParse(data);
};

export const safeParsePermiso = (data: unknown) => {
    return PermisoSchema.safeParse(data);
};