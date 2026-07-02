import { BaseApiService } from './base.service';
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
  BankContactResponse,
  BankContactListRow,
  CreateBankContactDto,
  UpdateBankContactDto,
  // Due EMI Types
  DueEmiResponse,
  DueEmiListRow,
  CreateDueEmiDto,
  UpdateDueEmiDto,
  // TDS Recovery Types
  TdsRecoveryResponse,
  TdsRecoveryListRow,
  CreateTdsRecoveryDto,
  UpdateTdsRecoveryDto,
} from '@/modules/accounts/loan-advances/helpers/loanAdvance.types';
import type { PaginatedResult } from '@/types/api.types';

// ===================== LOAN ADVANCES SERVICE =====================

class LoanAdvanceApiService extends BaseApiService {
  constructor() {
    super('/loan-advances');
  }

  // ==================== LOAN ADVANCES ====================

  async getAll(params?: LoanAdvanceListParams): Promise<PaginatedResult<LoanAdvanceListRow>> {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.sortBy) search.set('sortBy', params.sortBy);
    if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
    if (params?.search) search.set('search', params.search);
    if (params?.loanPartyName) search.set('loanPartyName', params.loanPartyName);
    if (params?.typeOfLoan) search.set('typeOfLoan', params.typeOfLoan);
    if (params?.loanCloseStatus) search.set('loanCloseStatus', params.loanCloseStatus);

    const queryString = search.toString();
    return this.get<PaginatedResult<LoanAdvanceListRow>>(queryString ? `?${queryString}` : '');
  }

  async getById(id: number): Promise<LoanAdvanceResponse> {
    return this.get<LoanAdvanceResponse>(`/${id}`);
  }

  async getFullDetails(id: number): Promise<LoanAdvanceFullDetails> {
    return this.get<LoanAdvanceFullDetails>(`/${id}/full`);
  }

  async create(data: CreateLoanAdvanceDto): Promise<LoanAdvanceResponse> {
    return this.post<LoanAdvanceResponse>('', data);
  }

  async update(id: number, data: Omit<UpdateLoanAdvanceDto, 'id'>): Promise<LoanAdvanceResponse> {
    return this.patch<LoanAdvanceResponse>(`/${id}`, data);
  }

  async closeLoan(id: number, data: LoanClosureDto): Promise<LoanAdvanceResponse> {
    return this.post<LoanAdvanceResponse>(`/${id}/close`, data);
  }

  async remove(id: number): Promise<void> {
    await this.delete<void>(`/${id}`);
  }

  // ==================== BANK CONTACTS ====================

  async getContacts(loanId: number): Promise<BankContactListRow[]> {
    return this.get<BankContactListRow[]>(`/${loanId}/contacts`);
  }

  async createContact(loanId: number, data: Omit<CreateBankContactDto, 'loanId'>): Promise<BankContactResponse> {
    return this.post<BankContactResponse>(`/${loanId}/contacts`, data);
  }

  async updateContact(contactId: number, data: Omit<UpdateBankContactDto, 'id'>): Promise<BankContactResponse> {
    return this.patch<BankContactResponse>(`/contacts/${contactId}`, data);
  }

  async removeContact(contactId: number): Promise<void> {
    await this.delete<void>(`/contacts/${contactId}`);
  }

  // ==================== DUE EMIS ====================

  async getEmis(loanId: number): Promise<DueEmiListRow[]> {
    return this.get<DueEmiListRow[]>(`/${loanId}/emis`);
  }

  async createEmi(loanId: number, data: Omit<CreateDueEmiDto, 'loanId'>): Promise<DueEmiResponse> {
    return this.post<DueEmiResponse>(`/${loanId}/emis`, data);
  }

  async updateEmi(emiId: number, data: Omit<UpdateDueEmiDto, 'id'>): Promise<DueEmiResponse> {
    return this.patch<DueEmiResponse>(`/emis/${emiId}`, data);
  }

  async removeEmi(emiId: number): Promise<void> {
    await this.delete<void>(`/emis/${emiId}`);
  }

  // ==================== TDS RECOVERIES ====================

  async getRecoveries(loanId: number): Promise<TdsRecoveryListRow[]> {
    return this.get<TdsRecoveryListRow[]>(`/${loanId}/tds-recoveries`);
  }

  async createRecovery(loanId: number, data: Omit<CreateTdsRecoveryDto, 'loanId'>): Promise<TdsRecoveryResponse> {
    return this.post<TdsRecoveryResponse>(`/${loanId}/tds-recoveries`, data);
  }

  async updateRecovery(recoveryId: number, data: Omit<UpdateTdsRecoveryDto, 'id'>): Promise<TdsRecoveryResponse> {
    return this.patch<TdsRecoveryResponse>(`/tds-recoveries/${recoveryId}`, data);
  }

  async removeRecovery(recoveryId: number): Promise<void> {
    await this.delete<void>(`/tds-recoveries/${recoveryId}`);
  }
}

export const loanAdvanceService = new LoanAdvanceApiService();
