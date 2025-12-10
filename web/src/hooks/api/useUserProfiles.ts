import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userProfilesService } from "@/services";
import type { UserProfile } from "@/types/api.types";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

const userProfileKey = {
    all: ["user-profiles"] as const,
    detail: (userId: number) => [...userProfileKey.all, userId] as const,
};

export const useUserProfile = (userId?: number) => {
    return useQuery({
        queryKey: userId ? userProfileKey.detail(userId) : userProfileKey.all,
        queryFn: () => userProfilesService.getByUserId(userId!),
        enabled: !!userId,
    });
};

export const useCreateUserProfile = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Omit<UserProfile, "id">) => userProfilesService.create(data),
        onSuccess: profile => {
            queryClient.invalidateQueries({ queryKey: userProfileKey.detail(profile.userId) });
            toast.success("User profile saved successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateUserProfile = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, data }: { userId: number; data: Partial<UserProfile> }) => userProfilesService.update(userId, data),
        onSuccess: profile => {
            queryClient.invalidateQueries({ queryKey: userProfileKey.detail(profile.userId) });
            toast.success("User profile updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};
