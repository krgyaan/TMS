import { transporterApi, type CreateTransporterPayload } from '@/services/api/transporter.api';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const transporterKeys = {
    all: ['transporters'] as const,
    options: (q?: string, ids?: number[]) => [...transporterKeys.all, 'options', q ?? '', ids ?? []] as const,
};

export const useTransporterOptions = (q?: string, ids?: number[]) => {
    return useQuery({
        queryKey: transporterKeys.options(q, ids),
        queryFn: () => transporterApi.getTransporterOptions(q, ids),
        placeholderData: keepPreviousData,
        staleTime: 30 * 1000,
    });
};

export const useCreateTransporter = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateTransporterPayload) => transporterApi.createTransporter(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: transporterKeys.all });
        },
    });
};
