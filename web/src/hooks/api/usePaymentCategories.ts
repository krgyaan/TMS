import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentCategoryService } from '@/services/api/payment-category.api';
import type {
    CreatePaymentCategoryDto,
    PaymentCategoryListParams,
} from '@/services/api/payment-category.api';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';

export const paymentCategoryKeys = {
    all: ['payment-categories'] as const,
    lists: () => [...paymentCategoryKeys.all, 'list'] as const,
    list: (params?: PaymentCategoryListParams) =>
        [...paymentCategoryKeys.lists(), { params }] as const,
};

/**
 * Fetch payment categories (types + subtypes) for a purpose.
 * Dropdown usage: `{ purpose: 'fixed', status: 'active' }`.
 */
export const usePaymentCategories = (
    params: PaymentCategoryListParams = { purpose: 'fixed', status: 'active' }
) => {
    return useQuery({
        queryKey: paymentCategoryKeys.list(params),
        queryFn: () => paymentCategoryService.getAll(params),
    });
};

export const useCreatePaymentCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreatePaymentCategoryDto) => paymentCategoryService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: paymentCategoryKeys.all });
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};
