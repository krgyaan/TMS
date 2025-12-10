import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsSubmittedService } from "@/services";
import type { CreateDocumentSubmittedDto, UpdateDocumentSubmittedDto } from "@/types/api.types";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const documentsSubmittedKey = {
    all: ["documentsSubmitted"] as const,
    lists: () => [...documentsSubmittedKey.all, "list"] as const,
    list: (filters?: any) => [...documentsSubmittedKey.lists(), { filters }] as const,
    details: () => [...documentsSubmittedKey.all, "detail"] as const,
    detail: (id: number) => [...documentsSubmittedKey.details(), id] as const,
};

// Get all documents submitted
export const useDocumentsSubmitted = () => {
    return useQuery({
        queryKey: documentsSubmittedKey.lists(),
        queryFn: () => documentsSubmittedService.getAll(),
    });
};

// Get document submitted by ID
export const useDocumentSubmitted = (id: number | null) => {
    return useQuery({
        queryKey: documentsSubmittedKey.detail(id!),
        queryFn: () => documentsSubmittedService.getById(id!),
        enabled: !!id,
    });
};

// Search documents submitted
export const useDocumentSubmittedSearch = (query: string) => {
    return useQuery({
        queryKey: [...documentsSubmittedKey.all, "search", query],
        // queryFn: () => documentsSubmittedService.search(query),
        enabled: query.length > 0,
    });
};

// Create document submitted
export const useCreateDocumentSubmitted = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateDocumentSubmittedDto) => documentsSubmittedService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentsSubmittedKey.lists() });
            toast.success("Document type created successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

// Update document submitted
export const useUpdateDocumentSubmitted = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateDocumentSubmittedDto }) => documentsSubmittedService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: documentsSubmittedKey.lists() });
            queryClient.invalidateQueries({
                queryKey: documentsSubmittedKey.detail(variables.id),
            });
            toast.success("Document type updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

// Delete document submitted
// export const useDeleteDocumentSubmitted = () => {
//     const queryClient = useQueryClient();

//     return useMutation({
//         mutationFn: (id: number) => documentsSubmittedService.delete(id),
//         onSuccess: () => {
//             queryClient.invalidateQueries({ queryKey: documentsSubmittedKey.lists() });
//             toast.success('Document type deleted successfully');
//         },
//         onError: (error) => {
//             toast.error(handleQueryError(error));
//         },
//     });
// };
