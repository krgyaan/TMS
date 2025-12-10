import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/api";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { setStoredUser, clearAuthSession, getStoredUser } from "@/lib/auth";
import type { AuthUser } from "@/types/auth.types";

export const authKeys = {
    currentUser: ["auth", "currentUser"] as const,
    googleUrl: ["auth", "googleUrl"] as const,
};

export const useCurrentUser = () => {
    return useQuery({
        queryKey: authKeys.currentUser,
        queryFn: async (): Promise<AuthUser | null> => {
            try {
                const response = await authService.getCurrentUser();
                const user = response.user;
                setStoredUser(user);
                return user;
            } catch (error) {
                clearAuthSession();
                return null;
            }
        },
        retry: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
        initialData: () => getStoredUser(),
    });
};

export const useLogin = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ email, password }: { email: string; password: string }) => authService.login(email, password),
        onSuccess: data => {
            const user = data.user;

            setStoredUser(user);
            queryClient.setQueryData(authKeys.currentUser, user);

            console.log("✅ Login successful");
            console.log("   User:", user.name);
            console.log("   Role:", user.role?.name ?? "No role");
            console.log("   Team:", user.team?.name ?? "No team");
            console.log("   Data Scope:", user.role?.dataScope ?? "self");

            toast.success(`Welcome back, ${user.name}!`);
            navigate("/", { replace: true });
        },
        onError: error => {
            console.error("❌ Login failed:", error);
            toast.error(handleQueryError(error));
        },
    });
};

export const useGoogleAuthUrl = () => {
    return useQuery({
        queryKey: authKeys.googleUrl,
        queryFn: () => authService.getGoogleAuthUrl(),
        enabled: false,
        staleTime: 4 * 60 * 1000, // URL valid for ~5 mins
    });
};

export const useGoogleLogin = () => {
    const { refetch } = useGoogleAuthUrl();

    return useMutation({
        mutationFn: async () => {
            const result = await refetch();
            if (result.data?.url) {
                window.location.href = result.data.url;
            }
            return result.data;
        },
        onError: error => {
            console.error("❌ Failed to get Google auth URL:", error);
            toast.error("Failed to initiate Google sign-in");
        },
    });
};

export const useLogout = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => authService.logout(),
        onSuccess: () => {
            clearAuthSession();
            queryClient.clear();
            toast.success("Logged out successfully");
            navigate("/login", { replace: true });
        },
        onError: error => {
            console.error("❌ Logout failed:", error);
            clearAuthSession();
            queryClient.clear();
            navigate("/login", { replace: true });
        },
    });
};

export const useRefreshSession = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => authService.refreshSession(),
        onSuccess: data => {
            setStoredUser(data.user);
            queryClient.setQueryData(authKeys.currentUser, data.user);
            console.log("✅ Session refreshed");
        },
        onError: error => {
            console.error("❌ Session refresh failed:", error);
        },
    });
};
