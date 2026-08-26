import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { enquiryResultService } from "@/services/api/enquiry-result.service";
import type { EnquiryResultListParams, CreateEnquiryResultRequest, UpdateEnquiryResultRequest, CreateEnquiryFollowupRequest } from "@/modules/crm/enquiry-result/helpers/enquiry-result.type";

const enquiryResultKey = {
    all: ['enquiry-results'],
    lists: () => [...enquiryResultKey.all, 'list'],
    list: (filters: EnquiryResultListParams) => [...enquiryResultKey.lists(), { filters }],
    details: () => [...enquiryResultKey.all, 'detail'],
    detail: (id: number) => [...enquiryResultKey.details(), id],
    byLead: (leadId: number) => [...enquiryResultKey.all, 'by-lead', leadId],
    byHappyCalling: (happyCallingId: number) => [...enquiryResultKey.all, 'by-happy-calling', happyCallingId],
    followupsByQuotation: (quotationId: number) => [...enquiryResultKey.all, 'followups-by-quotation', quotationId],
    statusSummary: () => [...enquiryResultKey.all, 'status-summary'],
};

export function useEnquiryResults(params: EnquiryResultListParams) {
    return useQuery({
        queryKey: enquiryResultKey.list(params),
        queryFn: () => enquiryResultService.getAll(params),
    });
}

export function useEnquiryResult(id: number | null) {
    return useQuery({
        queryKey: enquiryResultKey.detail(id!),
        queryFn: () => enquiryResultService.getById(id!),
        enabled: !!id,
    });
}

export function useEnquiryResultsByLead(leadId: number | null) {
    return useQuery({
        queryKey: enquiryResultKey.byLead(leadId!),
        queryFn: () => enquiryResultService.getByLeadId(leadId!),
        enabled: !!leadId,
    });
}

export function useEnquiryResultsByHappyCalling(happyCallingId: number | null) {
    return useQuery({
        queryKey: enquiryResultKey.byHappyCalling(happyCallingId!),
        queryFn: () => enquiryResultService.getByHappyCallingId(happyCallingId!),
        enabled: !!happyCallingId,
    });
}

export function useEnquiryResultStatusSummary() {
    return useQuery({
        queryKey: enquiryResultKey.statusSummary(),
        queryFn: () => enquiryResultService.getStatusSummary(),
    });
}

export function useFollowupsByQuotation(quotationId: number | null) {
    return useQuery({
        queryKey: enquiryResultKey.followupsByQuotation(quotationId!),
        queryFn: () => enquiryResultService.getFollowupsByQuotation(quotationId!),
        enabled: !!quotationId,
    });
}

export function useCreateEnquiryResult() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateEnquiryResultRequest) => enquiryResultService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: enquiryResultKey.lists() });
        },
    });
}

export function useUpdateEnquiryResult() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateEnquiryResultRequest }) =>
            enquiryResultService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: enquiryResultKey.lists() });
            queryClient.invalidateQueries({ queryKey: enquiryResultKey.details() });
            queryClient.invalidateQueries({ queryKey: enquiryResultKey.statusSummary() });
        },
    });
}

export function useDeleteEnquiryResult() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => enquiryResultService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: enquiryResultKey.lists() });
        },
    });
}

export function useCreateEnquiryResultFollowup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: CreateEnquiryFollowupRequest }) =>
            enquiryResultService.createFollowup(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: enquiryResultKey.lists() });
            queryClient.invalidateQueries({ queryKey: enquiryResultKey.details() });
            queryClient.invalidateQueries({ queryKey: enquiryResultKey.statusSummary() });
        },
    });
}
