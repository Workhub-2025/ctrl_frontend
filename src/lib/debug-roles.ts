/**
 * Debug utility for role-related issues
 */

import { UsersService } from '@/services/users-simple.service';
import { AuthAPI } from '@/services/auth-api';

export const debugRoles = async (): Promise<void> => {
    console.log('🔍 [DEBUG] Starting role debug...');

    try {
        // 1. Get all available roles
        const roles = await AuthAPI.getRoles();
        console.log('📋 [DEBUG] All roles from AuthAPI:', roles);

        // 2. Check for Candidate role specifically
        const candidateRole = Array.isArray(roles) ? roles.find(role => role.name === 'Candidate') : null;
        console.log('🎯 [DEBUG] Candidate role found:', candidateRole);

        // 3. Get all users to see their roles
        const users = await UsersService.getUsers({ populate: ['role', 'assessments'] });
        console.log('👥 [DEBUG] All users with roles:', users?.data?.map(user => ({
            id: user.id,
            email: user.email,
            role: user.role,
            roleName: typeof user.role === 'object' && user.role ? user.role.name : 'Unknown'
        })));

        // 4. Get candidates specifically
        const candidates = await UsersService.getCandidates();
        console.log('🎯 [DEBUG] Users with Candidate role:', candidates?.data?.map(user => ({
            id: user.id,
            email: user.email,
            role: user.role,
            roleName: typeof user.role === 'object' && user.role ? user.role.name : 'Unknown'
        })));

        // 5. Check role structure
        if (Array.isArray(roles) && roles.length > 0) {
            console.log('🔍 [DEBUG] Role structure analysis:');
            roles.forEach((role, index) => {
                console.log(`  Role ${index + 1}:`, {
                    id: role.id,
                    name: role.name,
                    type: role.type,
                    description: role.description,
                    keys: Object.keys(role)
                });
            });
        }

    } catch (error: any) {
        console.error('💥 [DEBUG] Role debug error:', error.message);
    }

    console.log('🔍 [DEBUG] Role debug complete');
};

/**
 * Debug user creation after registration
 */
export const debugUserCreation = async (userEmail: string): Promise<void> => {
    console.log('🔍 [DEBUG] Starting user creation debug for:', userEmail);

    try {
        // Try to find user by email
        const user = await UsersService.getUserByEmail(userEmail);

        if (user) {
            console.log('✅ [DEBUG] User found:', {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
                roleName: typeof user.role === 'object' && user.role ? user.role.name : 'Unknown',
                roleId: typeof user.role === 'object' && user.role ? user.role.id : user.role,
                organization: user.organization,
                confirmed: user.confirmed,
                blocked: user.blocked
            });
        } else {
            console.error('❌ [DEBUG] User not found with email:', userEmail);
        }

        // Also check all users to see if user exists with different role
        const allUsers = await UsersService.getUsers();
        const matchingUser = allUsers?.data?.find(u => u.email === userEmail);

        if (matchingUser && !user) {
            console.log('🔍 [DEBUG] User found in all users list but not in getUserByEmail:', {
                id: matchingUser.id,
                email: matchingUser.email,
                role: matchingUser.role,
                roleName: typeof matchingUser.role === 'object' && matchingUser.role ? matchingUser.role.name : 'Unknown'
            });
        }

    } catch (error: any) {
        console.error('💥 [DEBUG] User creation debug error:', error.message);
    }

    console.log('🔍 [DEBUG] User creation debug complete');
};