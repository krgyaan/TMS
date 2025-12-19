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
            toast.error(handleQueryError(error));
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
            toast.error(handleQueryError(error));
        },
    });
};
