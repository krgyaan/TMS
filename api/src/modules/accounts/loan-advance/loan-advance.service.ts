import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, desc, asc, sql, and, or, ilike, SQL, lt } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { loanAdvances, loanBankContacts, loanDueEmis, loanTdsRecoveries } from '@db/schemas/accounts/loan-advance.schema';
import { CreateLoanAdvanceDto, UpdateLoanAdvanceDto, LoanAdvanceQuery, LoanAdvanceResponse, LoanClosureDto, CreateLoanBankContactDto, UpdateLoanBankContactDto, LoanBankContactResponse, CreateDueEmiDto, UpdateDueEmiDto, DueEmiResponse, CreateTdsRecoveryDto, UpdateTdsRecoveryDto, TdsRecoveryResponse,LoanFullDetailsResponse } from './dto/loan-advance.dto';

@Injectable()
export class LoanAdvanceService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    private shouldShowNocUpload(
        loanCloseStatus: string,
        lastEmiDate: string | Date | null
    ): boolean {
        if (loanCloseStatus === 'Closed') return false;
        if (!lastEmiDate) return false;
        const closureDate = new Date(lastEmiDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return closureDate <= today;
    }

    private isDue(emiPaymentDate: string | Date | null): boolean {
        if (!emiPaymentDate) return false;
        const emiDate = new Date(emiPaymentDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return emiDate < today;
    }

  // ===================== LOAN ADVANCES =====================
  private mapLoanToResponse(row: any): LoanAdvanceResponse {
    return {
      id: row.id,
      loanPartyName: row.loanPartyName,
      bankName: row.bankName,
      loanAccNo: row.loanAccNo,
      typeOfLoan: row.typeOfLoan,
      loanAmount: row.loanAmount,
      sanctionLetterDate: row.sanctionLetterDate ?? '',
      emiPaymentDate: row.emiPaymentDate ?? '',
      lastEmiDate: row.lastEmiDate,
      sanctionLetter: row.sanctionLetter,
      bankLoanSchedule: row.bankLoanSchedule,
      loanSchedule: row.loanSchedule,
      chargeMcaWebsite: row.chargeMcaWebsite,
      tdsToBeDeductedOnInterest: row.tdsToBeDeductedOnInterest,
      loanCloseStatus: row.loanCloseStatus,
      closureCreatedMca: row.closureCreatedMca,
      bankNocDocument: row.bankNocDocument,
      principleOutstanding: row.principleOutstanding,
      totalInterestPaid: row.totalInterestPaid,
      totalPenalChargesPaid: row.totalPenalChargesPaid,
      totalTdsToRecover: row.totalTdsToRecover,
      noOfEmisPaid: row.noOfEmisPaid ?? 0,
      isDue: this.isDue(row.emiPaymentDate),
      showNocUpload: this.shouldShowNocUpload(row.loanCloseStatus, row.lastEmiDate),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findAllLoans(filters?: LoanAdvanceQuery) {
    const page = filters?.page ?? 1;
    const limit = Math.min(Math.max(filters?.limit ?? 10, 1), 100);
    const offset = (page - 1) * limit;
    const sortOrder = filters?.sortOrder ?? 'desc';
    const sortBy = filters?.sortBy ?? 'createdAt';
    const search = filters?.search?.trim();

    // Build conditions
    const conditions: (SQL<unknown> | undefined)[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(loanAdvances.loanPartyName, `%${search}%`),
          ilike(loanAdvances.bankName, `%${search}%`),
          ilike(loanAdvances.loanAccNo, `%${search}%`)
        )
      );
    }

    if (filters?.loanPartyName) {
      conditions.push(eq(loanAdvances.loanPartyName, filters.loanPartyName));
    }

    if (filters?.typeOfLoan) {
      conditions.push(eq(loanAdvances.typeOfLoan, filters.typeOfLoan));
    }

    if (filters?.loanCloseStatus) {
      conditions.push(eq(loanAdvances.loanCloseStatus, filters.loanCloseStatus));
    }

    const whereClause = conditions.length > 0 ? and(...conditions.filter(Boolean)) : undefined;

    // Sort column mapping
    const sortColumnMap: Record<string, any> = {
      loanPartyName: loanAdvances.loanPartyName,
      bankName: loanAdvances.bankName,
      loanAmount: loanAdvances.loanAmount,
      emiPaymentDate: loanAdvances.emiPaymentDate,
      createdAt: loanAdvances.createdAt,
    };

    const orderColumn = sortColumnMap[sortBy] ?? loanAdvances.createdAt;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(loanAdvances)
        .where(whereClause)
        .then(([r]) => Number(r?.count ?? 0)),
      this.db
        .select()
        .from(loanAdvances)
        .where(whereClause)
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
    ]);

    const total = countResult;
    const data = rows.map((r) => this.mapLoanToResponse(r));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findLoanById(id: number): Promise<LoanAdvanceResponse> {
    const [row] = await this.db
      .select()
      .from(loanAdvances)
      .where(eq(loanAdvances.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Loan with ID ${id} not found`);
    }

    return this.mapLoanToResponse(row);
  }

  async findLoanFullDetails(id: number): Promise<LoanFullDetailsResponse> {
    const loan = await this.findLoanById(id);

    const [contacts, emis, recoveries] = await Promise.all([
      this.findContactsByLoanId(id),
      this.findEmisByLoanId(id),
      this.findRecoveriesByLoanId(id),
    ]);

    return {
      ...loan,
      bankContacts: contacts,
      loanDueEmis: emis,
      loanTdsRecoveries: recoveries,
    };
  }

  async createLoan(data: CreateLoanAdvanceDto): Promise<LoanAdvanceResponse> {
    const now = new Date();

    const [inserted] = await this.db
      .insert(loanAdvances)
      .values({
        loanPartyName: data.loanPartyName,
        bankName: data.bankName,
        loanAccNo: data.loanAccNo,
        typeOfLoan: data.typeOfLoan,
        loanAmount: data.loanAmount,
        sanctionLetterDate: data.sanctionLetterDate,
        emiPaymentDate: data.emiPaymentDate,
        lastEmiDate: data.lastEmiDate ?? null,
        sanctionLetter: data.sanctionLetter ?? null,
        bankLoanSchedule: data.bankLoanSchedule ?? null,
        loanSchedule: data.loanSchedule ?? null,
        chargeMcaWebsite: data.chargeMcaWebsite ?? 'No',
        tdsToBeDeductedOnInterest: data.tdsToBeDeductedOnInterest ?? 'No',
        loanCloseStatus: 'Active',
        principleOutstanding: data.principleOutstanding ?? data.loanAmount,
        totalInterestPaid: '0',
        totalPenalChargesPaid: '0',
        totalTdsToRecover: '0',
        noOfEmisPaid: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: loanAdvances.id });

    return this.findLoanById(inserted.id);
  }

  async updateLoan(id: number, data: UpdateLoanAdvanceDto): Promise<LoanAdvanceResponse> {
    // Check if loan exists
    await this.findLoanById(id);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.loanPartyName !== undefined) updateData.loanPartyName = data.loanPartyName;
    if (data.bankName !== undefined) updateData.bankName = data.bankName;
    if (data.loanAccNo !== undefined) updateData.loanAccNo = data.loanAccNo;
    if (data.typeOfLoan !== undefined) updateData.typeOfLoan = data.typeOfLoan;
    if (data.loanAmount !== undefined) updateData.loanAmount = data.loanAmount;
    if (data.sanctionLetterDate !== undefined) updateData.sanctionLetterDate = data.sanctionLetterDate;
    if (data.emiPaymentDate !== undefined) updateData.emiPaymentDate = data.emiPaymentDate;
    if (data.lastEmiDate !== undefined) updateData.lastEmiDate = data.lastEmiDate;
    if (data.sanctionLetter !== undefined) updateData.sanctionLetter = data.sanctionLetter;
    if (data.bankLoanSchedule !== undefined) updateData.bankLoanSchedule = data.bankLoanSchedule;
    if (data.loanSchedule !== undefined) updateData.loanSchedule = data.loanSchedule;
    if (data.chargeMcaWebsite !== undefined) updateData.chargeMcaWebsite = data.chargeMcaWebsite;
    if (data.tdsToBeDeductedOnInterest !== undefined) {
      updateData.tdsToBeDeductedOnInterest = data.tdsToBeDeductedOnInterest;
    }

    await this.db
      .update(loanAdvances)
      .set(updateData as any)
      .where(eq(loanAdvances.id, id));

    return this.findLoanById(id);
  }

  async closeLoan(id: number, data: LoanClosureDto): Promise<LoanAdvanceResponse> {
    const loan = await this.findLoanById(id);

    if (loan.loanCloseStatus === 'Closed') {
      throw new BadRequestException('Loan is already closed');
    }

    // Check if MCA closure document is required
    if (loan.chargeMcaWebsite === 'Yes' && !data.closureCreatedMca) {
      throw new BadRequestException(
        'Closure MCA document is required since charge was created on MCA website'
      );
    }

    await this.db
      .update(loanAdvances)
      .set({
        loanCloseStatus: 'Closed',
        bankNocDocument: data.bankNocDocument,
        closureCreatedMca: data.closureCreatedMca ?? null,
        updatedAt: new Date(),
      })
      .where(eq(loanAdvances.id, id));

    return this.findLoanById(id);
  }

  async deleteLoan(id: number): Promise<void> {
    const [row] = await this.db
      .delete(loanAdvances)
      .where(eq(loanAdvances.id, id))
      .returning({ id: loanAdvances.id });

    if (!row) {
      throw new NotFoundException(`Loan with ID ${id} not found`);
    }
  }

  // ===================== COMPUTED FIELDS UPDATE =====================

  private async recalculateLoanAggregates(loanId: number): Promise<void> {
    // Get loan amount
    const [loan] = await this.db
      .select({ loanAmount: loanAdvances.loanAmount })
      .from(loanAdvances)
      .where(eq(loanAdvances.id, loanId));

    if (!loan) return;

    // Calculate EMI aggregates
    const [emiAgg] = await this.db
      .select({
        totalPrinciple: sql<string>`COALESCE(SUM(principle_paid), 0)`,
        totalInterest: sql<string>`COALESCE(SUM(interest_paid), 0)`,
        totalPenal: sql<string>`COALESCE(SUM(penal_charges_paid), 0)`,
        totalTds: sql<string>`COALESCE(SUM(tds_to_be_recovered), 0)`,
        count: sql<number>`COUNT(*)::int`,
        lastEmiDate: sql<string>`MAX(emi_date)`,
      })
      .from(loanDueEmis)
      .where(eq(loanDueEmis.loanId, loanId));

    // Calculate TDS recovered
    const [tdsAgg] = await this.db
      .select({
        totalRecovered: sql<string>`COALESCE(SUM(tds_amount), 0)`,
      })
      .from(loanTdsRecoveries)
      .where(eq(loanTdsRecoveries.loanId, loanId));

    const loanAmount = parseFloat(loan.loanAmount?.toString() ?? '0');
    const totalPrinciple = parseFloat(emiAgg?.totalPrinciple ?? '0');
    const totalTds = parseFloat(emiAgg?.totalTds ?? '0');
    const totalRecovered = parseFloat(tdsAgg?.totalRecovered ?? '0');

    // Calculate next EMI date (add 1 month to last EMI date)
    let nextEmiDate: string | null = null;
    if (emiAgg?.lastEmiDate) {
      const lastDate = new Date(emiAgg.lastEmiDate);
      lastDate.setMonth(lastDate.getMonth() + 1);
      nextEmiDate = lastDate.toISOString().split('T')[0];
    }

    await this.db
      .update(loanAdvances)
      .set({
        principleOutstanding: (loanAmount - totalPrinciple).toFixed(2),
        totalInterestPaid: emiAgg?.totalInterest ?? '0',
        totalPenalChargesPaid: emiAgg?.totalPenal ?? '0',
        totalTdsToRecover: (totalTds - totalRecovered).toFixed(2),
        noOfEmisPaid: emiAgg?.count ?? 0,
        lastEmiDate: emiAgg?.lastEmiDate ?? null,
        emiPaymentDate: nextEmiDate,
        updatedAt: new Date(),
      })
      .where(eq(loanAdvances.id, loanId));
  }

  // ===================== BANK CONTACTS =====================

  private mapContactToResponse(row: any): LoanBankContactResponse {
    return {
      id: row.id,
      loanId: row.loanId,
      orgName: row.orgName,
      personName: row.personName,
      designation: row.designation,
      phone: row.phone,
      email: row.email,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findContactsByLoanId(loanId: number): Promise<LoanBankContactResponse[]> {
    const rows = await this.db
      .select()
      .from(loanBankContacts)
      .where(eq(loanBankContacts.loanId, loanId))
      .orderBy(desc(loanBankContacts.createdAt));

    return rows.map((r) => this.mapContactToResponse(r));
  }

  async createContact(data: CreateLoanBankContactDto): Promise<LoanBankContactResponse> {
    // Verify loan exists
    await this.findLoanById(data.loanId);

    const now = new Date();
    const [inserted] = await this.db
      .insert(loanBankContacts)
      .values({
        loanId: data.loanId,
        orgName: data.orgName,
        personName: data.personName,
        designation: data.designation ?? null,
        phone: data.phone,
        email: data.email ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapContactToResponse(inserted);
  }

  async updateContact(id: number, data: UpdateLoanBankContactDto): Promise<LoanBankContactResponse> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.orgName !== undefined) updateData.orgName = data.orgName;
    if (data.personName !== undefined) updateData.personName = data.personName;
    if (data.designation !== undefined) updateData.designation = data.designation;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;

    const [updated] = await this.db
      .update(loanBankContacts)
      .set(updateData as any)
      .where(eq(loanBankContacts.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    return this.mapContactToResponse(updated);
  }

  async deleteContact(id: number): Promise<void> {
    const [row] = await this.db
      .delete(loanBankContacts)
      .where(eq(loanBankContacts.id, id))
      .returning({ id: loanBankContacts.id });

    if (!row) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
  }

  // ===================== DUE EMIS =====================

  private mapEmiToResponse(row: any): DueEmiResponse {
    return {
      id: row.id,
      loanId: row.loanId,
      emiDate: row.emiDate ?? '',
      principlePaid: row.principlePaid,
      interestPaid: row.interestPaid,
      tdsToBeRecovered: row.tdsToBeRecovered,
      penalChargesPaid: row.penalChargesPaid,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findEmisByLoanId(loanId: number): Promise<DueEmiResponse[]> {
    const rows = await this.db
      .select()
      .from(loanDueEmis)
      .where(eq(loanDueEmis.loanId, loanId))
      .orderBy(desc(loanDueEmis.emiDate));

    return rows.map((r) => this.mapEmiToResponse(r));
  }

  async createEmi(data: CreateDueEmiDto): Promise<DueEmiResponse> {
    // Verify loan exists
    await this.findLoanById(data.loanId);

    const now = new Date();
    const [inserted] = await this.db
      .insert(loanDueEmis)
      .values({
        loanId: data.loanId,
        emiDate: data.emiDate,
        principlePaid: data.principlePaid,
        interestPaid: data.interestPaid,
        tdsToBeRecovered: data.tdsToBeRecovered ?? '0',
        penalChargesPaid: data.penalChargesPaid ?? '0',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Recalculate loan aggregates
    await this.recalculateLoanAggregates(data.loanId);

    return this.mapEmiToResponse(inserted);
  }

  async updateEmi(id: number, data: UpdateDueEmiDto): Promise<DueEmiResponse> {
    // Get existing EMI to find loanId
    const [existing] = await this.db
      .select({ loanId: loanDueEmis.loanId })
      .from(loanDueEmis)
      .where(eq(loanDueEmis.id, id));

    if (!existing) {
      throw new NotFoundException(`EMI with ID ${id} not found`);
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.emiDate !== undefined) updateData.emiDate = data.emiDate;
    if (data.principlePaid !== undefined) updateData.principlePaid = data.principlePaid;
    if (data.interestPaid !== undefined) updateData.interestPaid = data.interestPaid;
    if (data.tdsToBeRecovered !== undefined) updateData.tdsToBeRecovered = data.tdsToBeRecovered;
    if (data.penalChargesPaid !== undefined) updateData.penalChargesPaid = data.penalChargesPaid;

    const [updated] = await this.db
      .update(loanDueEmis)
      .set(updateData as any)
      .where(eq(loanDueEmis.id, id))
      .returning();

    // Recalculate loan aggregates
    await this.recalculateLoanAggregates(existing.loanId);

    return this.mapEmiToResponse(updated);
  }

  async deleteEmi(id: number): Promise<void> {
    // Get existing EMI to find loanId
    const [existing] = await this.db
      .select({ loanId: loanDueEmis.loanId })
      .from(loanDueEmis)
      .where(eq(loanDueEmis.id, id));

    if (!existing) {
      throw new NotFoundException(`EMI with ID ${id} not found`);
    }

    await this.db.delete(loanDueEmis).where(eq(loanDueEmis.id, id));

    // Recalculate loan aggregates
    await this.recalculateLoanAggregates(existing.loanId);
  }

  // ===================== TDS RECOVERIES =====================

  private mapRecoveryToResponse(row: any): TdsRecoveryResponse {
    return {
      id: row.id,
      loanId: row.loanId,
      tdsAmount: row.tdsAmount,
      tdsDocument: row.tdsDocument,
      tdsDate: row.tdsDate ?? '',
      tdsRecoveryBankDetails: row.tdsRecoveryBankDetails,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findRecoveriesByLoanId(loanId: number): Promise<TdsRecoveryResponse[]> {
    const rows = await this.db
      .select()
      .from(loanTdsRecoveries)
      .where(eq(loanTdsRecoveries.loanId, loanId))
      .orderBy(desc(loanTdsRecoveries.tdsDate));

    return rows.map((r) => this.mapRecoveryToResponse(r));
  }

  async createRecovery(data: CreateTdsRecoveryDto): Promise<TdsRecoveryResponse> {
    // Verify loan exists
    await this.findLoanById(data.loanId);

    const now = new Date();
    const [inserted] = await this.db
      .insert(loanTdsRecoveries)
      .values({
        loanId: data.loanId,
        tdsAmount: data.tdsAmount,
        tdsDocument: data.tdsDocument ?? null,
        tdsDate: data.tdsDate,
        tdsRecoveryBankDetails: data.tdsRecoveryBankDetails ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Recalculate loan aggregates
    await this.recalculateLoanAggregates(data.loanId);

    return this.mapRecoveryToResponse(inserted);
  }

  async updateRecovery(id: number, data: UpdateTdsRecoveryDto): Promise<TdsRecoveryResponse> {
    // Get existing recovery to find loanId
    const [existing] = await this.db
      .select({ loanId: loanTdsRecoveries.loanId })
      .from(loanTdsRecoveries)
      .where(eq(loanTdsRecoveries.id, id));

    if (!existing) {
      throw new NotFoundException(`TDS Recovery with ID ${id} not found`);
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.tdsAmount !== undefined) updateData.tdsAmount = data.tdsAmount;
    if (data.tdsDocument !== undefined) updateData.tdsDocument = data.tdsDocument;
    if (data.tdsDate !== undefined) updateData.tdsDate = data.tdsDate;
    if (data.tdsRecoveryBankDetails !== undefined) {
      updateData.tdsRecoveryBankDetails = data.tdsRecoveryBankDetails;
    }

    const [updated] = await this.db
      .update(loanTdsRecoveries)
      .set(updateData as any)
      .where(eq(loanTdsRecoveries.id, id))
      .returning();

    // Recalculate loan aggregates
    await this.recalculateLoanAggregates(existing.loanId);

    return this.mapRecoveryToResponse(updated);
  }

  async deleteRecovery(id: number): Promise<void> {
    // Get existing recovery to find loanId
    const [existing] = await this.db
      .select({ loanId: loanTdsRecoveries.loanId })
      .from(loanTdsRecoveries)
      .where(eq(loanTdsRecoveries.id, id));

    if (!existing) {
      throw new NotFoundException(`TDS Recovery with ID ${id} not found`);
    }

    await this.db.delete(loanTdsRecoveries).where(eq(loanTdsRecoveries.id, id));

    // Recalculate loan aggregates
    await this.recalculateLoanAggregates(existing.loanId);
  }

  // ===================== TDS RECOVERY FOLLOWUP COMBINED =====================

  async getTdsRecoveryFollowup(loanId: number) {
    const loan = await this.findLoanById(loanId);
    const contacts = await this.findContactsByLoanId(loanId);
    const recoveries = await this.findRecoveriesByLoanId(loanId);

    // Calculate remaining TDS
    const totalToRecover = parseFloat(loan.totalTdsToRecover ?? '0');
    const totalRecovered = recoveries.reduce(
      (sum, r) => sum + parseFloat(r.tdsAmount),
      0
    );

    return {
      loanId,
      bankContacts: contacts,
      totalTdsToRecover: loan.totalTdsToRecover,
      recoveries,
      remainingTdsToRecover: (totalToRecover - totalRecovered).toFixed(2),
    };
  }
}
