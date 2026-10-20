import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { vendorApi } from "@/services/api";
import { handleQueryError } from "@/lib/react-query";
import { vendorOrganizationsKey } from "@/hooks/api/useVendorOrganizations";
import type { VendorMergeResult } from "@/types/api.types";

export const vendorMergeKey = {
    preview: (keepId: number, dropId: number) => ["vendorMerge", "preview", keepId, dropId] as const,
};

export const useVendorMergePreview = (keepId: number | null, dropId: number | null) => {
    return useQuery({
        queryKey: vendorMergeKey.preview(keepId!, dropId!),
        queryFn: () => vendorApi.getMergePreview(keepId!, dropId!),
        enabled: !!keepId && !!dropId && keepId !== dropId,
    });
};

export const useMergeVendors = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { keepId: number; dropId: number }) => vendorApi.mergeVendors(data),
        onSuccess: (result: VendorMergeResult) => {
            queryClient.invalidateQueries({ queryKey: vendorOrganizationsKey.all });
            toast.success(`Vendors merged — references moved to vendor #${result.keptId}`);
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};
