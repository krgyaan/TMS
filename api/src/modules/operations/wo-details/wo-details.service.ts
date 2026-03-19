import { Inject, Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { eq, desc, asc, sql, and, gte, lte, or, isNull, ne, ilike } from 'drizzle-orm';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { woDetails, woBasicDetails, woContacts, woBillingBoq, woBuybackBoq, woBillingAddresses, woShippingAddresses, woAmendments, woQueries, woDocuments, woAcceptance } from '@db/schemas/operations';
import type { CreateWoDetailDto, UpdateWoDetailDto, WoDetailsListResponseDto, WoDetailsQueryDto, SavePage4Dto, SkipPageDto, TenderDocumentsChecklist, WoDetailsStatus } from './dto/wo-details.dto';

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

@Injectable()
export class WoDetailsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  // MAPPING FUNCTIONS
  private mapRowToResponse(row: WoDetailRow) {
    return {
      id: row.id,
      woBasicDetailId: row.woBasicDetailId,

      // Page 1
      tenderDocumentsChecklist: row.tenderDocumentsChecklist,
      checklistCompletedAt: row.checklistCompletedAt?.toISOString() ?? null,
      checklistIncompleteNotifiedAt: row.checklistIncompleteNotifiedAt?.toISOString() ?? null,

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
      courierRequestPreparedAt: row.courierRequestPreparedAt?.toISOString() ?? null,

      // Wizard Progress
      currentPage: row.currentPage ?? 1,
      completedPages: row.completedPages ?? [],
      skippedPages: row.skippedPages ?? [],
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
      woAcceptanceStatus: (row.woAcceptanceStatus as any) ?? null,
    };
  }

  private getVisibilityConditions(user: ValidatedUser, teamId?: number) {
    const conditions: any[] = [];

    // Role ID 1 = Super User, 2 = Admin: Show all, respect teamId filter if provided
    if (user.roleId === 1 || user.roleId === 2) {
      if (teamId !== undefined && teamId !== null) {
        conditions.push(eq(woBasicDetails.team, teamId));
      }
    } else if (user.roleId === 3 || user.roleId === 4 || user.roleId === 6) {
      // Team Leader, Coordinator, Engineer: Filter by teamId
      if (user.teamId) {
        conditions.push(eq(woBasicDetails.team, user.teamId));
      }
    } else {
      // Other roles: Show where they created or are assigned as OE
      conditions.push(
        or(
          eq(woBasicDetails.createdBy, user.sub),
          eq(woBasicDetails.oeFirst, user.sub),
          eq(woBasicDetails.oeSiteVisit, user.sub),
          eq(woBasicDetails.oeDocsPrep, user.sub),
          eq(woDetails.createdBy, user.sub)
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

    const conditions: any[] = [];

    // Apply role-based filtering
    if (filters?.user) {
      conditions.push(...this.getVisibilityConditions(filters.user, filters.teamId));
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
      conditions.push(eq(woDetails.isContractAgreement, filters.isContractAgreement));
    }

    if (filters?.woAmendmentNeeded !== undefined && filters?.woAmendmentNeeded === true) {
      conditions.push(eq(woDetails.oeWoAmendmentNeeded, true));
    } else if (filters?.woAcceptance !== undefined && filters?.woAcceptance === true) {
      conditions.push(
        and(
          eq(woAcceptance.status, 'completed'),
          eq(woAcceptance.decision, 'accepted')
        )
      );
    } else if (filters?.woAcceptance === false && filters?.woAmendmentNeeded === false) {
      // Pending tab: Not accepted and not amendment needed
      conditions.push(
        and(
          // Not accepted
          or(
            isNull(woAcceptance.id),
            ne(woAcceptance.status, 'completed'),
            ne(woAcceptance.decision, 'accepted')
          ),
          // Not amendment needed
          and(
            eq(woDetails.oeWoAmendmentNeeded, false),
            or(
              isNull(woAcceptance.id),
              and(
                ne(woAcceptance.status, 'awaiting_amendment'),
                ne(woAcceptance.decision, 'amendment_needed')
              )
            )
          )
        )
      );
    }

    // Search condition
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

    // Determine sorting
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
        .leftJoin(woBasicDetails, eq(woDetails.woBasicDetailId, woBasicDetails.id))
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
        .leftJoin(woBasicDetails, eq(woDetails.woBasicDetailId, woBasicDetails.id))
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
    // Check if WO Detail already exists
    const existing = await this.db
      .select({ id: woDetails.id })
      .from(woDetails)
      .where(eq(woDetails.woBasicDetailId, data.woBasicDetailId))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException(
        `WO Detail already exists for Basic Detail ID ${data.woBasicDetailId}`
      );
    }

    // Verify WO Basic Detail exists
    const [basicDetail] = await this.db
      .select({ id: woBasicDetails.id })
      .from(woBasicDetails)
      .where(eq(woBasicDetails.id, data.woBasicDetailId))
      .limit(1);

    if (!basicDetail) {
      throw new NotFoundException(
        `WO Basic Detail with ID ${data.woBasicDetailId} not found`
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

    // Update basic detail stage
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

    // Map all update fields
    if (data.tenderDocumentsChecklist !== undefined) {
      updateValues.tenderDocumentsChecklist = data.tenderDocumentsChecklist;
    }
    if (data.ldApplicable !== undefined) updateValues.ldApplicable = data.ldApplicable;
    if (data.maxLd !== undefined) updateValues.maxLd = data.maxLd;
    if (data.ldStartDate !== undefined) updateValues.ldStartDate = data.ldStartDate;
    if (data.maxLdDate !== undefined) updateValues.maxLdDate = data.maxLdDate;
    if (data.isPbgApplicable !== undefined) updateValues.isPbgApplicable = data.isPbgApplicable;
    if (data.filledBgFormat !== undefined) updateValues.filledBgFormat = data.filledBgFormat;
    if (data.pbgBgId !== undefined) updateValues.pbgBgId = data.pbgBgId;
    if (data.isContractAgreement !== undefined) updateValues.isContractAgreement = data.isContractAgreement;
    if (data.contractAgreementFormat !== undefined) updateValues.contractAgreementFormat = data.contractAgreementFormat;
    if (data.detailedPoApplicable !== undefined) updateValues.detailedPoApplicable = data.detailedPoApplicable;
    if (data.detailedPoFollowupId !== undefined) updateValues.detailedPoFollowupId = data.detailedPoFollowupId;
    if (data.swotStrengths !== undefined) updateValues.swotStrengths = data.swotStrengths;
    if (data.swotWeaknesses !== undefined) updateValues.swotWeaknesses = data.swotWeaknesses;
    if (data.swotOpportunities !== undefined) updateValues.swotOpportunities = data.swotOpportunities;
    if (data.swotThreats !== undefined) updateValues.swotThreats = data.swotThreats;
    if (data.siteVisitNeeded !== undefined) updateValues.siteVisitNeeded = data.siteVisitNeeded;
    if (data.siteVisitPerson !== undefined) updateValues.siteVisitPerson = data.siteVisitPerson;
    if (data.documentsFromTendering !== undefined) updateValues.documentsFromTendering = data.documentsFromTendering;
    if (data.documentsNeeded !== undefined) updateValues.documentsNeeded = data.documentsNeeded;
    if (data.documentsInHouse !== undefined) updateValues.documentsInHouse = data.documentsInHouse;
    if (data.costingSheetLink !== undefined) updateValues.costingSheetLink = data.costingSheetLink || null;
    if (data.hasDiscrepancies !== undefined) updateValues.hasDiscrepancies = data.hasDiscrepancies;
    if (data.discrepancyComments !== undefined) updateValues.discrepancyComments = data.discrepancyComments;
    if (data.budgetPreGst !== undefined) updateValues.budgetPreGst = data.budgetPreGst;
    if (data.budgetSupply !== undefined) updateValues.budgetSupply = data.budgetSupply;
    if (data.budgetService !== undefined) updateValues.budgetService = data.budgetService;
    if (data.budgetFreight !== undefined) updateValues.budgetFreight = data.budgetFreight;
    if (data.budgetAdmin !== undefined) updateValues.budgetAdmin = data.budgetAdmin;
    if (data.budgetBuybackSale !== undefined) updateValues.budgetBuybackSale = data.budgetBuybackSale;
    if (data.oeWoAmendmentNeeded !== undefined) updateValues.oeWoAmendmentNeeded = data.oeWoAmendmentNeeded;
    if (data.oeSignaturePrepared !== undefined) updateValues.oeSignaturePrepared = data.oeSignaturePrepared;
    if (data.courierRequestPrepared !== undefined) updateValues.courierRequestPrepared = data.courierRequestPrepared;
    if (data.currentPage !== undefined) updateValues.currentPage = data.currentPage;
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

    // Cascading delete handled by DB, but let's be explicit
    await Promise.all([
      this.db.delete(woBillingBoq).where(eq(woBillingBoq.woDetailId, id)),
      this.db.delete(woBuybackBoq).where(eq(woBuybackBoq.woDetailId, id)),
      this.db.delete(woBillingAddresses).where(eq(woBillingAddresses.woDetailId, id)),
      this.db.delete(woShippingAddresses).where(eq(woShippingAddresses.woDetailId, id)),
      this.db.delete(woAmendments).where(eq(woAmendments.woDetailId, id)),
      this.db.delete(woQueries).where(eq(woQueries.woDetailsId, id)),
      this.db.delete(woDocuments).where(eq(woDocuments.woDetailId, id)),
      this.db.delete(woAcceptance).where(eq(woAcceptance.woDetailId, id)),
    ]);

    await this.db.delete(woDetails).where(eq(woDetails.id, id));
  }

  // WIZARD OPERATIONS
  async getWizardProgress(id: number) {
    const detail = await this.findById(id);

    const totalPages = 7;
    const completedCount = detail.completedPages.length;
    const percentComplete = Math.round((completedCount / totalPages) * 100);

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

  private getSubmissionBlockers(detail: any): string[] {
    const blockers: string[] = [];

    // Page 7 must be completed (not skipped)
    if (!detail.completedPages.includes(7)) {
      blockers.push('Page 7 (WO Acceptance) must be completed');
    }

    // If amendment needed, can't submit
    if (detail.oeWoAmendmentNeeded === true) {
      blockers.push('WO Amendment is pending');
    }

    // If no amendment needed, signature and courier must be prepared
    if (detail.oeWoAmendmentNeeded === false) {
      if (!detail.oeSignaturePrepared) {
        blockers.push('OE Signature must be prepared');
      }
      if (!detail.courierRequestPrepared) {
        blockers.push('Courier request must be prepared');
      }
    }

    return blockers;
  }

  async savePage(id: number, pageNum: number, data: any, userId?: number) {
    const detail = await this.findById(id);

    if (pageNum < 1 || pageNum > 7) {
      throw new BadRequestException('Invalid page number');
    }

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

    // Handle Page 4 separately (BOQ and addresses)
    if (pageNum === 4 && data) {
      await this.savePage4Data(id, data);
    }

    return this.mapRowToResponse(row!);
  }

  async submitPage(id: number, pageNum: number, data: any, userId?: number) {
    const detail = await this.findById(id);

    if (pageNum < 1 || pageNum > 7) {
      throw new BadRequestException('Invalid page number');
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

    // Map page-specific data
    this.mapPageDataToUpdate(pageNum, data, updateValues);

    // Mark page as completed
    const completedPages = [...(detail.completedPages || [])];
    if (!completedPages.includes(pageNum)) {
      completedPages.push(pageNum);
    }
    updateValues.completedPages = completedPages;

    // Remove from skipped if was skipped
    const skippedPages = (detail.skippedPages || []).filter((p: number) => p !== pageNum);
    updateValues.skippedPages = skippedPages;

    // Move to next page if not on last
    if (pageNum < 7) {
      updateValues.currentPage = pageNum + 1;
    }

    // Page-specific timestamps
    if (pageNum === 1 && data.tenderDocumentsChecklist) {
      const checklist = data.tenderDocumentsChecklist as TenderDocumentsChecklist;
      const allComplete = TENDER_CHECKLIST_ITEMS.every((key) => checklist[key] === true);
      if (allComplete) {
        updateValues.checklistCompletedAt = now;
      } else {
        // TODO: Send notification to Tendering TL and TE
        updateValues.checklistIncompleteNotifiedAt = now;
      }
    }

    if (pageNum === 3) {
      updateValues.swotCompletedAt = now;
    }

    if (pageNum === 6 && data.hasDiscrepancies) {
      // TODO: Send notification to TL and TE
      updateValues.discrepancyNotifiedAt = now;
    }

    if (pageNum === 7) {
      if (data.oeWoAmendmentNeeded) {
        updateValues.oeAmendmentSubmittedAt = now;
      }
      if (data.courierRequestPrepared) {
        updateValues.courierRequestPreparedAt = now;
      }
    }

    const [row] = await this.db
      .update(woDetails)
      .set(updateValues as Partial<typeof woDetails.$inferInsert>)
      .where(eq(woDetails.id, id))
      .returning();

    // Handle Page 4 separately
    if (pageNum === 4 && data) {
      await this.savePage4Data(id, data);
    }

    return this.mapRowToResponse(row!);
  }

  async skipPage(id: number, pageNum: number, data?: SkipPageDto, userId?: number) {
    const detail = await this.findById(id);

    if (pageNum < 1 || pageNum > 7) {
      throw new BadRequestException('Invalid page number');
    }

    // Page 7 cannot be skipped
    if (pageNum === 7) {
      throw new BadRequestException('Page 7 (WO Acceptance) cannot be skipped');
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
    const skippedPages = [...(detail.skippedPages || [])];
    if (!skippedPages.includes(pageNum)) {
      skippedPages.push(pageNum);
    }
    updateValues.skippedPages = skippedPages;

    // Remove from completed if was completed
    const completedPages = (detail.completedPages || []).filter((p: number) => p !== pageNum);
    updateValues.completedPages = completedPages;

    // Move to next page
    if (pageNum < 7) {
      updateValues.currentPage = pageNum + 1;
    }

    const [row] = await this.db
      .update(woDetails)
      .set(updateValues as Partial<typeof woDetails.$inferInsert>)
      .where(eq(woDetails.id, id))
      .returning();

    return this.mapRowToResponse(row!);
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

  async getPageData(id: number, pageNum: number) {
    const detail = await this.findByIdWithRelations(id);

    switch (pageNum) {
      case 1:
        return {
          contacts: detail.contacts,
          tenderDocumentsChecklist: detail.tenderDocumentsChecklist,
          checklistCompletedAt: detail.checklistCompletedAt,
          checklistIncompleteNotifiedAt: detail.checklistIncompleteNotifiedAt,
          isChecklistComplete: this.isChecklistComplete(detail.tenderDocumentsChecklist),
          incompleteItems: this.getIncompleteChecklistItems(detail.tenderDocumentsChecklist),
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
          billingBoq: detail.billingBoq,
          buybackBoq: detail.buybackBoq,
          billingAddresses: detail.billingAddresses,
          shippingAddresses: detail.shippingAddresses,
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
          amendments: detail.amendments,
          canSubmitForReview: this.getSubmissionBlockers(detail).length === 0,
          blockers: this.getSubmissionBlockers(detail),
        };

      default:
        throw new BadRequestException('Invalid page number');
    }
  }

  // HELPER METHODS
  private mapPageDataToUpdate(pageNum: number, data: any, updateValues: Record<string, unknown>) {
    switch (pageNum) {
      case 1:
        if (data.tenderDocumentsChecklist !== undefined) {
          updateValues.tenderDocumentsChecklist = data.tenderDocumentsChecklist;
        }
        break;

      case 2:
        if (data.ldApplicable !== undefined) updateValues.ldApplicable = data.ldApplicable;
        if (data.maxLd !== undefined) updateValues.maxLd = data.maxLd;
        if (data.ldStartDate !== undefined) updateValues.ldStartDate = data.ldStartDate;
        if (data.maxLdDate !== undefined) updateValues.maxLdDate = data.maxLdDate;
        if (data.isPbgApplicable !== undefined) updateValues.isPbgApplicable = data.isPbgApplicable;
        if (data.filledBgFormat !== undefined) updateValues.filledBgFormat = data.filledBgFormat;
        if (data.pbgBgId !== undefined) updateValues.pbgBgId = data.pbgBgId;
        if (data.isContractAgreement !== undefined) updateValues.isContractAgreement = data.isContractAgreement;
        if (data.contractAgreementFormat !== undefined) updateValues.contractAgreementFormat = data.contractAgreementFormat;
        if (data.detailedPoApplicable !== undefined) updateValues.detailedPoApplicable = data.detailedPoApplicable;
        if (data.detailedPoFollowupId !== undefined) updateValues.detailedPoFollowupId = data.detailedPoFollowupId;
        break;

      case 3:
        if (data.swotStrengths !== undefined) updateValues.swotStrengths = data.swotStrengths;
        if (data.swotWeaknesses !== undefined) updateValues.swotWeaknesses = data.swotWeaknesses;
        if (data.swotOpportunities !== undefined) updateValues.swotOpportunities = data.swotOpportunities;
        if (data.swotThreats !== undefined) updateValues.swotThreats = data.swotThreats;
        break;

      case 4:
        // Handled separately in savePage4Data
        break;

      case 5:
        if (data.siteVisitNeeded !== undefined) updateValues.siteVisitNeeded = data.siteVisitNeeded;
        if (data.siteVisitPerson !== undefined) updateValues.siteVisitPerson = data.siteVisitPerson;
        if (data.documentsFromTendering !== undefined) updateValues.documentsFromTendering = data.documentsFromTendering;
        if (data.documentsNeeded !== undefined) updateValues.documentsNeeded = data.documentsNeeded;
        if (data.documentsInHouse !== undefined) updateValues.documentsInHouse = data.documentsInHouse;
        break;

      case 6:
        if (data.costingSheetLink !== undefined) updateValues.costingSheetLink = data.costingSheetLink || null;
        if (data.hasDiscrepancies !== undefined) updateValues.hasDiscrepancies = data.hasDiscrepancies;
        if (data.discrepancyComments !== undefined) updateValues.discrepancyComments = data.discrepancyComments;
        if (data.budgetPreGst !== undefined) updateValues.budgetPreGst = data.budgetPreGst;
        if (data.budgetSupply !== undefined) updateValues.budgetSupply = data.budgetSupply;
        if (data.budgetService !== undefined) updateValues.budgetService = data.budgetService;
        if (data.budgetFreight !== undefined) updateValues.budgetFreight = data.budgetFreight;
        if (data.budgetAdmin !== undefined) updateValues.budgetAdmin = data.budgetAdmin;
        if (data.budgetBuybackSale !== undefined) updateValues.budgetBuybackSale = data.budgetBuybackSale;
        break;

      case 7:
        if (data.oeWoAmendmentNeeded !== undefined) updateValues.oeWoAmendmentNeeded = data.oeWoAmendmentNeeded;
        if (data.oeSignaturePrepared !== undefined) updateValues.oeSignaturePrepared = data.oeSignaturePrepared;
        if (data.courierRequestPrepared !== undefined) updateValues.courierRequestPrepared = data.courierRequestPrepared;
        break;
    }
  }

  private async savePage4Data(woDetailId: number, data: SavePage4Dto) {
    const now = new Date();

    // Handle Billing BOQ
    if (data.billingBoq !== undefined) {
      // Delete existing
      await this.db.delete(woBillingBoq).where(eq(woBillingBoq.woDetailId, woDetailId));

      // Insert new
      if (data.billingBoq.length > 0) {
        const billingItems = data.billingBoq.map((item, index) => ({
          woDetailId,
          srNo: item.srNo,
          itemDescription: item.itemDescription,
          quantity: item.quantity,
          rate: item.rate,
          amount: (parseFloat(item.quantity) * parseFloat(item.rate)).toFixed(2),
          sortOrder: item.sortOrder ?? index + 1,
          createdAt: now,
          updatedAt: now,
        }));
        await this.db.insert(woBillingBoq).values(billingItems);
      }
    }

    // Handle Buyback BOQ
    if (data.buybackBoq !== undefined) {
      await this.db.delete(woBuybackBoq).where(eq(woBuybackBoq.woDetailId, woDetailId));

      if (data.buybackBoq.length > 0) {
        const buybackItems = data.buybackBoq.map((item, index) => ({
          woDetailId,
          srNo: item.srNo,
          itemDescription: item.itemDescription,
          quantity: item.quantity,
          rate: item.rate,
          amount: (parseFloat(item.quantity) * parseFloat(item.rate)).toFixed(2),
          sortOrder: item.sortOrder ?? index + 1,
          createdAt: now,
          updatedAt: now,
        }));
        await this.db.insert(woBuybackBoq).values(buybackItems);
      }
    }

    // Handle Billing Addresses
    if (data.billingAddresses !== undefined) {
      await this.db.delete(woBillingAddresses).where(eq(woBillingAddresses.woDetailId, woDetailId));

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
      await this.db.delete(woShippingAddresses).where(eq(woShippingAddresses.woDetailId, woDetailId));

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

  private isChecklistComplete(checklist: TenderDocumentsChecklist | null): boolean {
    if (!checklist) return false;
    return TENDER_CHECKLIST_ITEMS.every((key) => checklist[key] === true);
  }

  private getIncompleteChecklistItems(checklist: TenderDocumentsChecklist | null): string[] {
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
    const conditions: any[] = [];
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
      .leftJoin(woBasicDetails, eq(woDetails.woBasicDetailId, woBasicDetails.id))
      .where(whereClause);

    const acceptedCount = summary?.accepted ?? 0;
    const amendmentNeededCount = summary?.amendmentNeeded ?? 0;
    const totalCount = summary?.total ?? 0;
    const pendingCount = Math.max(0, totalCount - acceptedCount - amendmentNeededCount);

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
