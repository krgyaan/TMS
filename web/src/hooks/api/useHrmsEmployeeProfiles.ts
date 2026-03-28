import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hrmsEmployeeProfilesService, type EmployeeProfile } from "@/services/api/hrms-employee-profiles.service";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const hrmsEmployeeProfileKeys = {
    all: ["hrms-employee-profiles"] as const,
    detail: (userId: number) => [...hrmsEmployeeProfileKeys.all, userId] as const,
};

export const useHrmsEmployeeProfile = (userId?: number) => {
    return useQuery({
        queryKey: userId ? hrmsEmployeeProfileKeys.detail(userId) : hrmsEmployeeProfileKeys.all,
        queryFn: () => hrmsEmployeeProfilesService.getByUserId(userId!),
        enabled: !!userId,
    });
};

export const useCreateHrmsEmployeeProfile = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Partial<EmployeeProfile>) => hrmsEmployeeProfilesService.create(data),
        onSuccess: profile => {
            queryClient.invalidateQueries({ queryKey: hrmsEmployeeProfileKeys.detail(profile.userId) });
            queryClient.invalidateQueries({ queryKey: hrmsEmployeeProfileKeys.all });
            toast.success("Employee profile details created successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateHrmsEmployeeProfile = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, data }: { userId: number; data: Partial<EmployeeProfile> }) => 
            hrmsEmployeeProfilesService.updateByUserId(userId, data),
        onSuccess: profile => {
            queryClient.invalidateQueries({ queryKey: hrmsEmployeeProfileKeys.detail(profile.userId) });
            queryClient.invalidateQueries({ queryKey: hrmsEmployeeProfileKeys.all });
            toast.success("Employee profile details updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};
