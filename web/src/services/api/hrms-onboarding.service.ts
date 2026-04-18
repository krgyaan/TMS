// src/services/api/onboarding.service.ts
import { BaseApiService } from "./base.service";

export interface SignupPayload {
    firstName: string;
    middleName?: string;
    lastName: string;
    dateOfBirth: string;
    gender: 'Male' | 'Female' | 'Other';
    maritalStatus: string;
    nationality: string;
    personalEmail: string;
    phone: string;
    alternatePhone?: string;
    aadharNumber?: string;
    panNumber?: string;
    
    currentAddressLine1: string;
    currentAddressLine2?: string;
    currentCity: string;
    currentState: string;
    currentCountry: string;
    currentPostalCode: string;
    
    sameAsCurrent?: boolean;
    permanentAddressLine1?: string;
    permanentAddressLine2?: string;
    permanentCity?: string;
    permanentState?: string;
    permanentCountry?: string;
    permanentPostalCode?: string;
    
    emergencyContactName: string;
    emergencyContactRelationship: string;
    emergencyContactPhone: string;
    emergencyContactAltPhone?: string;
    emergencyContactEmail?: string;
}

export interface SignupResponse {
    id: number;
    message: string;
}

class OnboardingApiService extends BaseApiService {
    constructor() {
        // Base route for onboarding
        super("/hrms/onboarding");
    }

    // ─── Write Operations ─────────────────────────────────────────────────────

    /**
     * Submit a new employee registration (Public Endpoint)
     */
    async submitSignup(data: SignupPayload): Promise<SignupResponse> {
        return this.post<SignupResponse>("/signup", data);
    }
}

export const onboardingApiService = new OnboardingApiService();
export type { OnboardingApiService };