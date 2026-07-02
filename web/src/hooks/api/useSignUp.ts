// src/hooks/api/useSignup.ts
import { useMutation } from "@tanstack/react-query";
import { onboardingApiService, type SignupPayload, type SignupResponse } from "@/services/api/hrms-onboarding.service";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

/**
 * Submit employee signup/onboarding request
 */
export const useSubmitSignup = () => {
    return useMutation<SignupResponse, Error, SignupPayload>({
        mutationFn: (data: SignupPayload) => onboardingApiService.submitSignup(data),
        onSuccess: (response) => {
            toast.success(response.message || "Registration submitted successfully!");
        },
        onError: (error: any) => {
            // Specifically handle 409 Conflict for duplicate emails
            if (error?.response?.status === 409) {
                const conflictMessage = error.response?.data?.message || "This email has already been registered.";
                toast.error(conflictMessage);
            } else {
                // Fallback to your app's standard error handler
                toast.error(handleQueryError(error));
            }
        },
    });
};