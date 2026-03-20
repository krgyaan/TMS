import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { woAcceptanceService } from '@/services/api/wo-acceptance.api';
import { toast } from 'sonner';
import { handleQueryError } from '@/lib/react-query';
import type { WoAcceptanceDecisionDto } from '@/modules/operations/types/wo.types';
import { woDetailsKeys } from './useWoDetails';

export const woAcceptanceKeys = {
  all: ['wo-acceptance'] as const,
  details: (id: number) => [...woAcceptanceKeys.all, 'detail', id] as const,
};

export const useWoAcceptanceDetails = (woDetailId: number) => {
  return useQuery({
    queryKey: woAcceptanceKeys.details(woDetailId),
    queryFn: () => woAcceptanceService.getDetails(woDetailId),
    enabled: !!woDetailId,
  });
};

export const useSubmitAcceptanceDecision = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ woDetailId, data }: { woDetailId: number; data: WoAcceptanceDecisionDto }) =>
      woAcceptanceService.submitDecision(woDetailId, data),
    onSuccess: (_, { woDetailId }) => {
      queryClient.invalidateQueries({ queryKey: woAcceptanceKeys.details(woDetailId) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.all });
      toast.success('Decision submitted successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};
