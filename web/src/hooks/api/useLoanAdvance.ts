import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { loanAdvanceService } from '@/services/api/loan-advance.service';
import type {
  // Loan Advance Types
  LoanAdvanceListRow,
  LoanAdvanceResponse,
  LoanAdvanceListParams,
  LoanAdvanceFullDetails,
  CreateLoanAdvanceDto,
  UpdateLoanAdvanceDto,
  LoanClosureDto,
  // Bank Contact Types
  BankContactListRow,
  CreateBankContactDto,
  UpdateBankContactDto,
  // Due EMI Types
  DueEmiListRow,
  CreateDueEmiDto,
  UpdateDueEmiDto,
  // TDS Recovery Types
  TdsRecoveryListRow,
  CreateTdsRecoveryDto,
  UpdateTdsRecoveryDto,
} from '@/modules/accounts/loan-advances/helpers/loanAdvance.types';
import type { PaginatedResult } from '@/types/api.types';
import { toast } from 'sonner';
import { handleQueryError } from '@/lib/react-query';

// ===================== QUERY KEYS =====================

export const loanAdvanceKeys = {
  // Loan Advances
  all: ['loan-advances'] as const,
  lists: () => [...loanAdvanceKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...loanAdvanceKeys.lists(), { filters }] as const,
  detail: (id: number) => [...loanAdvanceKeys.all, 'detail', id] as const,
  fullDetail: (id: number) => [...loanAdvanceKeys.all, 'full-detail', id] as const,

  // Bank Contacts
  contacts: (loanId: number) => [...loanAdvanceKeys.all, 'contacts', loanId] as const,

  // Due EMIs
  emis: (loanId: number) => [...loanAdvanceKeys.all, 'emis', loanId] as const,

  // TDS Recoveries
  recoveries: (loanId: number) => [...loanAdvanceKeys.all, 'recoveries', loanId] as const,
};

// ===================== LOAN ADVANCES HOOKS =====================

/**
 * Hook to fetch paginated loan advances list
 */
export const useLoanAdvances = (
  pagination: { page: number; limit: number; search?: string } = { page: 1, limit: 10 },
  sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
  filters?: { loanPartyName?: string; typeOfLoan?: string; loanCloseStatus?: string }
) => {
  const params: LoanAdvanceListParams = {
    page: pagination.page,
    limit: pagination.limit,
    ...(sort?.sortBy && { sortBy: sort.sortBy as LoanAdvanceListParams['sortBy'] }),
    ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
    ...(pagination.search && { search: pagination.search }),
    ...(filters?.loanPartyName && { loanPartyName: filters.loanPartyName as any }),
    ...(filters?.typeOfLoan && { typeOfLoan: filters.typeOfLoan as any }),
    ...(filters?.loanCloseStatus && { loanCloseStatus: filters.loanCloseStatus as any }),
  };

  return useQuery<PaginatedResult<LoanAdvanceListRow>>({
    queryKey: loanAdvanceKeys.list({
      page: pagination.page,
      limit: pagination.limit,
      search: pagination.search ?? undefined,
      sortBy: sort?.sortBy,
      sortOrder: sort?.sortOrder,
      ...filters,
    }),
    queryFn: () => loanAdvanceService.getAll(params),
    placeholderData: (previousData) => {
      if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
        return previousData;
      }
      return undefined;
    },
  });
};

const PAGE_SIZE = 100;

/**
 * Hook to fetch all loan advances (for dropdowns, etc.)
 */
export const useLoanAdvancesAll = () => {
  return useQuery<PaginatedResult<LoanAdvanceListRow>>({
    queryKey: loanAdvanceKeys.list({ all: true }),
    queryFn: async () => {
      const first = await loanAdvanceService.getAll({ page: 1, limit: PAGE_SIZE });
      const { totalPages } = first.meta;
      if (totalPages <= 1) return first;
      const rest = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          loanAdvanceService.getAll({ page: i + 2, limit: PAGE_SIZE })
        )
      );
      return {
        data: [...first.data, ...rest.flatMap((r) => r.data)],
        meta: first.meta,
      };
    },
  });
};

/**
 * Hook to fetch a single loan advance by ID
 */
export const useLoanAdvance = (id: number | null) => {
  return useQuery<LoanAdvanceResponse>({
    queryKey: loanAdvanceKeys.detail(id ?? 0),
    queryFn: () => loanAdvanceService.getById(id!),
    enabled: !!id,
  });
};

/**
 * Hook to fetch full loan advance details (with relations)
 */
export const useLoanAdvanceFullDetails = (id: number | null) => {
  return useQuery<LoanAdvanceFullDetails>({
    queryKey: loanAdvanceKeys.fullDetail(id ?? 0),
    queryFn: () => loanAdvanceService.getFullDetails(id!),
    enabled: !!id,
  });
};

/**
 * Hook to create a new loan advance
 */
export const useCreateLoanAdvance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLoanAdvanceDto) => loanAdvanceService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.lists() });
      toast.success('Loan created successfully');
    },
    onError: (error) => {
      toast.error(handleQueryError(error));
    },
  });
};

/**
 * Hook to update a loan advance
 */
export const useUpdateLoanAdvance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Omit<UpdateLoanAdvanceDto, 'id'> }) =>
      loanAdvanceService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.fullDetail(data.id) });
      toast.success('Loan updated successfully');
    },
    onError: (error) => {
      toast.error(handleQueryError(error));
    },
  });
};

/**
 * Hook to close a loan
 */
export const useCloseLoanAdvance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: LoanClosureDto }) =>
      loanAdvanceService.closeLoan(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.fullDetail(data.id) });
      toast.success('Loan closed successfully');
    },
    onError: (error) => {
      toast.error(handleQueryError(error));
    },
  });
};

/**
 * Hook to delete a loan advance
 */
export const useDeleteLoanAdvance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => loanAdvanceService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.lists() });
      toast.success('Loan deleted successfully');
    },
    onError: (error) => {
      toast.error(handleQueryError(error));
    },
  });
};

// ===================== BANK CONTACTS HOOKS =====================

/**
 * Hook to fetch bank contacts for a loan
 */
export const useLoanBankContacts = (loanId: number | null) => {
  return useQuery<BankContactListRow[]>({
    queryKey: loanAdvanceKeys.contacts(loanId ?? 0),
    queryFn: () => loanAdvanceService.getContacts(loanId!),
    enabled: !!loanId,
  });
};

/**
 * Hook to create a bank contact
 */
export const useCreateBankContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ loanId, data }: { loanId: number; data: Omit<CreateBankContactDto, 'loanId'> }) =>
      loanAdvanceService.createContact(loanId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.contacts(data.loanId) });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.fullDetail(data.loanId) });
      toast.success('Contact added successfully');
    },
    onError: (error) => {
      toast.error(handleQueryError(error));
    },
  });
};

/**
 * Hook to update a bank contact
 */
export const useUpdateBankContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contactId,
      data,
    }: {
      contactId: number;
      loanId: number;
      data: Omit<UpdateBankContactDto, 'id'>;
    }) => loanAdvanceService.updateContact(contactId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.contacts(data.loanId) });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.fullDetail(data.loanId) });
      toast.success('Contact updated successfully');
    },
    onError: (error) => {
      toast.error(handleQueryError(error));
    },
  });
};

/**
 * Hook to delete a bank contact
 */
export const useDeleteBankContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId }: { contactId: number; loanId: number }) =>
      loanAdvanceService.removeContact(contactId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.contacts(variables.loanId) });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.fullDetail(variables.loanId) });
      toast.success('Contact deleted successfully');
    },
    onError: (error) => {
      toast.error(handleQueryError(error));
    },
  });
};

// ===================== DUE EMIS HOOKS =====================

/**
 * Hook to fetch EMIs for a loan
 */
export const useLoanEmis = (loanId: number | null) => {
  return useQuery<DueEmiListRow[]>({
    queryKey: loanAdvanceKeys.emis(loanId ?? 0),
    queryFn: () => loanAdvanceService.getEmis(loanId!),
    enabled: !!loanId,
  });
};

/**
 * Hook to create an EMI payment record
 */
export const useCreateEmi = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ loanId, data }: { loanId: number; data: Omit<CreateDueEmiDto, 'loanId'> }) =>
      loanAdvanceService.createEmi(loanId, data),
    onSuccess: (data) => {
      // Invalidate EMIs list
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.emis(data.loanId) });
      // Invalidate loan details (aggregated values are updated)
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.detail(data.loanId) });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.fullDetail(data.loanId) });
      // Invalidate loans list (for dashboard totals)
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.lists() });
      toast.success('EMI payment recorded successfully');
    },
    onError: (error) => {
      toast.error(handleQueryError(error));
    },
  });
};

/**
 * Hook to update an EMI record
 */
export const useUpdateEmi = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      emiId,
      data,
    }: {
      emiId: number;
      loanId: number;
      data: Omit<UpdateDueEmiDto, 'id'>;
    }) => loanAdvanceService.updateEmi(emiId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.emis(data.loanId) });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.detail(data.loanId) });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.fullDetail(data.loanId) });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.lists() });
      toast.success('EMI record updated successfully');
    },
    onError: (error) => {
      toast.error(handleQueryError(error));
    },
  });
};

/**
 * Hook to delete an EMI record
 */
export const useDeleteEmi = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ emiId }: { emiId: number; loanId: number }) =>
      loanAdvanceService.removeEmi(emiId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.emis(variables.loanId) });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.detail(variables.loanId) });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.fullDetail(variables.loanId) });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.lists() });
      toast.success('EMI record deleted successfully');
    },
    onError: (error) => {
      toast.error(handleQueryError(error));
    },
  });
};

// ===================== TDS RECOVERIES HOOKS =====================

/**
 * Hook to fetch TDS recoveries for a loan
 */
export const useLoanTdsRecoveries = (loanId: number | null) => {
  return useQuery<TdsRecoveryListRow[]>({
    queryKey: loanAdvanceKeys.recoveries(loanId ?? 0),
    queryFn: () => loanAdvanceService.getRecoveries(loanId!),
    enabled: !!loanId,
  });
};

/**
 * Hook to create a TDS recovery record
 */
export const useCreateTdsRecovery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ loanId, data }: { loanId: number; data: Omit<CreateTdsRecoveryDto, 'loanId'> }) =>
      loanAdvanceService.createRecovery(loanId, data),
    onSuccess: (data) => {
      // Invalidate TDS recoveries list
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.recoveries(data.loanId) });
      // Invalidate loan details (TDS to recover is updated)
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.detail(data.loanId) });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.fullDetail(data.loanId) });
      // Invalidate loans list (for dashboard totals)
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.lists() });
      toast.success('TDS recovery recorded successfully');
    },
    onError: (error) => {
      toast.error(handleQueryError(error));
    },
  });
};

/**
 * Hook to update a TDS recovery record
 */
export const useUpdateTdsRecovery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recoveryId,
      data,
    }: {
      recoveryId: number;
      loanId: number;
      data: Omit<UpdateTdsRecoveryDto, 'id'>;
    }) => loanAdvanceService.updateRecovery(recoveryId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.recoveries(data.loanId) });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.detail(data.loanId) });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.fullDetail(data.loanId) });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.lists() });
      toast.success('TDS recovery updated successfully');
    },
    onError: (error) => {
      toast.error(handleQueryError(error));
    },
  });
};

/**
 * Hook to delete a TDS recovery record
 */
export const useDeleteTdsRecovery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recoveryId }: { recoveryId: number; loanId: number }) =>
      loanAdvanceService.removeRecovery(recoveryId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.recoveries(variables.loanId) });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.detail(variables.loanId) });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.fullDetail(variables.loanId) });
      queryClient.invalidateQueries({ queryKey: loanAdvanceKeys.lists() });
      toast.success('TDS recovery deleted successfully');
    },
    onError: (error) => {
      toast.error(handleQueryError(error));
    },
  });
};
