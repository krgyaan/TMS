import { BaseApiService } from "./base.service";
import type { AuthUser } from "@/types/auth.types";

interface LoginResponse {
    user: AuthUser;
}

interface GoogleAuthUrlResponse {
    url: string;
}

class AuthService extends BaseApiService {
    constructor() {
        super("/auth");
    }

    async login(email: string, password: string): Promise<LoginResponse> {
        return this.post<LoginResponse>("/login", { email, password });
    }

    async logout(): Promise<void> {
        console.log("🔍 Logout - calling API");
        return this.post<void>("/logout");
    }

    async getCurrentUser(): Promise<{ user: AuthUser }> {
        return this.get<{ user: AuthUser }>("/me");
    }

    async getGoogleAuthUrl(): Promise<GoogleAuthUrlResponse> {
        return this.get<GoogleAuthUrlResponse>("/google/url");
    }

    /**
     * Exchange Google OAuth code for session
     */
    async googleCallback(code: string, state?: string): Promise<LoginResponse> {
        return this.post<LoginResponse>("/google/callback", { code, state }, { skipAuthRedirect: true });
    }

    async forgotPassword(email: string): Promise<{ message: string }> {
        return this.post<{ message: string }>("/forgot-password", { email });
    }

    async verifyOtp(email: string, otp: string): Promise<{ token: string }> {
        return this.post<{ token: string }>("/verify-otp", { email, otp });
    }

    async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
        return this.post<{ message: string }>("/reset-password", { token, newPassword });
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
        return this.post<{ message: string }>("/change-password", { currentPassword, newPassword });
    }

    /**
     * Refresh the current session to get updated role/team info
     */
    async refreshSession(): Promise<LoginResponse> {
        return this.post<LoginResponse>("/refresh");
    }
}

export const authService = new AuthService();
