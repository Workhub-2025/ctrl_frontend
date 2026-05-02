/**
 * Example Server Actions using the simplified UsersService
 * This demonstrates the fetchApi -> service -> server action pattern
 */

'use server';

import { revalidateTag, revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import UsersService from '@/services/users-simple.service';
import {
    FindUsersParams,
    CreateUserData,
    UserUpdateData,
    PaginatedResponse,
    IPublicUser,
    UserStats,
    IProgresStatus
} from '@/types';
import { debugAuthToken, debugEnvironment } from '@/lib/debug-auth';
import {
    applyTenantScope,
    enforceTenantWrite,
    requireAdminActionContext
} from '@/lib/auth/server-action-auth';
import { startServerActionTrace } from '@/lib/observability/server-observability';

// Result type for consistent server action returns
type ActionResult<T> = {
    success: boolean;
    data?: T;
    error?: string;
};

/**
 * Get current user server action
 */
export const getCurrentUserAction = async (): Promise<ActionResult<IPublicUser>> => {
    try {
        const user = await UsersService.getCurrentUser();

        if (!user) {
            return {
                success: false,
                error: 'User not found or not authenticated'
            };
        }

        return {
            success: true,
            data: user
        };
    } catch (error: any) {
        console.error('[getCurrentUserAction] Error:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch current user'
        };
    }
}

/**
 * Get users with pagination and filters
 */
export const getUsersAction = async (params: FindUsersParams = {}): Promise<ActionResult<PaginatedResponse<IPublicUser>>> => {
    try {
        const authContext = await requireAdminActionContext('getUsersAction');
        if (process.env.NODE_ENV === 'development') {
            console.log('[getUsersAction] Called with params:', JSON.stringify(params, null, 2));
        }

        // Debug authentication only if we get forbidden errors and only in development
        if (process.env.NODE_ENV === 'development') {
            await debugAuthToken();
            debugEnvironment();
        }

        const scopedParams = applyTenantScope(params, authContext);
        const users = await UsersService.getUsers(scopedParams);

        if (!users) {
            console.error('[getUsersAction] Service returned null');
            return {
                success: false,
                error: 'Failed to fetch users - service returned null'
            };
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('[getUsersAction] Success - users count:', users.data?.length || 0);
        }

        return {
            success: true,
            data: users
        };
    } catch (error: any) {
        console.error('[getUsersAction] Unexpected error:', error);

        // Provide more specific error messages based on the error
        let errorMessage = 'Failed to fetch users';
        if (error.message?.includes('Forbidden')) {
            errorMessage = 'Access denied. Please check your permissions.';
        } else if (error.message?.includes('Unauthorized')) {
            errorMessage = 'Authentication required. Please log in again.';
        } else if (error.message?.includes('timeout')) {
            errorMessage = 'Request timed out. Please try again.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
}

/**
 * Get candidates specifically (optimized)
 */
export const getCandidatesAction = async (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    organization?: string;
    progresStatus?: IProgresStatus;
    sort?: string;
} = {}): Promise<ActionResult<PaginatedResponse<IPublicUser>>> => {
    try {
        const authContext = await requireAdminActionContext('getCandidatesAction');
        if (process.env.NODE_ENV === 'development') {
            console.log('[getCandidatesAction] Called with params:', JSON.stringify(params, null, 2));
        }

        const scopedParams = applyTenantScope(params, authContext);
        const candidates = await UsersService.getCandidates(scopedParams);

        if (!candidates) {
            console.error('[getCandidatesAction] Service returned null');
            return {
                success: false,
                error: 'Failed to fetch candidates - service returned null'
            };
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('[getCandidatesAction] Success - candidates count:', candidates.data?.length || 0);
        }

        return {
            success: true,
            data: candidates
        };
    } catch (error: any) {
        console.error('[getCandidatesAction] Unexpected error:', error);

        let errorMessage = 'Failed to fetch candidates';
        if (error.message?.includes('Forbidden')) {
            errorMessage = 'Access denied. Please check your permissions.';
        } else if (error.message?.includes('Unauthorized')) {
            errorMessage = 'Authentication required. Please log in again.';
        } else if (error.message?.includes('timeout')) {
            errorMessage = 'Request timed out. Please try again.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
}/**
 * Get user by ID
 */
export const getUserByIdAction = async (id: string | number): Promise<ActionResult<IPublicUser>> => {
    try {
        await requireAdminActionContext('getUserByIdAction');
        const user = await UsersService.getUserById(id);

        if (!user) {
            return {
                success: false,
                error: 'User not found'
            };
        }

        return {
            success: true,
            data: user
        };
    } catch (error: any) {
        console.error('[getUserByIdAction] Error:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch user'
        };
    }
}

/**
 * Create new user
 */
export const createUserAction = async (userData: CreateUserData): Promise<ActionResult<IPublicUser>> => {
    const trace = startServerActionTrace('createUserAction');
    let isSuccess = false;
    try {
        const authContext = await requireAdminActionContext('createUserAction', trace.correlationId);
        const scopedUserData = enforceTenantWrite(userData, authContext);
        const newUser = await UsersService.createUser(scopedUserData);

        if (!newUser) {
            return {
                success: false,
                error: 'Failed to create user'
            };
        }

        // Revalidate users list
        revalidateTag('users');
        revalidatePath('/admin/users');

        isSuccess = true;
        return {
            success: true,
            data: newUser
        };
    } catch (error: any) {
        trace.failure(error);
        console.error('[createUserAction] Error:', error);
        return {
            success: false,
            error: error.message || 'Failed to create user'
        };
    } finally {
        if (isSuccess) {
            trace.success();
        }
    }
}

/**
 * Update user by ID
 */
export const updateUserAction = async (
    id: string | number,
    data: UserUpdateData
): Promise<ActionResult<IPublicUser>> => {
    const trace = startServerActionTrace('updateUserAction', { targetId: String(id) });
    let isSuccess = false;
    try {
        const authContext = await requireAdminActionContext('updateUserAction', trace.correlationId);
        const scopedData = enforceTenantWrite(data, authContext);
        const updatedUser = await UsersService.updateUser(id, scopedData);

        if (!updatedUser) {
            return {
                success: false,
                error: 'Failed to update user'
            };
        }

        // Revalidate related pages
        revalidateTag('users');
        revalidatePath('/admin/users');
        revalidatePath(`/admin/users/${id}`);

        isSuccess = true;
        return {
            success: true,
            data: updatedUser
        };
    } catch (error: any) {
        trace.failure(error, { targetId: String(id) });
        console.error('[updateUserAction] Error:', error);
        return {
            success: false,
            error: error.message || 'Failed to update user'
        };
    } finally {
        if (isSuccess) {
            trace.success({ targetId: String(id) });
        }
    }
}

/**
 * Update current user
 */
export const updateCurrentUserAction = async (id: string | number, data: UserUpdateData): Promise<ActionResult<IPublicUser>> => {
    try {
        const authContext = await requireAdminActionContext('updateCurrentUserAction');
        const scopedData = enforceTenantWrite(data, authContext);
        const updatedUser = await UsersService.updateUser(id, scopedData);

        if (!updatedUser) {
            return {
                success: false,
                error: 'Failed to update profile'
            };
        }

        // Revalidate profile pages
        revalidateTag('current-user');
        revalidatePath('/profile');
        revalidatePath('/dashboard');

        return {
            success: true,
            data: updatedUser
        };
    } catch (error: any) {
        console.error('[updateCurrentUserAction] Error:', error);
        return {
            success: false,
            error: error.message || 'Failed to update profile'
        };
    }
}

/**
 * Delete user
 */
export const deleteUserAction = async (id: string | number): Promise<ActionResult<boolean>> => {
    const trace = startServerActionTrace('deleteUserAction', { targetId: String(id) });
    let isSuccess = false;
    try {
        await requireAdminActionContext('deleteUserAction', trace.correlationId);
        const success = await UsersService.deleteUser(id);

        if (!success) {
            return {
                success: false,
                error: 'Failed to delete user'
            };
        }

        // Revalidate users list
        revalidateTag('users');
        revalidatePath('/admin/users');

        isSuccess = true;
        return {
            success: true,
            data: true
        };
    } catch (error: any) {
        trace.failure(error, { targetId: String(id) });
        console.error('[deleteUserAction] Error:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete user'
        };
    } finally {
        if (isSuccess) {
            trace.success({ targetId: String(id) });
        }
    }
}

/**
 * Get user statistics
 */
export const getUserStatsAction = async (): Promise<ActionResult<UserStats>> => {
    try {
        await requireAdminActionContext('getUserStatsAction');
        const stats = await UsersService.getUserStats();

        if (!stats) {
            return {
                success: false,
                error: 'Failed to fetch user statistics'
            };
        }

        return {
            success: true,
            data: stats
        };
    } catch (error: any) {
        console.error('[getUserStatsAction] Error:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch user statistics'
        };
    }
}

/**
 * Search users
 */
export const searchUsersAction = async (
    searchTerm: string,
    filters: Partial<FindUsersParams> = {}
): Promise<ActionResult<PaginatedResponse<IPublicUser>>> => {
    try {
        const authContext = await requireAdminActionContext('searchUsersAction');
        const scopedFilters = applyTenantScope(filters, authContext);
        const results = await UsersService.searchUsers(searchTerm, scopedFilters);

        if (!results) {
            return {
                success: false,
                error: 'Failed to search users'
            };
        }

        return {
            success: true,
            data: results
        };
    } catch (error: any) {
        console.error('[searchUsersAction] Error:', error);
        return {
            success: false,
            error: error.message || 'Failed to search users'
        };
    }
}

/**
 * Get user completion status
 */
export const getUserCompletionStatusAction = async (): Promise<ActionResult<{
    hasCompletedEqualityMonitoring: boolean;
}>> => {
    try {
        const status = await UsersService.getCompletionStatus();

        return {
            success: true,
            data: status
        };
    } catch (error: any) {
        console.error('[getUserCompletionStatusAction] Error:', error);
        return {
            success: false,
            error: error.message || 'Failed to check completion status'
        };
    }
}

/**
 * Get user roles
 */
export const getUserRolesAction = async (): Promise<ActionResult<any[]>> => {
    try {
        await requireAdminActionContext('getUserRolesAction');
        const roles = await UsersService.getRoles();

        if (!roles) {
            return {
                success: false,
                error: 'Failed to fetch user roles'
            };
        }

        return {
            success: true,
            data: roles
        };
    } catch (error: any) {
        console.error('[getUserRolesAction] Error:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch user roles'
        };
    }
}

export const getUserOrgAction = async (): Promise<ActionResult<string[]>> => {
    try {
        const authContext = await requireAdminActionContext('getUserOrgAction');
        const users = await UsersService.getUsers(applyTenantScope({}, authContext));

        let unique: string[] = []

        if (users?.data) {
            const orgs = users.data
                .map((u) => (typeof u.organization === 'string' ? u.organization.trim() : u.organization))
                .filter((o): o is string => !!o);
            unique = Array.from(new Set(orgs));
        }

        return {
            success: true,
            data: unique
        }

    } catch (error: any) {
        console.error('[getUserOrgAction] Error:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch user otganizations'
        };

    }

}

/**
 * Redirect actions for form submissions
 */

/**
 * Create user and redirect
 */
export async function createUserAndRedirectAction(
    userData: CreateUserData,
    redirectTo: string = '/admin/users'
): Promise<never> {
    try {
        const result = await createUserAction(userData);

        if (!result.success) {
            // In a real app, you might want to handle this differently
            // perhaps by setting an error message in a cookie or session
            redirect(`${redirectTo}?error=${encodeURIComponent(result.error || 'Unknown error')}`);
        }

        redirect(`${redirectTo}?success=User created successfully`);
    } catch (error: any) {
        console.error('[createUserAndRedirectAction] Error:', error);
        redirect(`${redirectTo}?error=${encodeURIComponent('Failed to create user')}`);
    }
}

/**
 * Update user and redirect
 */
export const updateUserAndRedirectAction = async (
    id: string | number,
    data: UserUpdateData,
    redirectTo: string = '/admin/users'
): Promise<never> => {
    try {
        const result = await updateUserAction(id, data);

        if (!result.success) {
            redirect(`${redirectTo}?error=${encodeURIComponent(result.error || 'Unknown error')}`);
        }

        redirect(`${redirectTo}?success=User updated successfully`);
    } catch (error: any) {
        console.error('[updateUserAndRedirectAction] Error:', error);
        redirect(`${redirectTo}?error=${encodeURIComponent('Failed to update user')}`);
    }
}

/**
 * Delete user and redirect
 */
export const deleteUserAndRedirectAction = async (
    id: string | number,
    redirectTo: string = '/admin/users'
): Promise<never> => {
    try {
        const result = await deleteUserAction(id);

        if (!result.success) {
            redirect(`${redirectTo}?error=${encodeURIComponent(result.error || 'Unknown error')}`);
        }

        redirect(`${redirectTo}?success=User deleted successfully`);
    } catch (error: any) {
        console.error('[deleteUserAndRedirectAction] Error:', error);
        redirect(`${redirectTo}?error=${encodeURIComponent('Failed to delete user')}`);
    }
}
