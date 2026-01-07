import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { infoSheetsService } from "@/services/api";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";
import type { SaveTenderInfoSheetDto } from "@/modules/tendering/info-sheet/helpers/tenderInfoSheet.types";

export const infoSheetsKey = {
    all: ["info-sheets"] as const,
    details: () => [...infoSheetsKey.all, "detail"] as const,
    detail: (tenderId: number) => [...infoSheetsKey.details(), tenderId] as const,
};

export const useInfoSheet = (tenderId: number | null) => {
    return useQuery({
        queryKey: tenderId ? infoSheetsKey.detail(tenderId) : infoSheetsKey.detail(0),
        queryFn: () => infoSheetsService.getByTenderId(tenderId!),
        enabled: !!tenderId,
    });
};

export const useCreateInfoSheet = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tenderId, data }: { tenderId: number; data: SaveTenderInfoSheetDto }) => infoSheetsService.create(tenderId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: infoSheetsKey.detail(variables.tenderId) });
            queryClient.invalidateQueries({ queryKey: infoSheetsKey.all });
            toast.success("Tender info sheet created successfully");
        },
        onError: error => {
            const errorMessage = handleQueryError(error);
            // Provide more specific error messages
            if (errorMessage.includes('Invalid field values') || errorMessage.includes('validation')) {
                toast.error(`Validation Error: ${errorMessage}. Please check all required fields.`, {
                    duration: 6000,
                });
            } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
                toast.error("Network Error: Unable to connect to server. Please check your connection and try again.", {
                    duration: 5000,
                });
            } else {
                toast.error(errorMessage || "Failed to create tender info sheet. Please try again.");
            }
        },
    });
};

export const useUpdateInfoSheet = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tenderId, data }: { tenderId: number; data: SaveTenderInfoSheetDto }) => infoSheetsService.update(tenderId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: infoSheetsKey.detail(variables.tenderId) });
            queryClient.invalidateQueries({ queryKey: infoSheetsKey.all });
            toast.success("Tender info sheet updated successfully");
        },
        onError: error => {
            const errorMessage = handleQueryError(error);
            // Provide more specific error messages
            if (errorMessage.includes('Invalid field values') || errorMessage.includes('validation')) {
                toast.error(`Validation Error: ${errorMessage}. Please check all required fields.`, {
                    duration: 6000,
                });
            } else if (errorMessage.includes('not found')) {
                toast.error("Error: Info sheet not found. Please refresh the page and try again.", {
                    duration: 5000,
                });
            } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
                toast.error("Network Error: Unable to connect to server. Please check your connection and try again.", {
                    duration: 5000,
                });
            } else {
                toast.error(errorMessage || "Failed to update tender info sheet. Please try again.");
            }
        },
    });
};
