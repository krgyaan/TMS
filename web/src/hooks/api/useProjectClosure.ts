import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AddProjectClosureDocumentDto, ProjectClosureDocumentRow } from "@/modules/operations/project-dashboard/helpers/projectClosure.types";
import { toast } from "sonner";
import { handleQueryError } from "@/lib/react-query";
import { projectClosureApi } from "@/services/api/project-closure.api";

export const projectClosureKey = {
    all: ["project-closure"] as const,
    list: (projectId: number) => [...projectClosureKey.all, "list", projectId] as const,
};

export const useProjectClosureDocuments = (projectId: number | null) => {
    return useQuery<ProjectClosureDocumentRow[]>({
        queryKey: projectClosureKey.list(projectId ?? 0),
        queryFn: () => projectClosureApi.getClosureDocuments(projectId!),
        enabled: !!projectId,
    });
};

export const useAddProjectClosureDocument = (projectId: number | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: AddProjectClosureDocumentDto) => projectClosureApi.addClosureDocument(projectId!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectClosureKey.list(projectId ?? 0) });
            toast.success("Document uploaded successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteProjectClosureDocument = (projectId: number | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (documentName: string) => projectClosureApi.deleteClosureDocument(projectId!, documentName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectClosureKey.list(projectId ?? 0) });
            toast.success("Document deleted successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};
