'use server';

import { revalidatePath } from 'next/cache';
import CompanyService, { FindCompaniesParams } from '@/services/company.service';
import { ICompany, CreateCompanyData, UpdateCompanyData } from '@/types/company.types';
import { PaginatedResponse } from '@/types';

/**
 * Server Action: Get companies with pagination and filters
 */
export async function getCompaniesAction(params: FindCompaniesParams): Promise<{
    success: boolean;
    data?: PaginatedResponse<ICompany>;
    error?: string;
}> {
    try {
        const companies = await CompanyService.getCompanies(params);

        if (!companies) {
            return {
                success: false,
                error: 'Failed to fetch companies'
            };
        }

        return {
            success: true,
            data: companies
        };
    } catch (error) {
        console.error('[getCompaniesAction] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch companies'
        };
    }
}

/**
 * Server Action: Get company by ID
 */
export async function getCompanyByIdAction(id: string | number): Promise<{
    success: boolean;
    data?: ICompany;
    error?: string;
}> {
    try {
        const company = await CompanyService.getCompanyById(id);

        if (!company) {
            return {
                success: false,
                error: 'Company not found'
            };
        }

        return {
            success: true,
            data: company
        };
    } catch (error) {
        console.error('[getCompanyByIdAction] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch company'
        };
    }
}

/**
 * Server Action: Create new company
 */
export async function createCompanyAction(data: CreateCompanyData): Promise<{
    success: boolean;
    data?: ICompany;
    error?: string;
}> {
    try {
        // Validate required fields
        if (!data.name?.trim()) {
            return {
                success: false,
                error: 'Company name is required'
            };
        }

        const company = await CompanyService.createCompany(data);

        if (!company) {
            return {
                success: false,
                error: 'Failed to create company'
            };
        }

        // Revalidate the companies page
        revalidatePath('/admin/companies');

        return {
            success: true,
            data: company
        };
    } catch (error) {
        console.error('[createCompanyAction] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create company'
        };
    }
}

/**
 * Server Action: Update company
 */
export async function updateCompanyAction(
    id: string | number,
    data: UpdateCompanyData
): Promise<{
    success: boolean;
    data?: ICompany;
    error?: string;
}> {
    try {
        const company = await CompanyService.updateCompany(id, data);

        if (!company) {
            return {
                success: false,
                error: 'Failed to update company'
            };
        }

        // Revalidate the companies page
        revalidatePath('/admin/companies');

        return {
            success: true,
            data: company
        };
    } catch (error) {
        console.error('[updateCompanyAction] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update company'
        };
    }
}

/**
 * Server Action: Delete company
 */
export async function deleteCompanyAction(id: string | number): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const result = await CompanyService.deleteCompany(id);

        if (!result) {
            return {
                success: false,
                error: 'Failed to delete company'
            };
        }

        // Revalidate the companies page
        revalidatePath('/admin/companies');

        return {
            success: true
        };
    } catch (error) {
        console.error('[deleteCompanyAction] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete company'
        };
    }
}

/**
 * Server Action: Complete company onboarding
 */
export async function completeOnboardingAction(id: string | number): Promise<{
    success: boolean;
    data?: ICompany;
    error?: string;
}> {
    try {
        const company = await CompanyService.completeOnboarding(id);

        if (!company) {
            return {
                success: false,
                error: 'Failed to complete onboarding'
            };
        }

        // Revalidate the companies page
        revalidatePath('/admin/companies');

        return {
            success: true,
            data: company
        };
    } catch (error) {
        console.error('[completeOnboardingAction] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to complete onboarding'
        };
    }
}

/**
 * Server Action: Update subscription plan
 */
export async function updateSubscriptionPlanAction(
    id: string | number,
    plan: 'trial' | 'standard' | 'enterprise',
    seatsLimit?: number
): Promise<{
    success: boolean;
    data?: ICompany;
    error?: string;
}> {
    try {
        const company = await CompanyService.updateSubscriptionPlan(id, plan, seatsLimit);

        if (!company) {
            return {
                success: false,
                error: 'Failed to update subscription plan'
            };
        }

        // Revalidate the companies page
        revalidatePath('/admin/companies');

        return {
            success: true,
            data: company
        };
    } catch (error) {
        console.error('[updateSubscriptionPlanAction] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update subscription plan'
        };
    }
}

/**
 * Server Action: Get company statistics
 */
export async function getCompanyStatsAction(): Promise<{
    success: boolean;
    data?: {
        total: number;
        byPlan: Record<string, number>;
        byStatus: Record<string, number>;
        onboardingCompleted: number;
        onboardingPending: number;
    };
    error?: string;
}> {
    try {
        const stats = await CompanyService.getCompanyStats();

        if (!stats) {
            return {
                success: false,
                error: 'Failed to fetch company statistics'
            };
        }

        return {
            success: true,
            data: stats
        };
    } catch (error) {
        console.error('[getCompanyStatsAction] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch company statistics'
        };
    }
}