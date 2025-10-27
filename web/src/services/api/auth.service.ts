import { BaseApiService } from './base.service'
import type { User } from '@/types/api.types'

interface LoginResponse {
    user: User
    // No accessToken - it's in httpOnly cookie
}

interface GoogleAuthUrlResponse {
    url: string
}

class AuthService extends BaseApiService {
    constructor() {
        super('/auth')
    }

    async login(email: string, password: string): Promise<LoginResponse> {
        return this.post<LoginResponse>('/login', { email, password })
    }

    async logout(): Promise<void> {
        // Backend will clear the cookie
        return this.post<void>('/logout')
    }

    async getCurrentUser(): Promise<{ user: User }> {
        return this.get<{ user: User }>('/me')
    }

    async getGoogleAuthUrl(): Promise<GoogleAuthUrlResponse> {
        return this.get<GoogleAuthUrlResponse>('/google/url')
    }
}

export const authService = new AuthService()
