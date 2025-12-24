import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { setStoredUser, clearAuthSession } from "@/lib/auth";
import type { AuthUser } from "@/types/auth.types";
import { authKeys } from "@/hooks/api/useAuth";
import { authService } from "@/services/api";
import { toast } from "sonner";

const GoogleLoginCallback = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const processed = useRef(false);

    const [message, setMessage] = useState("Completing sign-in...");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (processed.current) {
            console.log("⏭️ Google Callback - Already processed, skipping...");
            return;
        }
        processed.current = true;

        const handleCallback = async () => {
            const params = new URLSearchParams(location.search);
            const code = params.get("code");
            const state = params.get("state");
            const errorParam = params.get("error");
            const successParam = params.get("success");
            const redirectTo = sessionStorage.getItem("auth_redirect") || "/";

            console.log("🔍 Google Callback - Processing...");
            console.log("📋 URL Params:", { code: !!code, state: !!state, error: errorParam, success: successParam });

            // Handle error from Google or backend
            if (errorParam) {
                console.error("❌ Google OAuth error:", errorParam);
                setError(`Google sign-in failed: ${errorParam}`);
                setMessage("");
                clearAuthSession();
                toast.error(`Google sign-in failed: ${errorParam}`);
                setTimeout(() => navigate(redirectTo, { replace: true }), 2000);
                return;
            }

            // If backend already processed the callback (success=true), verify auth and redirect
            if (successParam === "true") {
                console.log("✅ Backend already processed callback, verifying authentication...");
                setMessage("Verifying authentication...");

                try {
                    // Verify user is authenticated by checking current user
                    const response = await authService.getCurrentUser();
                    const user = response.user as AuthUser;

                    console.log("✅ User authenticated");

                    // Store user data
                    setStoredUser(user);
                    queryClient.setQueryData(authKeys.currentUser, user);

                    setMessage("Success! Redirecting...");
                    toast.success(`Welcome, ${user.name}!`);

                    // Clean up stored redirect and navigate
                    sessionStorage.removeItem("auth_redirect");
                    setTimeout(() => {
                        navigate(redirectTo, { replace: true });
                    }, 500);
                } catch (err) {
                    console.error("❌ Failed to verify authentication:", err);
                    setError("Failed to verify authentication");
                    setMessage("");
                    clearAuthSession();
                    toast.error("Authentication verification failed");
                    setTimeout(() => navigate("/login", { replace: true }), 2000);
                }
                return;
            }

            // Validate we have the code (for direct frontend callback flow)
            if (!code) {
                console.error("❌ No authorization code received");
                setError("No authorization code received from Google");
                setMessage("");
                clearAuthSession();
                toast.error("Google sign-in failed");
                setTimeout(() => navigate("/login", { replace: true }), 2000);
                return;
            }

            try {
                setMessage("Verifying with server...");

                // Call backend to exchange code for session
                const response = await authService.googleCallback(code, state ?? undefined);
                const user = response.user as AuthUser;

                console.log("✅ Google auth successful");

                // Store user data
                setStoredUser(user);
                queryClient.setQueryData(authKeys.currentUser, user);

                setMessage("Success! Redirecting...");
                toast.success(`Welcome, ${user.name}!`);

                // Clean up stored redirect and navigate
                sessionStorage.removeItem("auth_redirect");
                setTimeout(() => {
                    navigate(redirectTo, { replace: true });
                }, 500);

            } catch (err) {
                console.error("❌ Google callback failed:", err);

                const errorMessage = err instanceof Error
                    ? err.message
                    : "Failed to complete Google sign-in";

                setError(errorMessage);
                setMessage("");
                clearAuthSession();
                toast.error(errorMessage);

                setTimeout(() => navigate("/login", { replace: true }), 2000);
            }
        };

        handleCallback();
    }, [location.search, navigate, queryClient]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
            <div className="max-w-md text-center space-y-4">
                {message && (
                    <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
                        <p className="text-muted-foreground">{message}</p>
                    </div>
                )}
                {error && (
                    <div className="text-destructive space-y-2">
                        <p className="font-medium">{error}</p>
                        <p className="text-sm text-muted-foreground">Redirecting to login...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GoogleLoginCallback;
