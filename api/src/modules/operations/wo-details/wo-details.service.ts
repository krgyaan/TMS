import { Inject, Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { eq, desc, asc, sql, and, or, isNull, ne, ilike } from 'drizzle-orm';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { woDetails, woBasicDetails, woContacts, woBillingBoq, woBuybackBoq, woBillingAddresses, woShippingAddresses, woAmendments, woQueries, woDocuments, woAcceptance } from '@db/schemas/operations';
import type { CreateWoDetailDto, UpdateWoDetailDto, WoDetailsListResponseDto, WoDetailsQueryDto, TenderDocumentsChecklist, WoDetailsStatus, WizardValidationResult, WizardInitResponse, ImportContactsResponse } from './dto/wo-details.dto';
import type { SavePage1Dto, SubmitPage1Dto, Page1ContactDto } from './dto/page1-handover.dto';
import type { SavePage2Dto, SubmitPage2Dto } from './dto/page2-compliance.dto';
import type { SavePage3Dto, SubmitPage3Dto } from './dto/page3-swot.dto';
import type { SavePage4Dto, SubmitPage4Dto } from './dto/page4-billing.dto';
import type { SavePage5Dto, SubmitPage5Dto } from './dto/page5-execution.dto';
import type { SavePage6Dto, SubmitPage6Dto } from './dto/page6-profitability.dto';
import type { SavePage7Dto, SubmitPage7Dto } from './dto/page7-acceptance.dto';

export type WoDetailRow = typeof woDetails.$inferSelect;

const TENDER_CHECKLIST_ITEMS = [
  'completeTenderDocuments',
  'tenderInfo',
  'emdInformation',
  'physicalDocumentsSubmission',
  'rfqAndQuotation',
  'documentChecklist',
  'costingSheet',
  'result',
] as const;

const REQUIRED_PAGES = [1, 2, 4, 7] as const;
const SKIPPABLE_PAGES = [3, 5, 6] as const;
const TOTAL_PAGES = 7;

// Type union for page data
type PageData =
  | SavePage1Dto
  | SubmitPage1Dto
  | SavePage2Dto
  | SubmitPage2Dto
  | SavePage3Dto
  | SubmitPage3Dto
  | SavePage4Dto
  | SubmitPage4Dto
  | SavePage5Dto
  | SubmitPage5Dto
  | SavePage6Dto
  | SubmitPage6Dto
  | SavePage7Dto
  | SubmitPage7Dto;

@Injectable()
export class WoDetailsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  private mapRowToResponse(row: WoDetailRow) {
    return {
      id: row.id,
      woBasicDetailId: row.woBasicDetailId,

      // Page 1
      tenderDocumentsChecklist: row.tenderDocumentsChecklist,
      checklistCompletedAt: row.checklistCompletedAt?.toISOString() ?? null,
      checklistIncompleteNotifiedAt:
        row.checklistIncompleteNotifiedAt?.toISOString() ?? null,

      // Page 2
      ldApplicable: row.ldApplicable ?? false,
      maxLd: row.maxLd,
      ldStartDate: row.ldStartDate,
      maxLdDate: row.maxLdDate,
      isPbgApplicable: row.isPbgApplicable ?? false,
      filledBgFormat: row.filledBgFormat,
      pbgBgId: row.pbgBgId,
      isContractAgreement: row.isContractAgreement ?? false,
      contractAgreementFormat: row.contractAgreementFormat,
      detailedPoApplicable: row.detailedPoApplicable ?? false,
      detailedPoFollowupId: row.detailedPoFollowupId,

      // Page 3
      swotStrengths: row.swotStrengths,
      swotWeaknesses: row.swotWeaknesses,
      swotOpportunities: row.swotOpportunities,
      swotThreats: row.swotThreats,
      swotCompletedAt: row.swotCompletedAt?.toISOString() ?? null,

      // Page 5
      siteVisitNeeded: row.siteVisitNeeded ?? false,
      siteVisitPerson: row.siteVisitPerson,
      documentsFromTendering: row.documentsFromTendering,
      documentsNeeded: row.documentsNeeded,
      documentsInHouse: row.documentsInHouse,

      // Page 6
      costingSheetLink: row.costingSheetLink,
      hasDiscrepancies: row.hasDiscrepancies ?? false,
      discrepancyComments: row.discrepancyComments,
      discrepancyNotifiedAt: row.discrepancyNotifiedAt?.toISOString() ?? null,
      budgetPreGst: row.budgetPreGst,
      budgetSupply: row.budgetSupply,
      budgetService: row.budgetService,
      budgetFreight: row.budgetFreight,
      budgetAdmin: row.budgetAdmin,
      budgetBuybackSale: row.budgetBuybackSale,

      // Page 7
      oeWoAmendmentNeeded: row.oeWoAmendmentNeeded,
      oeAmendmentSubmittedAt: row.oeAmendmentSubmittedAt?.toISOString() ?? null,
      oeSignaturePrepared: row.oeSignaturePrepared ?? false,
      courierRequestPrepared: row.courierRequestPrepared ?? false,
      courierRequestPreparedAt:
        row.courierRequestPreparedAt?.toISOString() ?? null,

      // Wizard Progress
      currentPage: row.currentPage ?? 1,
      completedPages: (row.completedPages as number[]) ?? [],
      skippedPages: (row.skippedPages as number[]) ?? [],
      startedAt: row.startedAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,

      // Status
      status: row.status ?? 'draft',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
    };
  }

  mapRowToResponseList(row: any): WoDetailsListResponseDto {
    return {
      id: row.id,
      woBasicDetailId: row.woBasicDetailId,
      projectName: row.projectName ?? '',
      woNumber: row.woNumber ?? '',
      woDate: row.woDate ?? '',
      woValuePreGst: row.woValuePreGst ?? '0',
      woValueGstAmt: row.woValueGstAmt ?? '0',
      ldApplicable: !!row.ldApplicable,
      isContractAgreement: !!row.isContractAgreement,
      oeWoAmendmentNeeded: !!row.oeWoAmendmentNeeded,
      status: (row.status as WoDetailsStatus) || 'draft',
      woAcceptanceId: row.woAcceptanceId ?? null,
      woAcceptanceStatus: row.woAcceptanceStatus ?? null,
    };
  }

  private getVisibilityConditions(user: ValidatedUser, teamId?: number) {
    const conditions: any[] = [];

    if (user.roleId === 1 || user.roleId === 2) {
      if (teamId !== undefined && teamId !== null) {
        conditions.push(eq(woBasicDetails.team, teamId));
      }
    } else if (user.roleId === 3 || user.roleId === 4 || user.roleId === 6) {
      if (user.teamId) {
        conditions.push(eq(woBasicDetails.team, user.teamId));
      }
    } else {
      conditions.push(
        or(
          eq(woBasicDetails.createdBy, user.sub),
          eq(woBasicDetails.oeFirst, user.sub),
          eq(woBasicDetails.oeSiteVisit, user.sub),
          eq(woBasicDetails.oeDocsPrep, user.sub),
          eq(woDetails.createdBy, user.sub),
        ),
      );
    }

    return conditions;
  }

  // CRUD OPERATIONS
  async findAll(filters?: WoDetailsQueryDto & { user?: ValidatedUser }) {
    const page = filters?.page ?? 1;
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
    const offset = (page - 1) * limit;
    const sortOrder = filters?.sortOrder ?? 'desc';
    const sortBy = filters?.sortBy ?? 'createdAt';
    const search = filters?.search?.trim();

    const orderFn = sortOrder === 'desc' ? desc : asc;
    const conditions: any[] = [
        eq(woDetails.status, 'completed')
    ];

    if (filters?.user) {
      conditions.push(
        ...this.getVisibilityConditions(filters.user, filters.teamId),
      );
    }

    if (filters?.woBasicDetailId) {
      conditions.push(eq(woDetails.woBasicDetailId, filters.woBasicDetailId));
    }
    if (filters?.status) {
      conditions.push(eq(woDetails.status, filters.status));
    }
    if (filters?.ldApplicable !== undefined) {
      conditions.push(eq(woDetails.ldApplicable, filters.ldApplicable));
    }
    if (filters?.isContractAgreement !== undefined) {
      conditions.push(
        eq(woDetails.isContractAgreement, filters.isContractAgreement),
      );
    }

    if (filters?.woAmendmentNeeded === true) {
      conditions.push(eq(woDetails.oeWoAmendmentNeeded, true));
    } else if (filters?.woAcceptance === true) {
      conditions.push(
        and(
          eq(woAcceptance.status, 'completed'),
          eq(woAcceptance.decision, 'accepted'),
        ),
      );
    } else if (
      filters?.woAcceptance === false &&
      filters?.woAmendmentNeeded === false
    ) {
      conditions.push(
        and(
          or(
            isNull(woAcceptance.id),
            ne(woAcceptance.status, 'completed'),
            ne(woAcceptance.decision, 'accepted'),
          ),
          and(
            eq(woDetails.oeWoAmendmentNeeded, false),
            or(
              isNull(woAcceptance.id),
              and(
                ne(woAcceptance.status, 'awaiting_amendment'),
                ne(woAcceptance.decision, 'amendment_needed'),
              ),
            ),
          ),
        ),
      );
    }

    if (search) {
      const searchStr = `%${search}%`;
      conditions.push(
        or(
          ilike(woBasicDetails.projectName, searchStr),
          ilike(woBasicDetails.woNumber, searchStr),
          ilike(woBasicDetails.projectCode, searchStr),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let orderByClause: any;
    switch (sortBy) {
      case 'woNumber':
        orderByClause = orderFn(woBasicDetails.woNumber);
        break;
      case 'woDate':
        orderByClause = orderFn(woBasicDetails.woDate);
        break;
      case 'projectName':
        orderByClause = orderFn(woBasicDetails.projectName);
        break;
      case 'woValuePreGst':
        orderByClause = orderFn(woBasicDetails.woValuePreGst);
        break;
      case 'woValueGstAmt':
        orderByClause = orderFn(woBasicDetails.woValueGstAmt);
        break;
      case 'status':
        orderByClause = orderFn(woDetails.status);
        break;
      case 'updatedAt':
        orderByClause = orderFn(woDetails.updatedAt);
        break;
      case 'currentPage':
        orderByClause = orderFn(woDetails.currentPage);
        break;
      default:
        orderByClause = orderFn(woDetails.createdAt);
    }

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(distinct ${woDetails.id})::int` })
        .from(woDetails)
        .leftJoin(
          woBasicDetails,
          eq(woDetails.woBasicDetailId, woBasicDetails.id),
        )
        .leftJoin(woAcceptance, eq(woDetails.id, woAcceptance.woDetailId))
        .where(whereClause)
        .then(([r]) => Number(r?.count ?? 0)),
      this.db
        .select({
          id: woDetails.id,
          woBasicDetailId: woDetails.woBasicDetailId,
          projectName: woBasicDetails.projectName,
          woNumber: woBasicDetails.woNumber,
          woDate: woBasicDetails.woDate,
          woValuePreGst: woBasicDetails.woValuePreGst,
          woValueGstAmt: woBasicDetails.woValueGstAmt,
          ldApplicable: woDetails.ldApplicable,
          isContractAgreement: woDetails.isContractAgreement,
          oeWoAmendmentNeeded: woDetails.oeWoAmendmentNeeded,
          status: woDetails.status,
          woAcceptanceId: woAcceptance?.id,
          woAcceptanceStatus: woAcceptance?.status,
        })
        .from(woDetails)
        .leftJoin(
          woBasicDetails,
          eq(woDetails.woBasicDetailId, woBasicDetails.id),
        )
        .leftJoin(woAcceptance, eq(woDetails.id, woAcceptance.woDetailId))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset),
    ]);

    return {
      data: rows.map((r) => this.mapRowToResponseList(r)),
      meta: {
        total: countResult,
        page,
        limit,
        totalPages: Math.ceil(countResult / limit) || 1,
      },
    };
  }

  async findById(id: number) {
    const [row] = await this.db
      .select()
      .from(woDetails)
      .where(eq(woDetails.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`WO Detail with ID ${id} not found`);
    }

    return this.mapRowToResponse(row);
  }

  async findByIdWithRelations(id: number) {
    const [row] = await this.db
      .select()
      .from(woDetails)
      .where(eq(woDetails.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`WO Detail with ID ${id} not found`);
    }

    const [
      basicDetail,
      contacts,
      billingBoqItems,
      buybackBoqItems,
      billingAddrs,
      shippingAddrs,
      amendments,
      queries,
      documents,
      acceptance,
    ] = await Promise.all([
      this.db
        .select()
        .from(woBasicDetails)
        .where(eq(woBasicDetails.id, row.woBasicDetailId))
        .limit(1),
      this.db
        .select()
        .from(woContacts)
        .where(eq(woContacts.woBasicDetailId, row.woBasicDetailId)),
      this.db
        .select()
        .from(woBillingBoq)
        .where(eq(woBillingBoq.woDetailId, id))
        .orderBy(asc(woBillingBoq.sortOrder), asc(woBillingBoq.srNo)),
      this.db
        .select()
        .from(woBuybackBoq)
        .where(eq(woBuybackBoq.woDetailId, id))
        .orderBy(asc(woBuybackBoq.sortOrder), asc(woBuybackBoq.srNo)),
      this.db
        .select()
        .from(woBillingAddresses)
        .where(eq(woBillingAddresses.woDetailId, id)),
      this.db
        .select()
        .from(woShippingAddresses)
        .where(eq(woShippingAddresses.woDetailId, id)),
      this.db
        .select()
        .from(woAmendments)
        .where(eq(woAmendments.woDetailId, id))
        .orderBy(desc(woAmendments.createdAt)),
      this.db
        .select()
        .from(woQueries)
        .where(eq(woQueries.woDetailsId, id))
        .orderBy(desc(woQueries.queryRaisedAt)),
      this.db
        .select()
        .from(woDocuments)
        .where(eq(woDocuments.woDetailId, id))
        .orderBy(desc(woDocuments.uploadedAt)),
      this.db
        .select()
        .from(woAcceptance)
        .where(eq(woAcceptance.woDetailId, id))
        .limit(1),
    ]);

    return {
      ...this.mapRowToResponse(row),
      woBasicDetail: basicDetail[0] ?? null,
      contacts,
      billingBoq: billingBoqItems,
      buybackBoq: buybackBoqItems,
      billingAddresses: billingAddrs,
      shippingAddresses: shippingAddrs,
      amendments,
      queries,
      documents,
      acceptance: acceptance[0] ?? null,
    };
  }

  async findByWoBasicDetailId(woBasicDetailId: number) {
    const [row] = await this.db
      .select()
      .from(woDetails)
      .where(eq(woDetails.woBasicDetailId, woBasicDetailId))
      .limit(1);

    if (!row) {
      return null;
    }

    return this.mapRowToResponse(row);
  }

  async create(data: CreateWoDetailDto, userId?: number) {
    const existing = await this.db
      .select({ id: woDetails.id })
      .from(woDetails)
      .where(eq(woDetails.woBasicDetailId, data.woBasicDetailId))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException(
        `WO Detail already exists for Basic Detail ID ${data.woBasicDetailId}`,
      );
    }

    const [basicDetail] = await this.db
      .select({ id: woBasicDetails.id })
      .from(woBasicDetails)
      .where(eq(woBasicDetails.id, data.woBasicDetailId))
      .limit(1);

    if (!basicDetail) {
      throw new NotFoundException(
        `WO Basic Detail with ID ${data.woBasicDetailId} not found`,
      );
    }

    const now = new Date();

    const [row] = await this.db
      .insert(woDetails)
      .values({
        woBasicDetailId: data.woBasicDetailId,
        currentPage: 1,
        completedPages: [],
        skippedPages: [],
        status: 'draft',
        startedAt: now,
        createdAt: now,
        updatedAt: now,
        createdBy: userId ?? null,
      })
      .returning();

    await this.db
      .update(woBasicDetails)
      .set({ currentStage: 'wo_details', updatedAt: now })
      .where(eq(woBasicDetails.id, data.woBasicDetailId));

    return this.mapRowToResponse(row!);
  }

  async update(id: number, data: UpdateWoDetailDto, userId?: number) {
    await this.findById(id);

    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: userId ?? null,
    };

    // Map all fields from UpdateWoDetailDto
    if (data.tenderDocumentsChecklist !== undefined) {
      updateValues.tenderDocumentsChecklist = data.tenderDocumentsChecklist;
    }
    if (data.ldApplicable !== undefined)
      updateValues.ldApplicable = data.ldApplicable;
    if (data.maxLd !== undefined) updateValues.maxLd = data.maxLd;
    if (data.ldStartDate !== undefined)
      updateValues.ldStartDate = data.ldStartDate;
    if (data.maxLdDate !== undefined) updateValues.maxLdDate = data.maxLdDate;
    if (data.isPbgApplicable !== undefined)
      updateValues.isPbgApplicable = data.isPbgApplicable;
    if (data.filledBgFormat !== undefined)
      updateValues.filledBgFormat = data.filledBgFormat;
    if (data.pbgBgId !== undefined) updateValues.pbgBgId = data.pbgBgId;
    if (data.isContractAgreement !== undefined)
      updateValues.isContractAgreement = data.isContractAgreement;
    if (data.contractAgreementFormat !== undefined)
      updateValues.contractAgreementFormat = data.contractAgreementFormat;
    if (data.detailedPoApplicable !== undefined)
      updateValues.detailedPoApplicable = data.detailedPoApplicable;
    if (data.detailedPoFollowupId !== undefined)
      updateValues.detailedPoFollowupId = data.detailedPoFollowupId;
    if (data.swotStrengths !== undefined)
      updateValues.swotStrengths = data.swotStrengths;
    if (data.swotWeaknesses !== undefined)
      updateValues.swotWeaknesses = data.swotWeaknesses;
    if (data.swotOpportunities !== undefined)
      updateValues.swotOpportunities = data.swotOpportunities;
    if (data.swotThreats !== undefined)
      updateValues.swotThreats = data.swotThreats;
    if (data.siteVisitNeeded !== undefined)
      updateValues.siteVisitNeeded = data.siteVisitNeeded;
    if (data.siteVisitPerson !== undefined)
      updateValues.siteVisitPerson = data.siteVisitPerson;
    if (data.documentsFromTendering !== undefined)
      updateValues.documentsFromTendering = data.documentsFromTendering;
    if (data.documentsNeeded !== undefined)
      updateValues.documentsNeeded = data.documentsNeeded;
    if (data.documentsInHouse !== undefined)
      updateValues.documentsInHouse = data.documentsInHouse;
    if (data.costingSheetLink !== undefined)
      updateValues.costingSheetLink = data.costingSheetLink || null;
    if (data.hasDiscrepancies !== undefined)
      updateValues.hasDiscrepancies = data.hasDiscrepancies;
    if (data.discrepancyComments !== undefined)
      updateValues.discrepancyComments = data.discrepancyComments;
    if (data.budgetPreGst !== undefined)
      updateValues.budgetPreGst = data.budgetPreGst;
    if (data.budgetSupply !== undefined)
      updateValues.budgetSupply = data.budgetSupply;
    if (data.budgetService !== undefined)
      updateValues.budgetService = data.budgetService;
    if (data.budgetFreight !== undefined)
      updateValues.budgetFreight = data.budgetFreight;
    if (data.budgetAdmin !== undefined)
      updateValues.budgetAdmin = data.budgetAdmin;
    if (data.budgetBuybackSale !== undefined)
      updateValues.budgetBuybackSale = data.budgetBuybackSale;
    if (data.oeWoAmendmentNeeded !== undefined)
      updateValues.oeWoAmendmentNeeded = data.oeWoAmendmentNeeded;
    if (data.oeSignaturePrepared !== undefined)
      updateValues.oeSignaturePrepared = data.oeSignaturePrepared;
    if (data.courierRequestPrepared !== undefined)
      updateValues.courierRequestPrepared = data.courierRequestPrepared;
    if (data.currentPage !== undefined)
      updateValues.currentPage = data.currentPage;
    if (data.status !== undefined) updateValues.status = data.status;

    const [row] = await this.db
      .update(woDetails)
      .set(updateValues as Partial<typeof woDetails.$inferInsert>)
      .where(eq(woDetails.id, id))
      .returning();

    return this.mapRowToResponse(row!);
  }

  async delete(id: number): Promise<void> {
    const detail = await this.findById(id);

    // Delete all related data
    await Promise.all([
      this.db.delete(woBillingBoq).where(eq(woBillingBoq.woDetailId, id)),
      this.db.delete(woBuybackBoq).where(eq(woBuybackBoq.woDetailId, id)),
      this.db
        .delete(woBillingAddresses)
        .where(eq(woBillingAddresses.woDetailId, id)),
      this.db
        .delete(woShippingAddresses)
        .where(eq(woShippingAddresses.woDetailId, id)),
      this.db.delete(woAmendments).where(eq(woAmendments.woDetailId, id)),
      this.db.delete(woQueries).where(eq(woQueries.woDetailsId, id)),
      this.db.delete(woDocuments).where(eq(woDocuments.woDetailId, id)),
      this.db.delete(woAcceptance).where(eq(woAcceptance.woDetailId, id)),
      // Delete contacts associated with the WO Basic Detail
      this.db
        .delete(woContacts)
        .where(eq(woContacts.woBasicDetailId, detail.woBasicDetailId)),
    ]);

    await this.db.delete(woDetails).where(eq(woDetails.id, id));
  }
  // WIZARD OPERATIONS
  async initializeWizard(
    woBasicDetailId: number,
    userId?: number,
  ): Promise<WizardInitResponse> {
    const existing = await this.findByWoBasicDetailId(woBasicDetailId);

    if (existing) {
      return {
        id: existing.id,
        woBasicDetailId: existing.woBasicDetailId,
        status: existing.status,
        currentPage: existing.currentPage,
        completedPages: existing.completedPages as number[],
        skippedPages: existing.skippedPages as number[],
        createdAt: existing.createdAt,
        isExisting: true,
      };
    }

    const result = await this.create({ woBasicDetailId }, userId);

    return {
      id: result.id,
      woBasicDetailId: result.woBasicDetailId,
      status: result.status,
      currentPage: result.currentPage,
      completedPages: result.completedPages as number[],
      skippedPages: result.skippedPages as number[],
      createdAt: result.createdAt,
      isExisting: false,
    };
  }

  async getWizardProgress(id: number) {
    const detail = await this.findById(id);

    const completedCount = (detail.completedPages as number[]).length;
    const skippedCount = (detail.skippedPages as number[]).length;
    const percentComplete = Math.round(
      ((completedCount + skippedCount) / TOTAL_PAGES) * 100,
    );

    const blockers = this.getSubmissionBlockers(detail);

    return {
      currentPage: detail.currentPage,
      completedPages: detail.completedPages,
      skippedPages: detail.skippedPages,
      startedAt: detail.startedAt,
      completedAt: detail.completedAt,
      status: detail.status,
      percentComplete,
      canSubmitForReview: blockers.length === 0,
      blockers,
    };
  }

  async validateWizard(id: number): Promise<WizardValidationResult> {
    const detail = await this.findByIdWithRelations(id);
    const completedPages = detail.completedPages as number[];
    const skippedPages = detail.skippedPages as number[];

    const missingRequiredPages = REQUIRED_PAGES.filter(
      (page) =>
        !completedPages.includes(page) && !skippedPages.includes(page),
    );

    const incompletePages: number[] = [];
    const errors: Record<number, string[]> = {};

    // Validate Page 1
    if (completedPages.includes(1)) {
      const page1Errors: string[] = [];

      if (!detail.contacts || detail.contacts.length === 0) {
        page1Errors.push('At least one contact is required');
      } else {
        const contactsWithoutName = detail.contacts.filter(
          (c) => !c.name || !c.name.trim(),
        );
        if (contactsWithoutName.length > 0) {
          page1Errors.push('All contacts must have a name');
        }
      }

      if (!this.isChecklistComplete(detail.tenderDocumentsChecklist)) {
        // Warning only - doesn't block submission
        page1Errors.push(
          'Tender documents checklist is incomplete (notification will be sent)',
        );
      }

      // Only mark as incomplete if contacts are missing/invalid
      if (!detail.contacts || detail.contacts.length === 0) {
        incompletePages.push(1);
        errors[1] = page1Errors.filter(
          (e) => !e.includes('notification'),
        );
      }
    }

    // Validate Page 2
    if (completedPages.includes(2)) {
      const page2Errors: string[] = [];

      if (
        detail.ldApplicable &&
        (!detail.maxLd || !detail.ldStartDate || !detail.maxLdDate)
      ) {
        page2Errors.push('LD details are incomplete');
      }

      if (
        detail.isPbgApplicable &&
        !detail.filledBgFormat &&
        !detail.pbgBgId
      ) {
        page2Errors.push('PBG details are incomplete');
      }

      if (detail.isContractAgreement && !detail.contractAgreementFormat) {
        page2Errors.push('Contract agreement format is required');
      }

      if (page2Errors.length > 0) {
        incompletePages.push(2);
        errors[2] = page2Errors;
      }
    }

    // Validate Page 4
    if (completedPages.includes(4)) {
      const page4Errors: string[] = [];

      if (!detail.billingBoq || detail.billingBoq.length === 0) {
        page4Errors.push('At least one billing BOQ item is required');
      }

      if (!detail.billingAddresses || detail.billingAddresses.length === 0) {
        page4Errors.push('At least one billing address is required');
      }

      if (!detail.shippingAddresses || detail.shippingAddresses.length === 0) {
        page4Errors.push('At least one shipping address is required');
      }

      if (page4Errors.length > 0) {
        incompletePages.push(4);
        errors[4] = page4Errors;
      }
    }

    // Validate Page 5
    if (completedPages.includes(5)) {
      const page5Errors: string[] = [];

      if (
        detail.siteVisitNeeded &&
        (!detail.siteVisitPerson ||
          !(detail.siteVisitPerson as any)?.name?.trim())
      ) {
        page5Errors.push('Site visit person details are required');
      }

      if (page5Errors.length > 0) {
        incompletePages.push(5);
        errors[5] = page5Errors;
      }
    }

    // Validate Page 6
    if (completedPages.includes(6)) {
      const page6Errors: string[] = [];

      if (!detail.budgetPreGst) {
        page6Errors.push('Budget Pre-GST is required');
      }

      if (detail.hasDiscrepancies && !detail.discrepancyComments?.trim()) {
        page6Errors.push('Discrepancy comments are required');
      }

      if (page6Errors.length > 0) {
        incompletePages.push(6);
        errors[6] = page6Errors;
      }
    }

    // Validate Page 7
    if (completedPages.includes(7)) {
      const page7Errors: string[] = [];

      if (
        detail.oeWoAmendmentNeeded === null ||
        detail.oeWoAmendmentNeeded === undefined
      ) {
        page7Errors.push('Amendment decision is required');
      }

      if (detail.oeWoAmendmentNeeded === false) {
        if (!detail.oeSignaturePrepared) {
          page7Errors.push('OE signature must be prepared');
        }
        if (!detail.courierRequestPrepared) {
          page7Errors.push('Courier request must be prepared');
        }
      }

      if (page7Errors.length > 0) {
        incompletePages.push(7);
        errors[7] = page7Errors;
      }
    }

    const isValid =
      missingRequiredPages.length === 0 && incompletePages.length === 0;

    return {
      isValid,
      missingRequiredPages,
      incompletePages,
      errors,
    };
  }

  private getSubmissionBlockers(detail: any): string[] {
    const blockers: string[] = [];
    const completedPages = (detail.completedPages as number[]) || [];

    // Check required pages
    for (const page of REQUIRED_PAGES) {
      if (!completedPages.includes(page)) {
        blockers.push(`Page ${page} must be completed`);
      }
    }

    // Page 7 specific checks
    if (completedPages.includes(7)) {
      if (detail.oeWoAmendmentNeeded === true) {
        blockers.push('WO Amendment is pending');
      }

      if (detail.oeWoAmendmentNeeded === false) {
        if (!detail.oeSignaturePrepared) {
          blockers.push('OE Signature must be prepared');
        }
        if (!detail.courierRequestPrepared) {
          blockers.push('Courier request must be prepared');
        }
      }
    }

    return blockers;
  }
  // PAGE SAVE/SUBMIT OPERATIONS
  async savePageDraft(
    id: number,
    pageNum: number,
    data: PageData,
    userId?: number,
  ) {
    const detail = await this.findById(id);

    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: userId ?? null,
    };

    // Map page-specific data to update values
    this.mapPageDataToUpdate(pageNum, data, updateValues);

    const [row] = await this.db
      .update(woDetails)
      .set(updateValues as Partial<typeof woDetails.$inferInsert>)
      .where(eq(woDetails.id, id))
      .returning();

    // Handle page-specific related data
    await this.savePageRelatedData(
      id,
      detail.woBasicDetailId,
      pageNum,
      data,
    );

    return this.mapRowToResponse(row!);
  }

  async savePage(
    id: number,
    pageNum: number,
    data: PageData,
    userId?: number,
  ) {
    const detail = await this.findById(id);

    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: userId ?? null,
    };

    // Update status if draft
    if (detail.status === 'draft') {
      updateValues.status = 'in_progress';
    }

    // Map page-specific data
    this.mapPageDataToUpdate(pageNum, data, updateValues);

    const [row] = await this.db
      .update(woDetails)
      .set(updateValues as Partial<typeof woDetails.$inferInsert>)
      .where(eq(woDetails.id, id))
      .returning();

    // Handle page-specific related data
    await this.savePageRelatedData(
      id,
      detail.woBasicDetailId,
      pageNum,
      data,
    );

    return this.mapRowToResponse(row!);
  }

  async submitPage(
    id: number,
    pageNum: number,
    data: PageData,
    userId?: number,
  ) {
    const detail = await this.findById(id);

    const now = new Date();
    const updateValues: Record<string, unknown> = {
      updatedAt: now,
      updatedBy: userId ?? null,
    };

    // Update status
    if (detail.status === 'draft') {
      updateValues.status = 'in_progress';
    }

    // Map page-specific data
    this.mapPageDataToUpdate(pageNum, data, updateValues);

    // Mark page as completed
    const completedPages = [...((detail.completedPages as number[]) || [])];
    if (!completedPages.includes(pageNum)) {
      completedPages.push(pageNum);
    }
    updateValues.completedPages = completedPages;

    // Remove from skipped if was skipped
    const skippedPages = ((detail.skippedPages as number[]) || []).filter(
      (p: number) => p !== pageNum,
    );
    updateValues.skippedPages = skippedPages;

    // Move to next page if not on last
    if (pageNum < TOTAL_PAGES) {
      updateValues.currentPage = pageNum + 1;
    }

    // Page-specific timestamps
    this.setPageTimestamps(pageNum, data, updateValues, now);

    const [row] = await this.db
      .update(woDetails)
      .set(updateValues as Partial<typeof woDetails.$inferInsert>)
      .where(eq(woDetails.id, id))
      .returning();

    // Handle page-specific related data
    await this.savePageRelatedData(
      id,
      detail.woBasicDetailId,
      pageNum,
      data,
    );

    return {
      ...this.mapRowToResponse(row!),
      message: `Page ${pageNum} submitted successfully`,
      nextPage: pageNum < TOTAL_PAGES ? pageNum + 1 : null,
    };
  }

  async skipPage(
    id: number,
    pageNum: number,
    data?: { reason?: string },
    userId?: number,
  ) {
    const detail = await this.findById(id);

    // Check if page can be skipped
    if (!(SKIPPABLE_PAGES as readonly number[]).includes(pageNum)) {
      throw new BadRequestException(
        `Page ${pageNum} cannot be skipped. Required pages: ${REQUIRED_PAGES.join(', ')}`,
      );
    }

    const now = new Date();
    const updateValues: Record<string, unknown> = {
      updatedAt: now,
      updatedBy: userId ?? null,
    };

    // Update status
    if (detail.status === 'draft') {
      updateValues.status = 'in_progress';
    }

    // Mark page as skipped
    const skippedPages = [...((detail.skippedPages as number[]) || [])];
    if (!skippedPages.includes(pageNum)) {
      skippedPages.push(pageNum);
    }
    updateValues.skippedPages = skippedPages;

    // Remove from completed if was completed
    const completedPages = ((detail.completedPages as number[]) || []).filter(
      (p: number) => p !== pageNum,
    );
    updateValues.completedPages = completedPages;

    // Move to next page
    if (pageNum < TOTAL_PAGES) {
      updateValues.currentPage = pageNum + 1;
    }

    const [row] = await this.db
      .update(woDetails)
      .set(updateValues as Partial<typeof woDetails.$inferInsert>)
      .where(eq(woDetails.id, id))
      .returning();

    return {
      ...this.mapRowToResponse(row!),
      message: `Page ${pageNum} skipped`,
      nextPage: pageNum < TOTAL_PAGES ? pageNum + 1 : null,
    };
  }

  async submitForReview(id: number, userId?: number) {
    const detail = await this.findById(id);

    const blockers = this.getSubmissionBlockers(detail);
    if (blockers.length > 0) {
      throw new BadRequestException({
        message: 'Cannot submit for review',
        blockers,
      });
    }

    const now = new Date();

    const [row] = await this.db
      .update(woDetails)
      .set({
        status: 'submitted_for_review',
        completedAt: now,
        updatedAt: now,
        updatedBy: userId ?? null,
      })
      .where(eq(woDetails.id, id))
      .returning();

    // Update basic detail stage
    await this.db
      .update(woBasicDetails)
      .set({ currentStage: 'wo_acceptance', updatedAt: now })
      .where(eq(woBasicDetails.id, detail.woBasicDetailId));

    // Create WO Acceptance record
    await this.db.insert(woAcceptance).values({
      woDetailId: id,
      status: 'pending_review',
      createdAt: now,
      updatedAt: now,
      createdBy: userId ?? null,
    });

    return {
      ...this.mapRowToResponse(row!),
      message: 'WO Details submitted for TL review',
    };
  }
  // GET PAGE DATA
  async getPageData(id: number, pageNum: number) {
    const detail = await this.findByIdWithRelations(id);

    switch (pageNum) {
      case 1:
        return {
          contacts: detail.contacts.map((c) => ({
            id: c.id,
            organization: c.organization,
            departments: c.departments,
            name: c.name,
            designation: c.designation,
            phone: c.phone,
            email: c.email,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
          })),
          tenderDocumentsChecklist: detail.tenderDocumentsChecklist,
          checklistCompletedAt: detail.checklistCompletedAt,
          checklistIncompleteNotifiedAt: detail.checklistIncompleteNotifiedAt,
          isChecklistComplete: this.isChecklistComplete(
            detail.tenderDocumentsChecklist,
          ),
          incompleteItems: this.getIncompleteChecklistItems(
            detail.tenderDocumentsChecklist,
          ),
        };

      case 2:
        return {
          ldApplicable: detail.ldApplicable,
          maxLd: detail.maxLd,
          ldStartDate: detail.ldStartDate,
          maxLdDate: detail.maxLdDate,
          isPbgApplicable: detail.isPbgApplicable,
          filledBgFormat: detail.filledBgFormat,
          pbgBgId: detail.pbgBgId,
          isContractAgreement: detail.isContractAgreement,
          contractAgreementFormat: detail.contractAgreementFormat,
          detailedPoApplicable: detail.detailedPoApplicable,
          detailedPoFollowupId: detail.detailedPoFollowupId,
        };

      case 3:
        return {
          swotStrengths: detail.swotStrengths,
          swotWeaknesses: detail.swotWeaknesses,
          swotOpportunities: detail.swotOpportunities,
          swotThreats: detail.swotThreats,
          swotCompletedAt: detail.swotCompletedAt,
          hasContent: !!(
            detail.swotStrengths ||
            detail.swotWeaknesses ||
            detail.swotOpportunities ||
            detail.swotThreats
          ),
        };

      case 4:
        const billingTotal = this.calculateTotal(detail.billingBoq);
        const buybackTotal = this.calculateTotal(detail.buybackBoq);
        return {
          billingBoq: detail.billingBoq.map((item) => ({
            id: item.id,
            srNo: item.srNo,
            itemDescription: item.itemDescription,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
            sortOrder: item.sortOrder,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
          })),
          buybackBoq: detail.buybackBoq.map((item) => ({
            id: item.id,
            srNo: item.srNo,
            itemDescription: item.itemDescription,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
            sortOrder: item.sortOrder,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
          })),
          billingAddresses: detail.billingAddresses.map((addr) => ({
            id: addr.id,
            srNos: addr.srNos,
            customerName: addr.customerName,
            address: addr.address,
            gst: addr.gst,
            createdAt: addr.createdAt.toISOString(),
            updatedAt: addr.updatedAt.toISOString(),
          })),
          shippingAddresses: detail.shippingAddresses.map((addr) => ({
            id: addr.id,
            srNos: addr.srNos,
            customerName: addr.customerName,
            address: addr.address,
            gst: addr.gst,
            createdAt: addr.createdAt.toISOString(),
            updatedAt: addr.updatedAt.toISOString(),
          })),
          billingTotal,
          buybackTotal,
        };

      case 5:
        return {
          siteVisitNeeded: detail.siteVisitNeeded,
          siteVisitPerson: detail.siteVisitPerson,
          documentsFromTendering: detail.documentsFromTendering,
          documentsNeeded: detail.documentsNeeded,
          documentsInHouse: detail.documentsInHouse,
          totalDocuments:
            (detail.documentsFromTendering?.length ?? 0) +
            (detail.documentsNeeded?.length ?? 0) +
            (detail.documentsInHouse?.length ?? 0),
        };

      case 6:
        return {
          costingSheetLink: detail.costingSheetLink,
          hasDiscrepancies: detail.hasDiscrepancies,
          discrepancyComments: detail.discrepancyComments,
          discrepancyNotifiedAt: detail.discrepancyNotifiedAt,
          budgetPreGst: detail.budgetPreGst,
          budgetSupply: detail.budgetSupply,
          budgetService: detail.budgetService,
          budgetFreight: detail.budgetFreight,
          budgetAdmin: detail.budgetAdmin,
          budgetBuybackSale: detail.budgetBuybackSale,
          totalBudget: this.calculateBudgetTotal(detail),
        };

      case 7:
        return {
          oeWoAmendmentNeeded: detail.oeWoAmendmentNeeded,
          oeAmendmentSubmittedAt: detail.oeAmendmentSubmittedAt,
          oeSignaturePrepared: detail.oeSignaturePrepared,
          courierRequestPrepared: detail.courierRequestPrepared,
          courierRequestPreparedAt: detail.courierRequestPreparedAt,
          canSubmitForReview: this.getSubmissionBlockers(detail).length === 0,
          blockers: this.getSubmissionBlockers(detail),
        };

      default:
        throw new BadRequestException('Invalid page number');
    }
  }
  // IMPORT OPERATIONS
  async importTenderContacts(
    woBasicDetailId: number,
    woDetailId: number,
  ): Promise<ImportContactsResponse> {
    // Verify WO Detail exists
    await this.findById(woDetailId);

    // Get contacts from wo_contacts table
    const contacts = await this.db
      .select()
      .from(woContacts)
      .where(eq(woContacts.woBasicDetailId, woBasicDetailId));

    return {
      contacts: contacts.map((contact) => ({
        id: contact.id,
        name: contact.name ?? '',
        designation: contact.designation ?? '',
        phone: contact.phone ?? '',
        email: contact.email ?? '',
        organization: contact.organization ?? '',
        departments: contact.departments ?? undefined,
      })),
      importedCount: contacts.length,
    };
  }
  // PRIVATE HELPER METHODS
  private mapPageDataToUpdate(
    pageNum: number,
    data: any,
    updateValues: Record<string, unknown>,
  ) {
    switch (pageNum) {
      case 1:
        if (data.tenderDocumentsChecklist !== undefined) {
          updateValues.tenderDocumentsChecklist = data.tenderDocumentsChecklist;
        }
        // Contacts are handled separately in savePageRelatedData
        break;

      case 2:
        if (data.ldApplicable !== undefined)
          updateValues.ldApplicable = data.ldApplicable;
        if (data.maxLd !== undefined) updateValues.maxLd = data.maxLd;
        if (data.ldStartDate !== undefined)
          updateValues.ldStartDate = data.ldStartDate;
        if (data.maxLdDate !== undefined)
          updateValues.maxLdDate = data.maxLdDate;
        if (data.isPbgApplicable !== undefined)
          updateValues.isPbgApplicable = data.isPbgApplicable;
        if (data.filledBgFormat !== undefined)
          updateValues.filledBgFormat = data.filledBgFormat;
        if (data.pbgBgId !== undefined) updateValues.pbgBgId = data.pbgBgId;
        if (data.isContractAgreement !== undefined)
          updateValues.isContractAgreement = data.isContractAgreement;
        if (data.contractAgreementFormat !== undefined)
          updateValues.contractAgreementFormat = data.contractAgreementFormat;
        if (data.detailedPoApplicable !== undefined)
          updateValues.detailedPoApplicable = data.detailedPoApplicable;
        if (data.detailedPoFollowupId !== undefined)
          updateValues.detailedPoFollowupId = data.detailedPoFollowupId;
        break;

      case 3:
        if (data.swotStrengths !== undefined)
          updateValues.swotStrengths = data.swotStrengths;
        if (data.swotWeaknesses !== undefined)
          updateValues.swotWeaknesses = data.swotWeaknesses;
        if (data.swotOpportunities !== undefined)
          updateValues.swotOpportunities = data.swotOpportunities;
        if (data.swotThreats !== undefined)
          updateValues.swotThreats = data.swotThreats;
        break;

      case 4:
        // BOQ and Addresses are handled separately in savePageRelatedData
        break;

      case 5:
        if (data.siteVisitNeeded !== undefined)
          updateValues.siteVisitNeeded = data.siteVisitNeeded;
        if (data.siteVisitPerson !== undefined)
          updateValues.siteVisitPerson = data.siteVisitPerson;
        if (data.documentsFromTendering !== undefined)
          updateValues.documentsFromTendering = data.documentsFromTendering;
        if (data.documentsNeeded !== undefined)
          updateValues.documentsNeeded = data.documentsNeeded;
        if (data.documentsInHouse !== undefined)
          updateValues.documentsInHouse = data.documentsInHouse;
        break;

      case 6:
        if (data.costingSheetLink !== undefined)
          updateValues.costingSheetLink = data.costingSheetLink || null;
        if (data.hasDiscrepancies !== undefined)
          updateValues.hasDiscrepancies = data.hasDiscrepancies;
        if (data.discrepancyComments !== undefined)
          updateValues.discrepancyComments = data.discrepancyComments;
        if (data.budgetPreGst !== undefined)
          updateValues.budgetPreGst = data.budgetPreGst;

        // Handle budget breakdown (nested object from frontend)
        if (data.budgetBreakdown !== undefined) {
          const breakdown = data.budgetBreakdown;
          if (breakdown.supply !== undefined)
            updateValues.budgetSupply = breakdown.supply;
          if (breakdown.service !== undefined)
            updateValues.budgetService = breakdown.service;
          if (breakdown.freight !== undefined)
            updateValues.budgetFreight = breakdown.freight;
          if (breakdown.admin !== undefined)
            updateValues.budgetAdmin = breakdown.admin;
          if (breakdown.buybackSale !== undefined)
            updateValues.budgetBuybackSale = breakdown.buybackSale;
        }

        // Also handle flat fields (backwards compatibility)
        if (data.budgetSupply !== undefined)
          updateValues.budgetSupply = data.budgetSupply;
        if (data.budgetService !== undefined)
          updateValues.budgetService = data.budgetService;
        if (data.budgetFreight !== undefined)
          updateValues.budgetFreight = data.budgetFreight;
        if (data.budgetAdmin !== undefined)
          updateValues.budgetAdmin = data.budgetAdmin;
        if (data.budgetBuybackSale !== undefined)
          updateValues.budgetBuybackSale = data.budgetBuybackSale;
        break;

      case 7:
        if (data.oeWoAmendmentNeeded !== undefined)
          updateValues.oeWoAmendmentNeeded = data.oeWoAmendmentNeeded;
        if (data.oeSignaturePrepared !== undefined)
          updateValues.oeSignaturePrepared = data.oeSignaturePrepared;
        if (data.courierRequestPrepared !== undefined)
          updateValues.courierRequestPrepared = data.courierRequestPrepared;
        break;
    }
  }

  private setPageTimestamps(
    pageNum: number,
    data: any,
    updateValues: Record<string, unknown>,
    now: Date,
  ) {
    switch (pageNum) {
      case 1:
        if (data.tenderDocumentsChecklist) {
          const checklist = data.tenderDocumentsChecklist as TenderDocumentsChecklist;
          const allComplete = TENDER_CHECKLIST_ITEMS.every(
            (key) => checklist[key] === true,
          );
          if (allComplete) {
            updateValues.checklistCompletedAt = now;
          } else {
            updateValues.checklistIncompleteNotifiedAt = now;
          }
        }
        break;

      case 3:
        updateValues.swotCompletedAt = now;
        break;

      case 6:
        if (data.hasDiscrepancies) {
          updateValues.discrepancyNotifiedAt = now;
        }
        break;

      case 7:
        if (data.oeWoAmendmentNeeded) {
          updateValues.oeAmendmentSubmittedAt = now;
        }
        if (data.courierRequestPrepared) {
          updateValues.courierRequestPreparedAt = now;
        }
        break;
    }
  }

  private async savePageRelatedData(
    woDetailId: number,
    woBasicDetailId: number,
    pageNum: number,
    data: any,
  ) {
    switch (pageNum) {
      case 1:
        if (data.contacts !== undefined) {
          await this.savePage1Contacts(woBasicDetailId, data.contacts);
        }
        break;

      case 4:
        await this.savePage4Data(woDetailId, data);
        break;

      // Page 7 amendments are handled by WoAmendmentsModule
      // If you need to save amendments inline, add that logic here
    }
  }

  private async savePage1Contacts(
    woBasicDetailId: number,
    contacts: Page1ContactDto[],
  ) {
    const now = new Date();

    // Delete existing contacts for this WO Basic Detail
    await this.db
      .delete(woContacts)
      .where(eq(woContacts.woBasicDetailId, woBasicDetailId));

    // Insert new contacts
    if (contacts && contacts.length > 0) {
      const contactRows = contacts
        .filter((contact) => contact.name?.trim()) // Filter out empty contacts
        .map((contact) => ({
          woBasicDetailId,
          organization: contact.organization || null,
          departments: contact.departments || null,
          name: contact.name || null,
          designation: contact.designation || null,
          phone: contact.phone || null,
          email: contact.email || null,
          createdAt: now,
          updatedAt: now,
        }));

      if (contactRows.length > 0) {
        await this.db.insert(woContacts).values(contactRows);
      }
    }
  }

  private async savePage4Data(woDetailId: number, data: SavePage4Dto) {
    const now = new Date();

    // Handle Billing BOQ
    if (data.billingBoq !== undefined) {
      await this.db
        .delete(woBillingBoq)
        .where(eq(woBillingBoq.woDetailId, woDetailId));

      if (data.billingBoq.length > 0) {
        const billingItems = data.billingBoq.map((item, index) => ({
          woDetailId,
          srNo: item.srNo,
          itemDescription: item.itemDescription,
          quantity: item.quantity,
          rate: item.rate,
          amount: (
            parseFloat(item.quantity) * parseFloat(item.rate)
          ).toFixed(2),
          sortOrder: item.sortOrder ?? index + 1,
          createdAt: now,
          updatedAt: now,
        }));
        await this.db.insert(woBillingBoq).values(billingItems);
      }
    }

    // Handle Buyback BOQ
    if (data.buybackBoq !== undefined) {
      await this.db
        .delete(woBuybackBoq)
        .where(eq(woBuybackBoq.woDetailId, woDetailId));

      if (data.buybackBoq.length > 0) {
        const buybackItems = data.buybackBoq.map((item, index) => ({
          woDetailId,
          srNo: item.srNo,
          itemDescription: item.itemDescription,
          quantity: item.quantity,
          rate: item.rate,
          amount: (
            parseFloat(item.quantity) * parseFloat(item.rate)
          ).toFixed(2),
          sortOrder: item.sortOrder ?? index + 1,
          createdAt: now,
          updatedAt: now,
        }));
        await this.db.insert(woBuybackBoq).values(buybackItems);
      }
    }

    // Handle Billing Addresses
    if (data.billingAddresses !== undefined) {
      await this.db
        .delete(woBillingAddresses)
        .where(eq(woBillingAddresses.woDetailId, woDetailId));

      if (data.billingAddresses.length > 0) {
        const billingAddrs = data.billingAddresses.map((addr) => ({
          woDetailId,
          srNos: addr.srNos,
          customerName: addr.customerName,
          address: addr.address,
          gst: addr.gst || null,
          createdAt: now,
          updatedAt: now,
        }));
        await this.db.insert(woBillingAddresses).values(billingAddrs);
      }
    }

    // Handle Shipping Addresses
    if (data.shippingAddresses !== undefined) {
      await this.db
        .delete(woShippingAddresses)
        .where(eq(woShippingAddresses.woDetailId, woDetailId));

      if (data.shippingAddresses.length > 0) {
        const shippingAddrs = data.shippingAddresses.map((addr) => ({
          woDetailId,
          srNos: addr.srNos,
          customerName: addr.customerName,
          address: addr.address,
          gst: addr.gst || null,
          createdAt: now,
          updatedAt: now,
        }));
        await this.db.insert(woShippingAddresses).values(shippingAddrs);
      }
    }
  }

  private isChecklistComplete(
    checklist: TenderDocumentsChecklist | null,
  ): boolean {
    if (!checklist) return false;
    return TENDER_CHECKLIST_ITEMS.every((key) => checklist[key] === true);
  }

  private getIncompleteChecklistItems(
    checklist: TenderDocumentsChecklist | null,
  ): string[] {
    if (!checklist) return [...TENDER_CHECKLIST_ITEMS];
    return TENDER_CHECKLIST_ITEMS.filter((key) => checklist[key] !== true);
  }

  private calculateTotal(items: any[]): string {
    if (!items || items.length === 0) return '0.00';
    const total = items.reduce((sum, item) => {
      const amount = parseFloat(item.amount || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    return total.toFixed(2);
  }

  private calculateBudgetTotal(detail: any): string {
    const supply = parseFloat(detail.budgetSupply || '0') || 0;
    const service = parseFloat(detail.budgetService || '0') || 0;
    const freight = parseFloat(detail.budgetFreight || '0') || 0;
    const admin = parseFloat(detail.budgetAdmin || '0') || 0;
    const buyback = parseFloat(detail.budgetBuybackSale || '0') || 0;

    const total = supply + service + freight + admin - buyback;
    return total.toFixed(2);
  }
  // DASHBOARD
  async getDashboardSummary(user: ValidatedUser, teamId?: number) {
    const conditions: any[] = [
        eq(woDetails.status, 'completed')
    ];
    if (user) {
      conditions.push(...this.getVisibilityConditions(user, teamId));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [summary] = await this.db
      .select({
        accepted: sql<number>`count(*) filter (where ${woAcceptance.status} = 'completed' and ${woAcceptance.decision} = 'accepted')::int`,
        amendmentNeeded: sql<number>`count(*) filter (where ${woDetails.oeWoAmendmentNeeded} = true or ${woAcceptance.status} = 'awaiting_amendment' or ${woAcceptance.decision} = 'amendment_needed')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(woDetails)
      .leftJoin(woAcceptance, eq(woDetails.id, woAcceptance.woDetailId))
      .leftJoin(
        woBasicDetails,
        eq(woDetails.woBasicDetailId, woBasicDetails.id),
      )
      .where(whereClause);

    const acceptedCount = summary?.accepted ?? 0;
    const amendmentNeededCount = summary?.amendmentNeeded ?? 0;
    const totalCount = summary?.total ?? 0;
    const pendingCount = Math.max(
      0,
      totalCount - acceptedCount - amendmentNeededCount,
    );

    return {
      summary: {
        pending: pendingCount,
        accepted: acceptedCount,
        amendmentNeeded: amendmentNeededCount,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
