import { JwtService } from '@nestjs/jwt';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import authConfig from '@/config/auth.config';
import { DataScope } from '@/common/constants/roles.constant';

/**
 * Create a mock JWT token for testing
 */
export function createMockJwtToken(user: Partial<ValidatedUser> = {}): string {
    const jwtService = new JwtService({
        secret: process.env.JWT_ACCESS_SECRET || 'test-secret',
    });

    const payload: ValidatedUser = {
        sub: user.sub || 1,
        email: user.email || 'test@example.com',
        role: user.role || null,
        roleId: user.roleId || null,
        teamId: user.teamId || null,
        dataScope: user.dataScope || DataScope.ALL,
        canSwitchTeams: user.canSwitchTeams ?? false,
        isActive: user.isActive ?? true,
    };

    return jwtService.sign(payload);
}

/**
 * Create authorization header for authenticated requests
 */
export function createAuthHeader(user: Partial<ValidatedUser> = {}): string {
    const token = createMockJwtToken(user);
    return `Bearer ${token}`;
}

/**
 * Create a mock ValidatedUser object
 */
export function createMockUser(overrides: Partial<ValidatedUser> = {}): ValidatedUser {
    return {
        sub: overrides.sub || 1,
        email: overrides.email || 'test@example.com',
        role: overrides.role || null,
        roleId: overrides.roleId || null,
        teamId: overrides.teamId || null,
        dataScope: overrides.dataScope || DataScope.ALL,
        canSwitchTeams: overrides.canSwitchTeams ?? false,
        isActive: overrides.isActive ?? true,
    };
}

/**
 * Mock JWT Auth Guard for testing
 * This allows tests to bypass authentication
 */
export const mockJwtAuthGuard = {
    canActivate: () => true,
};
