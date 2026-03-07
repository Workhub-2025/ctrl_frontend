import { z } from 'zod';
import { RoleSchema, type IRole } from './role.types';
import { AssessmentSchema, ProgresStatusSchema } from './assessments.types';

// Zod schema for Equality Monitoring Data
export const EqualityMonitoringSchema = z.object({
    age_range: z.string().optional(),
    gender: z.string().optional(),
    gender_other: z.string().optional(),
    sexual_orientation: z.string().optional(),
    sexual_orientation_other: z.string().optional(),
    ethnicity: z.string().optional(),
    religion: z.string().optional(),
    disability: z.string().optional(),
    disability_details: z.string().optional(),
    marital_status: z.string().optional(),
    dependents: z.string().optional(),
    education_level: z.string().optional(),
    employment_status: z.string().optional(),
    previous_emergency_services: z.string().optional(),
    additional_information: z.string().optional(),
});


// Equality Monitoring state schema (includes completion tracking)
export const EqualityMonitoringStateSchema = EqualityMonitoringSchema.extend({
    completed: z.boolean().optional(),
    completedAt: z.string().optional(),
    skipped: z.boolean().optional(),
});

// Type inference from schemas
export type EqualityMonitoringData = z.infer<typeof EqualityMonitoringSchema>;
export type EqualityMonitoringState = z.infer<typeof EqualityMonitoringStateSchema>;

// Zod schemas for runtime validation and type inference
export const UserSchema = z.object({
    id: z.union([z.number(), z.string()]), // Support both number and string IDs (Strapi v4/v5)
    documentId: z.string().optional(), // Strapi v5 compatibility
    username: z.string(),
    email: z.string().email('Invalid email format'),
    provider: z.string().optional(),
    password: z.string().optional(), // Should be private/excluded in responses
    resetPasswordToken: z.string().optional(), // Private field
    confirmationToken: z.string().optional(), // Private field
    confirmed: z.boolean().optional().default(false),
    blocked: z.boolean().optional().default(false),
    role: z.union([RoleSchema, z.number(), z.null()]).optional().nullable(),

    // Personal information (required in schema)
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    organization: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),

    // Consent and monitoring (JSON fields)
    equalityMonitoring: z.union([EqualityMonitoringStateSchema, z.any()]).optional().nullable(),

    // Additional consent fields - made nullable to handle null values from DB
    agreeToMarketing: z.boolean().optional().nullable().default(false),
    agreeToTerms: z.boolean().optional().nullable(),
    agreeToDataPrivacyPolicy: z.boolean().optional().nullable(),
    privacyPolicyVersion: z.string().optional().default("1.0"),

    // Assessment related
    progresStatus: ProgresStatusSchema.optional().default("Not started"),
    assessments: z.union([
        z.array(AssessmentSchema),
        z.array(z.number()),
        AssessmentSchema,
        z.number(),
        z.null()
    ]).optional().nullable(),
    overallScore: z.number().optional().nullable(),

    // Timestamps
    createdAt: z.union([z.date(), z.string()]).optional(),
    updatedAt: z.union([z.date(), z.string()]).optional(),
    publishedAt: z.union([z.date(), z.string()]).optional(),
});

// Public user schema (without sensitive fields)
export const PublicUserSchema = UserSchema.omit({
    password: true,
    resetPasswordToken: true,
    confirmationToken: true,
    provider: true,
});

// User response from Strapi API
export const UserResponseSchema = z.object({
    id: z.union([z.number(), z.string()]),
    documentId: z.string().optional(),
    attributes: PublicUserSchema.optional(), // For Strapi v4 format
}).passthrough(); // Allow additional fields for direct user object

// Strapi auth user schema (what comes back from auth endpoints)
export const StrapiAuthUserSchema = z.object({
    id: z.union([z.number(), z.string()]),
    documentId: z.string().optional(),
    email: z.string().email(),
    username: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    organization: z.string().optional(),
    phone: z.string().optional(),
    role: z.union([RoleSchema, z.number(), z.null()]).optional(),
    confirmed: z.boolean().optional(),
    blocked: z.boolean().optional(),
    progresStatus: ProgresStatusSchema.optional(),
    overallScore: z.number().optional(),
    createdAt: z.union([z.string(), z.date()]).optional(),
    updatedAt: z.union([z.string(), z.date()]).optional(),
});

export const StrapiAuthResponseSchema = z.object({
    jwt: z.string(),
    user: UserSchema,
});

export const LoginUserDataSchema = z.object({
    identifier: z.string().min(1, 'Email or username is required'), // email or username
    password: z.string().min(1, 'Password is required'),
});

// Additional validation schemas for specific use cases
export const UserRegistrationSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().optional(),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    organization: z.string().optional(),
    phone: z.string().optional(),
    role: z.number().optional(),
    equalityMonitoring: EqualityMonitoringStateSchema.optional(),
    agreeToTerms: z.boolean().refine(val => val === true, {
        message: 'You must agree to the terms and conditions',
    }),
    agreeToDataPrivacyPolicy: z.boolean().refine(val => val === true, {
        message: 'You must agree to the data privacy policy',
    }),
    agreeToMarketing: z.boolean().optional().default(false),
}).refine((data) => {
    if (data.confirmPassword && data.password !== data.confirmPassword) {
        return false;
    }
    return true;
}, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export const UserUpdateSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters').optional(),
    email: z.string().email('Invalid email format').optional(),
    firstName: z.string().min(1, 'First name is required').optional(),
    lastName: z.string().min(1, 'Last name is required').optional(),
    organization: z.string().optional(),
    phone: z.string().optional(),
    equalityMonitoring: z.union([EqualityMonitoringStateSchema, z.any()]).optional(),
    progresStatus: ProgresStatusSchema.optional(),
    overallScore: z.number().optional(),
    agreeToMarketing: z.boolean().optional(),
    blocked: z.boolean().optional(),
    confirmed: z.boolean().optional(),
});

// Create user data schema (for admin creation)
export const CreateUserDataSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    organization: z.string().optional(),
    phone: z.string().optional(),
    role: z.number().optional(),
    confirmed: z.boolean().optional().default(false),
    blocked: z.boolean().optional().default(false),
    equalityMonitoring: EqualityMonitoringStateSchema.optional(),
    agreeToTerms: z.boolean().optional(),
    agreeToDataPrivacyPolicy: z.boolean().optional().nullable(),
    agreeToMarketing: z.boolean().optional().default(false),
});

// User profile schema (for frontend display)
export const UserProfileSchema = z.object({
    id: z.union([z.number(), z.string()]),
    documentId: z.string().optional(),
    username: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    organization: z.string().optional(),
    phone: z.string().optional(),
    progresStatus: ProgresStatusSchema.optional(),
    overallScore: z.number().optional(),
    role: RoleSchema.optional(),
    assessments: z.array(AssessmentSchema).optional(),
    hasCompletedPrivacyTerms: z.boolean(),
    hasCompletedEqualityMonitoring: z.boolean(),
    createdAt: z.union([z.date(), z.string()]),
});

// Type inference from Zod schemas
export type IUser = z.infer<typeof UserSchema>;
export type IPublicUser = z.infer<typeof PublicUserSchema>;
export type IUserResponse = z.infer<typeof UserResponseSchema>;
export type StrapiAuthUser = z.infer<typeof StrapiAuthUserSchema>;
export type StrapiAuthResponse = z.infer<typeof StrapiAuthResponseSchema>;
export type LoginUserData = z.infer<typeof LoginUserDataSchema>;
export type UserRegistrationData = z.infer<typeof UserRegistrationSchema>;
export type UserUpdateData = z.infer<typeof UserUpdateSchema>;
export type CreateUserData = z.infer<typeof CreateUserDataSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;

// Pagination and API response types
export interface PaginationMeta {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        pagination: PaginationMeta;
    };
}

export interface UserStats {
    total: number;
    active: number;
    blocked: number;
    unconfirmed: number;
    completedAssessments: number
}

export interface StatsResponse {
    data: UserStats;
    meta: {
        timestamp: string;
    };
}

// API Query parameters
export interface FindUsersParams {
    page?: number;
    pageSize?: number;
    search?: string;
    role?: string | number;
    organization?: string;
    status?: 'active' | 'blocked' | 'unconfirmed';
    sort?: string | string[];
    filters?: Record<string, any>;
    populate?: string | string[];
    fields?: string | string[]
}

// Validation functions with better error handling
export const validateUser = (data: unknown): IUser => {
    const result = UserSchema.safeParse(data);
    if (!result.success) {
        console.error('❌ User validation failed:', result.error.format());
        throw result.error;
    }
    return result.data;
};

export const validatePublicUser = (data: unknown): IPublicUser => {
    // Pre-process data to handle common issues
    const processedData = typeof data === 'object' && data !== null ? {
        ...data,
        // Convert null values to undefined for optional fields
        agreeToTerms: (data as any).agreeToTerms === null ? undefined : (data as any).agreeToTerms,
        agreeToDataPrivacyPolicy: (data as any).agreeToDataPrivacyPolicy === null ? undefined : (data as any).agreeToDataPrivacyPolicy,
        agreeToMarketing: (data as any).agreeToMarketing === null ? false : (data as any).agreeToMarketing,
        overallScore: (data as any).overallScore === null ? undefined : (data as any).overallScore,
        organization: (data as any).organization === null ? undefined : (data as any).organization,
        phone: (data as any).phone === null ? undefined : (data as any).phone,
        assessments: (data as any).assessments === null ? undefined : (data as any).assessments,
        // Handle role object that might be missing nb_users
        role: (data as any).role && typeof (data as any).role === 'object' && (data as any).role !== null
            ? {
                ...(data as any).role,
                nb_users: (data as any).role.nb_users || 0 // Provide default value
            }
            : (data as any).role
    } : data;

    const result = PublicUserSchema.safeParse(processedData);
    if (!result.success) {
        console.error('❌ Public user validation failed:', result.error.format());
        console.error('❌ Original data:', data);
        console.error('❌ Processed data:', processedData);
        throw result.error;
    }
    return result.data;
};

export const validateUserResponse = (data: unknown): IUserResponse => {
    return UserResponseSchema.parse(data);
};

/**
 * Safe validation that returns a result object instead of throwing
 */
export const safeValidatePublicUser = (data: unknown): { success: true; data: IPublicUser } | { success: false; error: z.ZodError } => {
    // Pre-process data to handle common issues
    const processedData = typeof data === 'object' && data !== null ? {
        ...data,
        // Convert null values to undefined for optional fields
        agreeToTerms: (data as any).agreeToTerms === null ? undefined : (data as any).agreeToTerms,
        agreeToDataPrivacyPolicy: (data as any).agreeToDataPrivacyPolicy === null ? undefined : (data as any).agreeToDataPrivacyPolicy,
        agreeToMarketing: (data as any).agreeToMarketing === null ? false : (data as any).agreeToMarketing,
        overallScore: (data as any).overallScore === null ? undefined : (data as any).overallScore,
        organization: (data as any).organization === null ? undefined : (data as any).organization,
        phone: (data as any).phone === null ? undefined : (data as any).phone,
        assessments: (data as any).assessments === null ? undefined : (data as any).assessments,
        // Handle role object that might be missing nb_users
        role: (data as any).role && typeof (data as any).role === 'object' && (data as any).role !== null
            ? {
                ...(data as any).role,
                nb_users: (data as any).role.nb_users || 0 // Provide default value
            }
            : (data as any).role
    } : data;

    const result = PublicUserSchema.safeParse(processedData);
    if (result.success) {
        return { success: true, data: result.data };
    } else {
        return { success: false, error: result.error };
    }
};

export const validateStrapiAuthUser = (data: unknown): StrapiAuthUser => {
    return StrapiAuthUserSchema.parse(data);
};

export const validateStrapiAuthResponse = (data: unknown): StrapiAuthResponse => {
    return StrapiAuthResponseSchema.parse(data);
};

export const validateLoginUserData = (data: unknown): LoginUserData => {
    return LoginUserDataSchema.parse(data);
};

export const validateUserRegistration = (data: unknown): UserRegistrationData => {
    return UserRegistrationSchema.parse(data);
};

export const validateUserUpdate = (data: unknown): UserUpdateData => {
    return UserUpdateSchema.parse(data);
};

export const validateCreateUserData = (data: unknown): CreateUserData => {
    return CreateUserDataSchema.parse(data);
};

export const validateUserProfile = (data: unknown): UserProfile => {
    return UserProfileSchema.parse(data);
};

export const validateEqualityMonitoringData = (data: unknown): EqualityMonitoringData => {
    return EqualityMonitoringSchema.parse(data);
};

export const validateEqualityMonitoringState = (data: unknown): EqualityMonitoringState => {
    return EqualityMonitoringStateSchema.parse(data);
};

// Safe parsing functions (return success/error instead of throwing)
export const safeParseUser = (data: unknown) => {
    return UserSchema.safeParse(data);
};

export const safeParsePublicUser = (data: unknown) => {
    return PublicUserSchema.safeParse(data);
};

export const safeParseUserResponse = (data: unknown) => {
    return UserResponseSchema.safeParse(data);
};

export const safeParseStrapiAuthUser = (data: unknown) => {
    return StrapiAuthUserSchema.safeParse(data);
};

export const safeParseStrapiAuthResponse = (data: unknown) => {
    return StrapiAuthResponseSchema.safeParse(data);
};

export const safeParseLoginUserData = (data: unknown) => {
    return LoginUserDataSchema.safeParse(data);
};

export const safeParseUserRegistration = (data: unknown) => {
    return UserRegistrationSchema.safeParse(data);
};

export const safeParseUserUpdate = (data: unknown) => {
    return UserUpdateSchema.safeParse(data);
};

export const safeParseCreateUserData = (data: unknown) => {
    return CreateUserDataSchema.safeParse(data);
};

export const safeParseUserProfile = (data: unknown) => {
    return UserProfileSchema.safeParse(data);
};

export const safeParseEqualityMonitoringData = (data: unknown) => {
    return EqualityMonitoringSchema.safeParse(data);
};

export const safeParseEqualityMonitoringState = (data: unknown) => {
    return EqualityMonitoringStateSchema.safeParse(data);
};