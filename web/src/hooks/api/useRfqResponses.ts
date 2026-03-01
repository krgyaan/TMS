import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";
import { rfqResponseService } from "@/services/api/rfqResponse.service";
import type { CreateRfqResponseBodyDto } from "@/modules/tendering/rfq-response/helpers/rfqResponse.types";

export const rfqResponseKey = {
    all: ["rfq-responses"] as const,
    responsesByRfq: (rfqId: number) => [...rfqResponseKey.all, "by-rfq", rfqId] as const,
    allResponses: () => [...rfqResponseKey.all, "all"] as const,
    responseDetail: (responseId: number) => [...rfqResponseKey.all, "detail", responseId] as const,
};

export const useCreateRfqResponse = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ rfqId, data }: { rfqId: number; data: CreateRfqResponseBodyDto }) =>
            rfqResponseService.createRfqResponse(rfqId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["rfqs", "list"] });
            queryClient.invalidateQueries({ queryKey: ["rfqs", "detail"] });
            queryClient.invalidateQueries({ queryKey: rfqResponseKey.responsesByRfq(variables.rfqId) });
            queryClient.invalidateQueries({ queryKey: rfqResponseKey.allResponses() });
            toast.success("RFQ response recorded successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useRfqResponses = (rfqId: number | null) => {
    return useQuery({
        queryKey: rfqResponseKey.responsesByRfq(rfqId ?? 0),
        queryFn: () => rfqResponseService.getResponsesByRfqId(rfqId ?? 0),
        enabled: !!rfqId,
    });
};

export const useAllRfqResponses = () => {
    return useQuery({
        queryKey: rfqResponseKey.allResponses(),
        queryFn: () => rfqResponseService.getAllResponses(),
    });
};

export const useRfqResponse = (responseId: number | null) => {
    return useQuery({
        queryKey: rfqResponseKey.responseDetail(responseId ?? 0),
        queryFn: () => rfqResponseService.getResponseById(responseId ?? 0),
        enabled: !!responseId,
    });
};
