import { z } from 'zod';
//import { User } from './users.types';

// Enums for company fields
const DefaultJobTitlesEnum = z.enum([
    "Recruiter",
    "Senior Recruiter",
    "Talent Partner",
    "HR Manager"
]);

const SubscriptionPlanEnum = z.enum([
    "trial",
    "standard",
    "enterprise"
]);

const SubscriptionStatusEnum = z.enum([
    "active",
    "suspend",
    "pending"
]);

// Company schema based on Strapi backend schema
export const CompanySchema = z.object({
    // Strapi common fields
    id: z.number().optional(),
    documentId: z.string().optional(),
    createdAt: z.union([z.date(), z.string()]).optional(),
    updatedAt: z.union([z.date(), z.string()]).optional(),
    publishedAt: z.union([z.date(), z.string()]).optional().nullable(),
    locale: z.string().optional().nullable(),

    // Company specific fields
    name: z.string().optional(),
    externalId: z.string().optional(),
    legalName: z.string().optional(),
    taxId: z.string().optional(),
    officeAddress: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    timeZone: z.string().optional(),
    defaultJobTitles: DefaultJobTitlesEnum.optional(),
    subscriptionPlan: SubscriptionPlanEnum.optional(),
    seatsLimit: z.number().optional(),
    subscriptionStatus: SubscriptionStatusEnum.optional(),
    features: z.record(z.any()).optional(),
    primaryContactName: z.string().optional(),
    primaryContactEmail: z.string().email().optional(),
    primaryContactPhone: z.string().optional(),
    // users_permissions_users: z.array(z.any()).optional().nullable(), // Will be typed with User schema when available
    onboardingCompleted: z.boolean().optional(),
    onboardingDate: z.union([z.date(), z.string()]).optional(),
});

// TypeScript interface inferred from schema
export type ICompany = z.infer<typeof CompanySchema>;

// Type for creating new companies
export interface CreateCompanyData {
    name?: string;
    externalId?: string;
    legalName?: string;
    taxId?: string;
    officeAddress?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    timeZone?: string;
    defaultJobTitles?: "Recruiter" | "Senior Recruiter" | "Talent Partner" | "HR Manager";
    subscriptionPlan?: "trial" | "standard" | "enterprise";
    seatsLimit?: number;
    subscriptionStatus?: "active" | "suspend" | "pending";
    features?: Record<string, any>;
    primaryContactName?: string;
    primaryContactEmail?: string;
    primaryContactPhone?: string;
    onboardingCompleted?: boolean;
    onboardingDate?: Date | string;
}

// Type for updating companies
export interface UpdateCompanyData {
    name?: string;
    externalId?: string;
    legalName?: string;
    taxId?: string;
    officeAddress?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    timeZone?: string;
    defaultJobTitles?: "Recruiter" | "Senior Recruiter" | "Talent Partner" | "HR Manager";
    subscriptionPlan?: "trial" | "standard" | "enterprise";
    seatsLimit?: number;
    subscriptionStatus?: "active" | "suspend" | "pending";
    features?: Record<string, any>;
    primaryContactName?: string;
    primaryContactEmail?: string;
    primaryContactPhone?: string;
    onboardingCompleted?: boolean;
    onboardingDate?: Date | string;
}

// Type guard to check if an object is a company
export const isCompany = (obj: any): obj is ICompany => {
    try {
        CompanySchema.parse(obj);
        return true;
    } catch {
        return false;
    }
};

// Validation helpers
export const validateCompany = (data: unknown): ICompany => {
    return CompanySchema.parse(data);
};

export const validateCreateCompanyData = (data: unknown): CreateCompanyData => {
    const createSchema = z.object({
        name: z.string().optional(),
        externalId: z.string().optional(),
        legalName: z.string().optional(),
        taxId: z.string().optional(),
        officeAddress: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        timeZone: z.string().optional(),
        defaultJobTitles: DefaultJobTitlesEnum.optional(),
        subscriptionPlan: SubscriptionPlanEnum.optional(),
        seatsLimit: z.number().optional(),
        subscriptionStatus: SubscriptionStatusEnum.optional(),
        features: z.record(z.any()).optional(),
        primaryContactName: z.string().optional(),
        primaryContactEmail: z.string().email().optional(),
        primaryContactPhone: z.string().optional(),
        onboardingCompleted: z.boolean().optional(),
        onboardingDate: z.union([z.date(), z.string()]).optional(),
    });

    return createSchema.parse(data);
};

export const validateUpdateCompanyData = (data: unknown): UpdateCompanyData => {
    const updateSchema = z.object({
        name: z.string().optional(),
        externalId: z.string().optional(),
        legalName: z.string().optional(),
        taxId: z.string().optional(),
        officeAddress: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        timeZone: z.string().optional(),
        defaultJobTitles: DefaultJobTitlesEnum.optional(),
        subscriptionPlan: SubscriptionPlanEnum.optional(),
        seatsLimit: z.number().optional(),
        subscriptionStatus: SubscriptionStatusEnum.optional(),
        features: z.record(z.any()).optional(),
        primaryContactName: z.string().optional(),
        primaryContactEmail: z.string().email().optional(),
        primaryContactPhone: z.string().optional(),
        onboardingCompleted: z.boolean().optional(),
        onboardingDate: z.union([z.date(), z.string()]).optional(),
    });

    return updateSchema.parse(data);
};

// Export enum types for convenience
export type DefaultJobTitles = z.infer<typeof DefaultJobTitlesEnum>;
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanEnum>;
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusEnum>;

// Utility type for company with populated users
// export interface CompanyWithUsers extends Omit<ICompany, 'users_permissions_users'> {
//     users_permissions_users?: User[] | null;
// }