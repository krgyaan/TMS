import { BaseApiService } from './base.service';
import type { AuthUser } from '@/types/auth.types';

interface LoginResponse {
    user: AuthUser;
}

interface GoogleAuthUrlResponse {
    url: string;
}

class AuthService extends BaseApiService {
    constructor() {
        super('/auth');
    }

    async login(email: string, password: string): Promise<LoginResponse> {
        return this.post<LoginResponse>('/login', { email, password });
    }

    async logout(): Promise<void> {
        return this.post<void>('/logout');
    }

    async getCurrentUser(): Promise<{ user: AuthUser }> {
        return this.get<{ user: AuthUser }>('/me');
    }

    async getGoogleAuthUrl(): Promise<GoogleAuthUrlResponse> {
        return this.get<GoogleAuthUrlResponse>('/google/url');
    }

    /**
     * Exchange Google OAuth code for session
     */
    async googleCallback(code: string, state?: string): Promise<LoginResponse> {
        return this.post<LoginResponse>('/google/callback', { code, state });
    }

    /**
     * Refresh the current session to get updated role/team info
     */
    async refreshSession(): Promise<LoginResponse> {
        return this.post<LoginResponse>('/refresh');
    }
}

export const authService = new AuthService();
