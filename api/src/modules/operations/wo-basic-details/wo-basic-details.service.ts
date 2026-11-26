import { items, locations, organizations, projects, teams, tenderClients, tenderCostingDetails, tenderCostingSheets, tenderInformation, tenderInfos, tenderResults } from '@/db/schemas';
import { AppLogger } from '@/logger/app-logger.service';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { CashFlowService } from '@/modules/operations/cash-flows/cash-flow.service';
import { OperationNotificationService } from '@/modules/operations/operation-notification.service';
import { PaymentRequestService } from '@/modules/operations/payment-requests/payment-request.service';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import type { DbInstance } from '@db';
import { DRIZZLE } from '@db/database.module';
import { users } from '@db/schemas/auth/users.schema';
import { woBasicDetails, woContacts, woDetails, woOrderRevisions } from '@db/schemas/operations';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { AssignOeDto, BatchCreateWoBasicDetailDto, BulkAssignOeDto, CreateWoBasicDetailDto, RemoveOeAssignmentDto, ReviseOrderDto, UpdateWoBasicDetailDto, WoBasicDetailsQueryDto } from './dto/wo-basic-details.dto';
import { computeGemChargesBreakdown, gemBreakdownToDbColumns } from './helpers/gem-charges.helper';
const GEM_WEBSITE_ID = 5;

const oeFirstUser = alias(users, 'oeFirstUser');
const oeSiteVisitUser = alias(users, 'oeSiteVisitUser');
const oeDocsPrepUser = alias(users, 'oeDocsPrepUser');

export type WoBasicDetailRow = typeof woBasicDetails.$inferSelect;

@Injectable()
export class WoBasicDetailsService {
    private readonly logger;

    constructor(
        private readonly appLogger: AppLogger,
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly paymentRequestService: PaymentRequestService,
        private readonly cashFlowService: CashFlowService,
        private readonly operationNotifications: OperationNotificationService,
    ) {
        this.logger = this.appLogger.withContext(WoBasicDetailsService.name);
    }

    private parseUploadArray(value?: string | null): string[] | null {
        if (!value) return null;
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed.filter(Boolean) : null;
        } catch {
            return null;
        }
    }

    private mapCreateToDb(data: CreateWoBasicDetailDto) {
        const now = new Date();
        const out: Record<string, any> = {
            tenderId: data.tenderId ?? null,
            enquiryId: data.enquiryId ?? null,
            woNumber: data.woNumber ?? null,
            woDate: data.woDate ?? null,
            projectCode: data.projectCode ?? '',
            projectName: data.projectName ?? null,
            currentStage: data.currentStage ?? 'basic_details',
            woValuePreGst: data.woValuePreGst ?? null,
            woValueGstAmt: data.woValueGstAmt ?? null,
            receiptPreGst: data.receiptPreGst ?? null,
            budgetPreGst: data.budgetPreGst ?? null,
            grossMargin: data.grossMargin ?? null,
            finalPrice: data.finalPrice ?? null,
            budgetSupply: data.budgetSupply ?? null,
            budgetService: data.budgetService ?? null,
            budgetFreight: data.budgetFreight ?? null,
            budgetAdmin: data.budgetAdmin ?? null,
            budgetBuybackSale: data.budgetBuybackSale ?? null,
            budgetGemCharges: data.budgetGemCharges ?? null,
            ...(Number(data.gemChargesAmount) > 0
                ? gemBreakdownToDbColumns(data.gemChargesAmount)
                : {
                      gemChargesPreGstAmount: null,
                      gemChargesGstAmount: null,
                      gemChargesTotalPayable: null,
                      gemChargesTdsAmount: null,
                      gemChargesNetPayable: null,
                  }),
            woDraft: data.woDraft ?? null,
            teChecklistConfirmed: data.teChecklistConfirmed ?? false,
            tmsDocuments: data.tmsDocuments ?? null,
            orderType: data.orderType ?? 'single',
            orderSequence: data.orderSequence ?? 1,
            orderNature: data.orderNature ?? null,
            poReceivedStatus: data.poReceivedStatus ?? null,
            sapPoUpload: this.parseUploadArray(data.sapPoUpload),
            isWorkflowPaused: false,
            createdAt: now,
            updatedAt: now,
        };
        return out as Partial<typeof woBasicDetails.$inferInsert>;
    }

    private mapUpdateToDb(data: UpdateWoBasicDetailDto) {
        const out: Record<string, unknown> = { updatedAt: new Date() };

        if (data.woNumber !== undefined) out.woNumber = data.woNumber;
        if (data.woDate !== undefined) out.woDate = data.woDate;
        if (data.projectCode !== undefined) out.projectCode = data.projectCode;
        if (data.projectName !== undefined) out.projectName = data.projectName;
        if (data.currentStage !== undefined) out.currentStage = data.currentStage;
        if (data.woValuePreGst !== undefined) out.woValuePreGst = data.woValuePreGst;
        if (data.woValueGstAmt !== undefined) out.woValueGstAmt = data.woValueGstAmt;
        if (data.receiptPreGst !== undefined) out.receiptPreGst = data.receiptPreGst;
        if (data.budgetPreGst !== undefined) out.budgetPreGst = data.budgetPreGst;
        if (data.grossMargin !== undefined) out.grossMargin = data.grossMargin;
        if (data.finalPrice !== undefined) out.finalPrice = data.finalPrice;
        if (data.budgetSupply !== undefined) out.budgetSupply = data.budgetSupply;
        if (data.budgetService !== undefined) out.budgetService = data.budgetService;
        if (data.budgetFreight !== undefined) out.budgetFreight = data.budgetFreight;
        if (data.budgetAdmin !== undefined) out.budgetAdmin = data.budgetAdmin;
        if (data.budgetBuybackSale !== undefined) out.budgetBuybackSale = data.budgetBuybackSale;
        if (data.budgetGemCharges !== undefined) out.budgetGemCharges = data.budgetGemCharges;
        if (data.gemChargesAmount !== undefined) {
            if (Number(data.gemChargesAmount) > 0) {
                Object.assign(out, gemBreakdownToDbColumns(data.gemChargesAmount));
            } else {
                out.gemChargesPreGstAmount = null;
                out.gemChargesGstAmount = null;
                out.gemChargesTotalPayable = null;
                out.gemChargesTdsAmount = null;
                out.gemChargesNetPayable = null;
            }
        }
        if (data.woDraft !== undefined) out.woDraft = data.woDraft;
        if (data.teChecklistConfirmed !== undefined) out.teChecklistConfirmed = data.teChecklistConfirmed;
        if (data.tmsDocuments !== undefined) out.tmsDocuments = data.tmsDocuments;
        if (data.orderType !== undefined) out.orderType = data.orderType;
        if (data.orderSequence !== undefined) out.orderSequence = data.orderSequence;
        if (data.orderNature !== undefined) out.orderNature = data.orderNature;
        if (data.poReceivedStatus !== undefined) out.poReceivedStatus = data.poReceivedStatus;
        if (data.sapPoUpload !== undefined) out.sapPoUpload = this.parseUploadArray(data.sapPoUpload);

        return out as any;
    }

    private mapRowToResponse(row: WoBasicDetailRow) {
        return {
            id: row.id,
            tenderId: row.tenderId,
            enquiryId: row.enquiryId,
            team: row.team,
            woNumber: row.woNumber,
            woDate: row.woDate,
            projectCode: row.projectCode,
            projectName: row.projectName,
            currentStage: row.currentStage,
            orderType: row.orderType,
            orderSequence: row.orderSequence,
            orderNature: row.orderNature,
            poReceivedStatus: row.poReceivedStatus,
            sapPoUpload: row.sapPoUpload ?? null,
            woValuePreGst: row.woValuePreGst,
            woValueGstAmt: row.woValueGstAmt,
            receiptPreGst: row.receiptPreGst,
            budgetPreGst: row.budgetPreGst,
            grossMargin: row.grossMargin,
            finalPrice: row.finalPrice,
            budgetSupply: row.budgetSupply,
            budgetService: row.budgetService,
            budgetFreight: row.budgetFreight,
            budgetAdmin: row.budgetAdmin,
            budgetBuybackSale: row.budgetBuybackSale,
            budgetGemCharges: row.budgetGemCharges,
            gemChargesPreGstAmount: row.gemChargesPreGstAmount,
            gemChargesGstAmount: row.gemChargesGstAmount,
            gemChargesTotalPayable: row.gemChargesTotalPayable,
            gemChargesTdsAmount: row.gemChargesTdsAmount,
            gemChargesNetPayable: row.gemChargesNetPayable,
            woDraft: row.woDraft,
            tmsDocuments: row.tmsDocuments,
            oeFirst: row.oeFirst,
            oeFirstAssignedAt: row.oeFirstAssignedAt,
            oeFirstAssignedBy: row.oeFirstAssignedBy,
            oeSiteVisit: row.oeSiteVisit,
            oeSiteVisitAssignedAt: row.oeSiteVisitAssignedAt,
            oeSiteVisitAssignedBy: row.oeSiteVisitAssignedBy,
            oeDocsPrep: row.oeDocsPrep,
            oeDocsPrepAssignedAt: row.oeDocsPrepAssignedAt,
            oeDocsPrepAssignedBy: row.oeDocsPrepAssignedBy,
            isWorkflowPaused: row.isWorkflowPaused,
            workflowPausedAt: row.workflowPausedAt,
            workflowResumedAt: row.workflowResumedAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    private mapJoinedRowToResponseList(row: any) {
        return {
            id: row.woBasicDetails.id,
            projectId: row.woBasicDetails.projectId,
            woDetailId: row.woDetails?.id ?? null,
            woNumber: row.woBasicDetails.woNumber,
            woDate: row.woBasicDetails.woDate,
            projectName: row.woBasicDetails.projectName ?? row.tenderInfos?.tenderName ?? null,
            currentStage: row.woBasicDetails.currentStage,
            orderType: row.woBasicDetails.orderType,
            orderSequence: row.woBasicDetails.orderSequence,
            orderNature: row.woBasicDetails.orderNature,
            poReceivedStatus: row.woBasicDetails.poReceivedStatus,
            woValuePreGst: row.woBasicDetails.woValuePreGst,
            woValueGstAmt: row.woBasicDetails.woValueGstAmt,
            grossMargin: row.woBasicDetails.grossMargin,
            stage: row.woBasicDetails.currentStage,
            oeFirstName: row.oeFirstUser?.name ?? null,
            oeSiteVisitName: row.oeSiteVisitUser?.name ?? null,
            oeDocsPrepName: row.oeDocsPrepUser?.name ?? null,
            currentPage: row.woDetails?.currentPage ?? null,
            completedPages: row.woDetails?.completedPages ?? null,
            skippedPages: row.woDetails?.skippedPages ?? null,
            woDetailsStatus: row.woDetails?.status ?? null,
        };
    }

    private getWoBaseSelect() {
        return {
            woBasicDetails: {
                id: woBasicDetails.id,
                tenderId: woBasicDetails.tenderId,
                projectId: sql<number | null>`(select ${projects.id} from ${projects} where ${projects.woBasicDetailId} = ${woBasicDetails.id} limit 1)::int`,
                woNumber: woBasicDetails.woNumber,
                woDate: woBasicDetails.woDate,
                projectName: woBasicDetails.projectName,
                currentStage: woBasicDetails.currentStage,
                orderType: woBasicDetails.orderType,
                orderSequence: woBasicDetails.orderSequence,
                orderNature: woBasicDetails.orderNature,
                poReceivedStatus: woBasicDetails.poReceivedStatus,
                woValuePreGst: woBasicDetails.woValuePreGst,
                woValueGstAmt: woBasicDetails.woValueGstAmt,
                grossMargin: woBasicDetails.grossMargin,
                stage: woBasicDetails.currentStage,
            },
            woDetails: {
                id: woDetails.id,
                currentPage: woDetails.currentPage,
                completedPages: woDetails.completedPages,
                skippedPages: woDetails.skippedPages,
                status: woDetails.status,
            },
            oeFirstUser: {
                name: oeFirstUser.name,
            },
            oeSiteVisitUser: {
                name: oeSiteVisitUser.name,
            },
            oeDocsPrepUser: {
                name: oeDocsPrepUser.name,
            },
            tenderInfos: {
                tenderName: tenderInfos.tenderName,
            }
        };
    }

    private getBaseQueryBuilder() {
        return this.db.select(this.getWoBaseSelect()).from(woBasicDetails)
            .leftJoin(woDetails, eq(woDetails.woBasicDetailId, woBasicDetails.id))
            .leftJoin(oeFirstUser, eq(oeFirstUser.id, woBasicDetails.oeFirst))
            .leftJoin(oeSiteVisitUser, eq(oeSiteVisitUser.id, woBasicDetails.oeSiteVisit))
            .leftJoin(oeDocsPrepUser, eq(oeDocsPrepUser.id, woBasicDetails.oeDocsPrep))
            .leftJoin(tenderInfos, eq(tenderInfos.id, woBasicDetails.tenderId));
    }

    async findAll(filters?: WoBasicDetailsQueryDto) {
        const page = filters?.page ?? 1;
        const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
        const offset = (page - 1) * limit;
        const sortOrder = filters?.sortOrder ?? 'desc';
        const sortBy = filters?.sortBy ?? 'createdAt';
        const search = filters?.search?.trim();

        // Resolve tab to backend filters
        const tab = filters?.tab;
        const currentStage = filters?.currentStage;

        if (tab && !['basic_details', 'wo_details', 'completed'].includes(tab)) {
            throw new BadRequestException(`Invalid tab: ${tab}`);
        }

        // 1. Build Conditions
        const conditions: any[] = [];

        // Apply role-based filtering
        if (filters?.user) {
            conditions.push(...this.buildRoleFilterConditions(filters.user, filters.teamId));
        }

        if (currentStage) {
            conditions.push(eq(woBasicDetails.currentStage, currentStage));
        } else if (tab) {
            if (tab === 'basic_details') {
                // Keep rows here until all seven WO Details steps are submitted.
                conditions.push(
                    sql`${woBasicDetails.currentStage} is distinct from 'completed'`,
                    or(
                        isNull(woDetails.id),
                        sql`${woDetails.status} is distinct from 'wo_details_filled'`,
                    ),
                );
            } else if (tab === 'completed') {
                conditions.push(eq(woBasicDetails.currentStage, 'completed'));
            } else if (tab === 'wo_details') {
                // Only show rows whose 7-step WO Details form has been submitted.
                conditions.push(
                    sql`${woBasicDetails.currentStage} is distinct from 'completed'`,
                    eq(woDetails.status, 'wo_details_filled'),
                );
            }
        }

        // Search condition (Expanded to joined fields)
        if (search) {
            const searchStr = `%${search}%`;
            conditions.push(
                or(
                    ilike(woBasicDetails.projectName, searchStr),
                    ilike(woBasicDetails.woNumber, searchStr),
                    ilike(woBasicDetails.projectCode, searchStr),
                    ilike(oeFirstUser.name, searchStr),
                    ilike(oeSiteVisitUser.name, searchStr),
                    ilike(oeDocsPrepUser.name, searchStr),
                    ilike(tenderInfos.tenderName, searchStr),
                ),
            );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // 2. Get Total Count
        let countQuery: any = this.db
            .select({ count: sql<number>`count(distinct ${woBasicDetails.id})::int` })
            .from(woBasicDetails)
            .leftJoin(woDetails, eq(woDetails.woBasicDetailId, woBasicDetails.id));

        // Add joins if search is being used (searches in joined tables)
        if (search) {
            countQuery = countQuery
                .leftJoin(oeFirstUser, eq(oeFirstUser.id, woBasicDetails.oeFirst))
                .leftJoin(oeSiteVisitUser, eq(oeSiteVisitUser.id, woBasicDetails.oeSiteVisit))
                .leftJoin(oeDocsPrepUser, eq(oeDocsPrepUser.id, woBasicDetails.oeDocsPrep))
                .leftJoin(tenderInfos, eq(tenderInfos.id, woBasicDetails.tenderId));
        }

        const [countResult] = await countQuery.where(whereClause);
        const total = Number(countResult?.count || 0);

        // 3. Determine sorting
        const orderFn = sortOrder === 'desc' ? desc : asc;
        let orderByClause: any;

        switch (sortBy) {
            case 'woDate':
                orderByClause = orderFn(woBasicDetails.woDate);
                break;
            case 'woNumber':
                orderByClause = orderFn(woBasicDetails.woNumber);
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
            case 'grossMargin':
                orderByClause = orderFn(woBasicDetails.grossMargin);
                break;
            case 'oeFirstName':
                orderByClause = orderFn(oeFirstUser.name);
                break;
            case 'oeSiteVisitName':
                orderByClause = orderFn(oeSiteVisitUser.name);
                break;
            case 'oeDocsPrepName':
                orderByClause = orderFn(oeDocsPrepUser.name);
                break;
            case 'currentStage':
                orderByClause = orderFn(woBasicDetails.currentStage);
                break;
            default:
                orderByClause = orderFn(woBasicDetails.createdAt);
        }

        // 4. Get Data
        const rows = await this.getBaseQueryBuilder()
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        const data = rows.map((r) => this.mapJoinedRowToResponseList(r));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    async findById(id: number) {
        const [row] = await this.db
            .select()
            .from(woBasicDetails)
            .where(eq(woBasicDetails.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`WO Basic Detail with ID ${id} not found`);
        }

        const response = this.mapRowToResponse(row);
        const gemCharges = await this.getGemCharges(id, row);
        return { ...response, ...gemCharges };
    }

    /**
     * Loads the auto-created GeM charges project payment request for a WO Basic Detail
     * so it can be preloaded into the edit form and reconciled on update.
     *
     * The breakdown is persisted on the WO Basic Detail. Legacy rows (created before
     * the breakdown columns existed) fall back to treating the stored payment request
     * amount as the pre-GST amount, which matches the old semantics.
     */
    private async getGemCharges(woBasicDetailId: number, row?: WoBasicDetailRow) {
        const [project] = await this.db
            .select({ id: projects.id })
            .from(projects)
            .where(eq(projects.woBasicDetailId, woBasicDetailId))
            .limit(1);

        if (!project) {
            return {
                gemChargesAmount: null,
                gemChargesGstAmount: null,
                gemChargesTotalPayable: null,
                gemChargesTdsAmount: null,
                gemChargesNetPayable: null,
                gemChargesPortalLink: null,
                gemChargesInvoice: null,
            };
        }

        const requests = await this.paymentRequestService.getByProject(project.id);
        const gemRequest: any = requests.find((r: any) => r.paymentAgainst === 'gem_charges') ?? null;

        const storedPreGst = row?.gemChargesPreGstAmount != null ? Number(row.gemChargesPreGstAmount) : null;
        const legacyPreGst = gemRequest?.amount != null ? Number(gemRequest.amount) : null;
        const preGst = storedPreGst != null ? storedPreGst : legacyPreGst;

        const breakdown = preGst != null && preGst > 0 ? computeGemChargesBreakdown(preGst) : null;

        return {
            gemChargesAmount: breakdown?.preGst ?? null,
            gemChargesGstAmount: breakdown?.gstAmount ?? null,
            gemChargesTotalPayable: breakdown?.totalPayable ?? null,
            gemChargesTdsAmount: breakdown?.tdsAmount ?? null,
            gemChargesNetPayable: breakdown?.netPayable ?? null,
            gemChargesPortalLink: gemRequest?.portalLink ?? null,
            gemChargesInvoice: gemRequest?.billFiles ? JSON.stringify(gemRequest.billFiles) : null,
        };
    }

    async findByIdWithRelations(id: number) {
        const [row] = await this.db
            .select()
            .from(woBasicDetails)
            .where(eq(woBasicDetails.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`WO Basic Detail with ID ${id} not found`);
        }

        // Fetch related contacts
        const contacts = await this.db
            .select()
            .from(woContacts)
            .where(eq(woContacts.woBasicDetailId, id));

        // Fetch related WO details
        const [woDetail] = await this.db
            .select()
            .from(woDetails)
            .where(eq(woDetails.woBasicDetailId, id))
            .limit(1);

        return {
            ...this.mapRowToResponse(row),
            contacts,
            woDetail: woDetail ?? null,
        };
    }

    async create(data: CreateWoBasicDetailDto, userId?: number) {
        // Check if project code already exists (if provided)
        if (data.projectCode) {
            const existing = await this.checkProjectCodeExists(data.projectCode);
            if (existing.exists) {
                throw new ConflictException(`Project code ${data.projectCode} already exists`);
            }
        }

        let teamId: number | null = null;
        let prevStatus: number | null = null;
        let organizationId: number | null = data.organizationId ?? null;

        if (data.tenderId) {
            const [tender] = await this.db
                .select({
                    teamId: tenderInfos.team,
                    status: tenderInfos.status,
                    organizationId: tenderInfos.organization,
                })
                .from(tenderInfos)
                .where(eq(tenderInfos.id, data.tenderId))
                .limit(1);

            if (!tender) {
                this.logger.error(`Tender with ID ${data.tenderId} not found, skipping project creation`);
                return;
            }

            teamId = tender.teamId;
            prevStatus = tender.status;
            organizationId = tender.organizationId ?? organizationId;
        } else if (data.teamId) {
            // For non-tender WOs, use the provided teamId directly
            teamId = data.teamId;
        }

        const insertValues = this.mapCreateToDb(data);

        if (userId) {
            insertValues.createdBy = userId;
            insertValues.updatedBy = userId;
            insertValues.team = teamId;
        }

        // Auto-append (N) suffix when the same project name already exists
        if (insertValues.projectName) {
            const nameCheck = await this.checkProjectNameExists(insertValues.projectName, insertValues.team ?? teamId ?? undefined);
            if (nameCheck.exists && nameCheck.suggestion) {
                insertValues.projectName = nameCheck.suggestion;
            }
        }

        const orderType = data.orderType ?? 'single';

        // Allocate the next sequence and insert atomically so concurrent creates
        // cannot reuse the same order number. max+1 (rather than count+1) also
        // avoids repeating a sequence after an earlier order was deleted.
        const [row] = await this.db.transaction(async (tx) => {
            let existingOrders = 0;

            if (data.tenderId) {
                const [countRow] = await tx
                    .select({ existingOrders: sql<number>`count(*)::int` })
                    .from(woBasicDetails)
                    .where(eq(woBasicDetails.tenderId, data.tenderId));
                existingOrders = countRow?.existingOrders ?? 0;

                if (existingOrders > 0) {
                    // Additional orders are only allowed once the tender is won.
                    const [latestResult] = await tx
                        .select({ status: tenderResults.status })
                        .from(tenderResults)
                        .where(eq(tenderResults.tenderId, data.tenderId))
                        .orderBy(desc(tenderResults.createdAt))
                        .limit(1);

                    if ((latestResult?.status ?? '').trim().toLowerCase() !== 'won') {
                        throw new BadRequestException(
                            'A new order can only be added to a won tender.',
                        );
                    }

                    if (orderType === 'single') {
                        throw new BadRequestException(
                            'This tender already has orders. Add the next order as Repeat or Multiple.',
                        );
                    }
                }
            }

            if (orderType !== 'single' && data.tenderId) {
                const [{ maxSequence }] = await tx
                    .select({ maxSequence: sql<number | null>`max(${woBasicDetails.orderSequence})::int` })
                    .from(woBasicDetails)
                    .where(eq(woBasicDetails.tenderId, data.tenderId));
                insertValues.orderType = orderType;
                insertValues.orderSequence = (maxSequence ?? 0) + 1;
            } else {
                insertValues.orderType = orderType;
                insertValues.orderSequence = insertValues.orderSequence ?? 1;
            }

            const [inserted] = await tx
                .insert(woBasicDetails)
                .values(insertValues)
                .returning();

            return [inserted] as const;
        });

        // Update tender status to 26 (Wo Basic detail filled) after successful creation
        if (data.tenderId && userId) {
            const newStatus = 26;
            await this.db
                .update(tenderInfos)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(tenderInfos.id, data.tenderId));

            // Track status change
            await this.tenderStatusHistoryService.trackStatusChange(
                data.tenderId,
                newStatus,
                userId,
                prevStatus,
                "WO Basic Details created"
            );
        }

        // Send WhatsApp notification to the WORKORDER group (non-blocking)
        if (row) {
            this.notifyWoBasicDetailsWhatsapp(row, 'created', { organizationId });
        }

        // Create Project asynchronously (non-blocking)
        this.safeCreateProject(data, row?.id, userId, insertValues.projectName ?? null);

        return this.mapRowToResponse(row!);
    }

    async createBatch(data: BatchCreateWoBasicDetailDto, userId?: number) {
        if (data.orderType === 'single' && data.orders.length !== 1) {
            throw new BadRequestException('A single order must contain exactly one row.');
        }

        let teamId: number | null = data.teamId ?? null;
        let itemId: number | null = data.itemId ?? null;
        let locationId: number | null = data.locationId ?? null;
        let organizationId: number | null = data.organizationId ?? null;
        let prevStatus: number | null = null;

        if (data.tenderId) {
            const [tender] = await this.db
                .select({
                    teamId: tenderInfos.team,
                    itemId: tenderInfos.item,
                    locationId: tenderInfos.location,
                    organizationId: tenderInfos.organization,
                    status: tenderInfos.status,
                })
                .from(tenderInfos)
                .where(eq(tenderInfos.id, data.tenderId))
                .limit(1);

            if (!tender) throw new NotFoundException(`Tender with ID ${data.tenderId} not found`);

            teamId = tender.teamId;
            itemId = tender.itemId;
            locationId = tender.locationId;
            organizationId = tender.organizationId ?? organizationId;
            prevStatus = tender.status;

            if (!itemId) {
                throw new BadRequestException('Cannot create projects: tender item is missing.');
            }

            const [{ existingOrders }] = await this.db
                .select({ existingOrders: sql<number>`count(*)::int` })
                .from(woBasicDetails)
                .where(eq(woBasicDetails.tenderId, data.tenderId));

            if ((existingOrders ?? 0) > 0) {
                const [latestResult] = await this.db
                    .select({ status: tenderResults.status })
                    .from(tenderResults)
                    .where(eq(tenderResults.tenderId, data.tenderId))
                    .orderBy(desc(tenderResults.createdAt))
                    .limit(1);

                if ((latestResult?.status ?? '').trim().toLowerCase() !== 'won') {
                    throw new BadRequestException('A new order can only be added to a won tender.');
                }

                if (data.orderType === 'single') {
                    throw new BadRequestException(
                        'This tender already has orders. Add the next order as Repeat or Multiple.',
                    );
                }
            }
        }

        const teamName = await this.getTeamName(teamId);

        const created = await this.db.transaction(async (tx) => {
            const [{ maxSequence }] = await tx
                .select({ maxSequence: sql<number | null>`max(${woBasicDetails.orderSequence})::int` })
                .from(woBasicDetails)
                .where(data.tenderId
                    ? eq(woBasicDetails.tenderId, data.tenderId)
                    : sql`1 = 0`);

            const startSequence = (maxSequence ?? 0) + 1;
            const results: Array<{ basic: WoBasicDetailRow; projectId: number }> = [];

            for (const [index, order] of data.orders.entries()) {
                const sequence = startSequence + index;
                const insertValues = this.mapCreateToDb({
                    tenderId: data.tenderId,
                    teamId: teamId ?? undefined,
                    organizationId: organizationId ?? undefined,
                    itemId: itemId ?? undefined,
                    locationId: locationId ?? undefined,
                    orderType: data.orderType,
                    orderSequence: sequence,
                    orderNature: order.orderNature,
                    poReceivedStatus: order.poReceivedStatus,
                    sapPoUpload: order.sapPoUpload,
                    woNumber: order.woNumber,
                    woDate: order.woDate,
                    projectCode: order.projectCode,
                    projectName: order.projectName,
                    woValuePreGst: order.woValuePreGst,
                    woValueGstAmt: order.woValueGstAmt,
                    woDraft: order.woDraft,
                    budgetPreGst: order.budgetPreGst,
                    receiptPreGst: order.receiptPreGst,
                    grossMargin: order.grossMargin,
                    finalPrice: order.finalPrice,
                    budgetSupply: order.budgetSupply,
                    budgetService: order.budgetService,
                    budgetFreight: order.budgetFreight,
                    budgetAdmin: order.budgetAdmin,
                    budgetBuybackSale: order.budgetBuybackSale,
                    budgetGemCharges: order.requestGemCharges !== false && order.gemChargesAmount
                        ? String(order.gemChargesAmount)
                        : undefined,
                    gemChargesAmount: order.requestGemCharges !== false
                        ? order.gemChargesAmount
                        : undefined,
                    gemChargesPortalLink: order.gemChargesPortalLink,
                    gemChargesInvoice: order.gemChargesInvoice,
                    tmsDocuments: data.tmsDocuments,
                } as CreateWoBasicDetailDto);

                if (userId) {
                    insertValues.createdBy = userId;
                    insertValues.updatedBy = userId;
                    insertValues.team = teamId;
                }

                const [basic] = await tx.insert(woBasicDetails).values(insertValues).returning();

                const [project] = await tx.insert(projects).values({
                    teamName,
                    organisationId: organizationId ?? null,
                    itemId: itemId!,
                    locationId: locationId ?? null,
                    poNo: order.woNumber ?? null,
                    projectCode: order.projectCode ?? null,
                    projectName: order.projectName ?? null,
                    poUpload: order.woDraft ?? null,
                    poDate: this.parseDate(order.woDate),
                    orderNature: order.orderNature ?? null,
                    poReceivedStatus: order.poReceivedStatus ?? null,
                    sapPoUpload: this.parseUploadArray(order.sapPoUpload),
                    tenderId: data.tenderId ?? null,
                    woBasicDetailId: basic.id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                } as typeof projects.$inferInsert).returning();

                if (order.contacts?.length) {
                    await tx.insert(woContacts).values(order.contacts.map(contact => ({
                        woBasicDetailId: basic.id,
                        name: contact.name ?? null,
                        designation: contact.designation ?? null,
                        phone: (contact.phones?.[0] ?? contact.phone) ?? null,
                        phones: (contact.phones ?? (contact.phone ? [contact.phone] : [])).filter(Boolean),
                        email: contact.email ?? null,
                        organization: contact.organization ?? null,
                        departments: contact.departments ?? null,
                    })));
                }

                results.push({ basic, projectId: project.id });
            }

            return results;
        });

        if (data.tenderId && userId) {
            const newStatus = 26;
            await this.db
                .update(tenderInfos)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(tenderInfos.id, data.tenderId));

            await this.tenderStatusHistoryService.trackStatusChange(
                data.tenderId,
                newStatus,
                userId,
                prevStatus,
                'WO Basic Details batch created',
            );
        }

        // Side effects after the atomic DB commit.
        for (const [index, item] of created.entries()) {
            const order = data.orders[index];
            if (order.requestGemCharges !== false && Number(order.gemChargesAmount) > 0) {
                await this.createProjectPaymentRequest(
                    item.projectId,
                    {
                        projectName: order.projectName,
                        gemChargesAmount: order.gemChargesAmount,
                        gemChargesPortalLink: order.gemChargesPortalLink,
                        gemChargesInvoice: order.gemChargesInvoice,
                    },
                    item.basic.id,
                    userId,
                );
            }
        }

        // Notify one WhatsApp message per created order.
        for (const item of created) {
            this.notifyWoBasicDetailsWhatsapp(item.basic, 'created', { organizationId });
        }

        return created.map(({ basic, projectId }) => ({
            ...this.mapRowToResponse(basic),
            projectId,
        }));
    }

    private notifyWoBasicDetailsWhatsapp(
        row: WoBasicDetailRow,
        kind: 'created' | 'updated' | 'revised',
        options?: { organizationId?: number | null; revisionNumber?: number; revisionNotes?: string | null },
    ): void {
        void (async () => {
            let organizationId = options?.organizationId ?? null;
            let teamMemberId: number | null = null;
            if (row.tenderId) {
                const [tender] = await this.db
                    .select({
                        organizationId: tenderInfos.organization,
                        teamMemberId: tenderInfos.teamMember,
                    })
                    .from(tenderInfos)
                    .where(eq(tenderInfos.id, row.tenderId))
                    .limit(1);
                organizationId = organizationId ?? tender?.organizationId ?? null;
                teamMemberId = tender?.teamMemberId ?? null;
            }

            let organizationName: string | null = null;
            if (organizationId) {
                const [org] = await this.db
                    .select({ name: organizations.name, acronym: organizations.acronym })
                    .from(organizations)
                    .where(eq(organizations.id, organizationId))
                    .limit(1);
                organizationName = org?.name?.trim() || org?.acronym?.trim() || null;
            }

            const actorId = kind === 'created' ? row.createdBy : row.updatedBy;
            let actorName: string | null = null;
            let teamMemberName: string | null = null;
            const userIds = [actorId, teamMemberId].filter((v): v is number => v != null);
            if (userIds.length > 0) {
                const userRows = await this.db
                    .select({ id: users.id, name: users.name })
                    .from(users)
                    .where(inArray(users.id, userIds));
                const nameById = new Map(userRows.map((u) => [u.id, u.name]));
                actorName = actorId != null ? nameById.get(actorId) ?? null : null;
                teamMemberName = teamMemberId != null ? nameById.get(teamMemberId) ?? null : null;
            }

            const payload = {
                woBasicDetailId: row.id,
                organizationName,
                projectName: row.projectName,
                projectCode: row.projectCode,
                woValuePreGst: row.woValuePreGst,
                actorName,
                teamMemberName,
            };

            switch (kind) {
                case 'created':
                    await this.operationNotifications.notifyWoBasicDetailsCreated(payload);
                    break;
                case 'updated':
                    await this.operationNotifications.notifyWoBasicDetailsUpdated(payload);
                    break;
                case 'revised':
                    await this.operationNotifications.notifyWoBasicDetailsRevised({
                        ...payload,
                        revisionNumber: options?.revisionNumber ?? 1,
                        revisionNotes: options?.revisionNotes ?? null,
                    });
                    break;
            }
        })().catch((error: unknown) => {
            this.logger.error(
                `Failed to send WO basic details WhatsApp notification for WO basic detail ${row.id}: ${error instanceof Error ? error.message : String(error)}`,
            );
        });
    }

    private async safeCreateProject(data: CreateWoBasicDetailDto, woBasicDetailId?: number, currentUserId?: number, actualProjectName?: string | null): Promise<void> {
        if (!woBasicDetailId) return;

        setImmediate(async () => {
            try {
                let teamId: number | null = null;
                let itemId: number | null = null;
                let locationId: number | null = null;
                let organisationId: number | null = null;

                // Fetch details from tender or use DTO-provided values (non-tender)
                if (data.tenderId) {
                    const [tender] = await this.db
                        .select({
                            teamId: tenderInfos.team,
                            itemId: tenderInfos.item,
                            locationId: tenderInfos.location,
                            organisationId: tenderInfos.organization,
                        })
                        .from(tenderInfos)
                        .where(eq(tenderInfos.id, data.tenderId))
                        .limit(1);

                    if (!tender) {
                        this.logger.error(`Tender with ID ${data.tenderId} not found, skipping project creation`);
                        return;
                    }

                    teamId = tender.teamId;
                    itemId = tender.itemId;
                    locationId = tender.locationId;
                    organisationId = tender.organisationId;
                } else {
                    // Non-tender WO: use values provided directly in the DTO
                    teamId = data.teamId ?? null;
                    itemId = data.itemId ?? null;
                    locationId = data.locationId ?? null;
                    organisationId = data.organizationId ?? null;
                }

                // Validate required field
                if (!itemId) {
                    this.logger.error(`Cannot create project: itemId is required for WO Basic Detail: ${woBasicDetailId}`);
                    return;
                }

                // Get team name
                const teamName = await this.getTeamName(teamId);

                // Skip if project already exists
                if (data.projectCode) {
                    const exists = await this.projectCodeExists(data.projectCode);
                    if (exists) {
                        this.logger.warn(`Project ${data.projectCode} already exists, skipping`);
                        return;
                    }
                }

                const now = new Date();

                const [project] = await this.db.insert(projects).values({
                    teamName,
                    organisationId: organisationId ?? null,
                    itemId: itemId,
                    locationId: locationId ?? null,
                    poNo: data.woNumber ?? null,
                    projectCode: data.projectCode ?? null,
                    projectName: actualProjectName ?? data.projectName ?? null,
                    poUpload: data.woDraft ?? null,
                    poDate: this.parseDate(data.woDate),
                    orderNature: data.orderNature ?? null,
                    poReceivedStatus: data.poReceivedStatus ?? null,
                    sapPoUpload: this.parseUploadArray(data.sapPoUpload),
                    performanceProof: null,
                    performanceDate: null,
                    completionProof: null,
                    completionDate: null,
                    sapPoDate: null,
                    sapPoNo: null,
                    tenderId: data.tenderId ?? null,
                    enquiryId: data.enquiryId ?? null,
                    woBasicDetailId: woBasicDetailId ?? null,
                    createdAt: now,
                    updatedAt: now,
                } as typeof projects.$inferInsert).returning();

                this.logger.log(`Project created for WO Basic Detail: ${woBasicDetailId}`);

                // Create EMD cash flow if tenderId is present and has valid EMD
                if (project.tenderId && data.tenderId) {
                    try {
                        const [tender] = await this.db
                            .select({
                                emd: tenderInfos.emd,
                                teamMember: tenderInfos.teamMember,
                                tenderNo: tenderInfos.tenderNo,
                            })
                            .from(tenderInfos)
                            .where(eq(tenderInfos.id, data.tenderId))
                            .limit(1);

                        if (tender && tender.emd && Number(tender.emd) > 0) {
                            // Check if EMD is exempt
                            const [ti] = await this.db
                                .select({ emdRequired: tenderInformation.emdRequired })
                                .from(tenderInformation)
                                .where(eq(tenderInformation.tenderId, data.tenderId))
                                .limit(1);

                            const isExempt = ti?.emdRequired === 'EXEMPT';
                            if (!isExempt && tender.teamMember) {
                                await this.cashFlowService.createEmdCashFlow(
                                    project.id,
                                    data.tenderId,
                                    Number(tender.emd),
                                    tender.teamMember,
                                    tender.tenderNo
                                );
                                this.logger.log(`EMD cash flow created for project ${project.id}, tender ${data.tenderId}`);
                            }
                        }
                    } catch (error) {
                        this.logger.warn(`Failed to create EMD cash flow for project ${project.id}: ${error instanceof Error ? error.message : String(error)}`);
                    }
                }

                // Create project payment request payload and call existing service
                await this.createProjectPaymentRequest(project.id, data, woBasicDetailId, currentUserId);
            } catch (error) {
                this.logger.error(
                    `Failed to create project for WO Basic Detail: ${woBasicDetailId}`,
                    error instanceof Error ? error.stack : String(error),
                );
            }
        });
    }

    private parseDate(dateValue: string | Date | null | undefined): Date | null {
        if (!dateValue) return null;
        if (dateValue instanceof Date) {
            return isNaN(dateValue.getTime()) ? null : dateValue;
        }
        if (typeof dateValue === 'string') {
            const parsed = new Date(dateValue);
            return isNaN(parsed.getTime()) ? null : parsed;
        }
        return null;
    }

    private async getTeamName(teamId?: number | null): Promise<string> {
        if (!teamId) return 'UNKNOWN';

        const [teamRow] = await this.db
            .select({ name: teams.name })
            .from(teams)
            .where(eq(teams.id, teamId))
            .limit(1);

        return teamRow?.name || 'UNKNOWN';
    }

    private async projectCodeExists(projectCode: string): Promise<boolean> {
        const [existing] = await this.db
            .select({ id: projects.id })
            .from(projects)
            .where(eq(projects.projectCode, projectCode))
            .limit(1);

        return !!existing;
    }

    /**
     * Create project payment request using existing payment-request.service.create() method
     */
    private async createProjectPaymentRequest(
        projectId: number,
        data: Pick<CreateWoBasicDetailDto, 'projectName' | 'gemChargesAmount' | 'gemChargesPortalLink' | 'gemChargesInvoice'>,
        woBasicDetailId?: number,
        currentUserId?: number
    ): Promise<void> {
        try {
            const breakdown = computeGemChargesBreakdown(data.gemChargesAmount);
            const amount = breakdown.netPayable;
            if (!(amount > 0)) {
                this.logger.log(`Skipping project payment request for WO Basic Detail ${woBasicDetailId}: GeM charges amount is 0`);
                return;
            }

            const gemInvoiceFiles = data.gemChargesInvoice ? JSON.parse(data.gemChargesInvoice) as string[] : [];

            const makerRequestBody: any = {
                projectId,
                projectName: data.projectName ?? null,
                amount,
                paymentAgainst: 'gem_charges',
                paymentMode: 'PORTAL',
                portalLink: data.gemChargesPortalLink || null,
                uploadedInvoiceFile: gemInvoiceFiles[0] ?? null,
                billFiles: gemInvoiceFiles,
                remark: `Auto-created from Basic Detail: ${woBasicDetailId}, for ${data.projectName}. Pre-GST ${breakdown.preGst}, GST ${breakdown.gstAmount}, Total ${breakdown.totalPayable}, TDS ${breakdown.tdsAmount}, Net payable ${breakdown.netPayable}`,
                requestedBy: currentUserId,
            };

            await this.paymentRequestService.create(makerRequestBody, currentUserId || 0);
            this.logger.log(`Created project payment request for WO Basic Detail: ${woBasicDetailId}`);
        } catch (error) {
            this.logger.warn(
                `Failed to create project payment request for WO Basic Detail: ${woBasicDetailId}`,
                error instanceof Error ? error.stack : String(error),
            );
        }
    }

    async update(id: number, data: UpdateWoBasicDetailDto, userId?: number) {
        // Check if record exists
        const existing = await this.findById(id);

        // Order type is immutable after creation; further orders are added as
        // Repeat or Multiple instead of reclassifying an existing order/project.
        if (data.orderType !== undefined && data.orderType !== existing.orderType) {
            throw new BadRequestException(
                'Order type cannot be changed after creation. Add the next order as Repeat or Multiple instead.',
            );
        }

        // Check project code uniqueness if being updated
        if (data.projectCode) {
            const existing = await this.db
                .select({ id: woBasicDetails.id })
                .from(woBasicDetails)
                .where(
                    and(
                        eq(woBasicDetails.projectCode, data.projectCode),
                        sql`${woBasicDetails.id} != ${id}`,
                    ),
                )
                .limit(1);

            if (existing.length > 0) {
                throw new ConflictException(`Project code ${data.projectCode} already exists`);
            }
        }

        const updateValues = this.mapUpdateToDb(data);
        if (userId) {
            updateValues.updatedBy = userId;
        }

        const [row] = await this.db
            .update(woBasicDetails)
            .set(updateValues)
            .where(eq(woBasicDetails.id, id))
            .returning();

        if (!row) {
            throw new NotFoundException(`WO Basic Detail with ID ${id} not found`);
        }

        const projectSync: Record<string, unknown> = { updatedAt: new Date() };
        if (data.orderNature !== undefined) projectSync.orderNature = data.orderNature;
        if (data.poReceivedStatus !== undefined) projectSync.poReceivedStatus = data.poReceivedStatus;
        if (data.sapPoUpload !== undefined) projectSync.sapPoUpload = this.parseUploadArray(data.sapPoUpload);
        if (Object.keys(projectSync).length > 1) {
            await this.db
                .update(projects)
                .set(projectSync)
                .where(eq(projects.woBasicDetailId, id));
        }

        // Send WhatsApp notification to the WORKORDER group (non-blocking)
        this.notifyWoBasicDetailsWhatsapp(row, 'updated');

        // Reconcile the auto-created GeM charges project payment request (create / update / reject)
        await this.reconcileGemChargesPaymentRequest(id, data, userId);

        return this.mapRowToResponse(row);
    }

    /**
     * Keeps the auto-created GeM charges project payment request in sync when a
     * WO Basic Detail is edited:
     * - amount > 0 and no request          -> create it
     * - amount > 0 and a pending request   -> update it in place
     * - amount > 0 and a processed request -> leave it untouched (warn)
     * - amount = 0 and a pending request   -> reject it
     * - amount = 0 and a processed request -> leave it untouched (warn)
     * - amount undefined                   -> no-op
     */
    private async reconcileGemChargesPaymentRequest(
        woBasicDetailId: number,
        data: UpdateWoBasicDetailDto,
        currentUserId?: number,
    ): Promise<void> {
        if (data.gemChargesAmount === undefined) return;

        const PENDING_STATUSES = ['pending', 'po_approval_pending'];

        try {
            const [project] = await this.db
                .select({ id: projects.id, projectName: projects.projectName })
                .from(projects)
                .where(eq(projects.woBasicDetailId, woBasicDetailId))
                .limit(1);

            if (!project) {
                this.logger.warn(`Skipping GeM charges reconciliation for WO Basic Detail ${woBasicDetailId}: no linked project found`);
                return;
            }

            const requests = await this.paymentRequestService.getByProject(project.id);
            const existing: any = requests.find((r: any) => r.paymentAgainst === 'gem_charges') ?? null;

            const breakdown = computeGemChargesBreakdown(data.gemChargesAmount);
            const amount = breakdown.netPayable;

            if (amount > 0) {
                if (!existing) {
                    await this.createProjectPaymentRequest(project.id, data, woBasicDetailId, currentUserId);
                    return;
                }

                if (!PENDING_STATUSES.includes(existing.status)) {
                    this.logger.warn(`Skipping GeM charges update for WO Basic Detail ${woBasicDetailId}: request ${existing.id} is "${existing.status}"`);
                    return;
                }

                const gemInvoiceFiles = data.gemChargesInvoice ? JSON.parse(data.gemChargesInvoice) as string[] : [];
                await this.paymentRequestService.update(existing.id, {
                    amount,
                    paymentAgainst: 'gem_charges',
                    paymentMode: 'PORTAL',
                    portalLink: data.gemChargesPortalLink || null,
                    uploadedInvoiceFile: gemInvoiceFiles[0] ?? null,
                    billFiles: gemInvoiceFiles,
                    remark: `Auto-created from Basic Detail: ${woBasicDetailId}, for ${data.projectName ?? project.projectName ?? ''}. Pre-GST ${breakdown.preGst}, GST ${breakdown.gstAmount}, Total ${breakdown.totalPayable}, TDS ${breakdown.tdsAmount}, Net payable ${breakdown.netPayable}`,
                });
                this.logger.log(`Updated project payment request ${existing.id} for WO Basic Detail ${woBasicDetailId}`);
                return;
            }

            // amount === 0 -> clear
            if (!existing) return;

            if (!PENDING_STATUSES.includes(existing.status)) {
                this.logger.warn(`Skipping GeM charges removal for WO Basic Detail ${woBasicDetailId}: request ${existing.id} is "${existing.status}"`);
                return;
            }

            await this.paymentRequestService.updateStatus(existing.id, {
                status: 'rejected',
                rejectionReason: 'GeM charges removed from WO Basic Details',
            });
            this.logger.log(`Rejected project payment request ${existing.id} for WO Basic Detail ${woBasicDetailId}`);
        } catch (error) {
            this.logger.warn(
                `Failed to reconcile GeM charges payment request for WO Basic Detail: ${woBasicDetailId}`,
                error instanceof Error ? error.stack : String(error),
            );
        }
    }

    async delete(id: number): Promise<void> {
        const [row] = await this.db
            .delete(woBasicDetails)
            .where(eq(woBasicDetails.id, id))
            .returning();

        if (!row) {
            throw new NotFoundException(`WO Basic Detail with ID ${id} not found`);
        }
    }

    // ============================================
    // ORDER REVISION OPERATIONS (repeated/revised orders)
    // ============================================

    /**
     * Revise an existing order: snapshots the current order values into wo_order_revisions,
     * updates the wo_basic_details row with the new order values, and keeps the linked
     * project (po_no, po_date, po_upload) in sync. No new project is created.
     */
    async reviseOrder(id: number, data: ReviseOrderDto, userId?: number) {
        const [row] = await this.db
            .select()
            .from(woBasicDetails)
            .where(eq(woBasicDetails.id, id));

        if (!row) {
            throw new NotFoundException(`WO Basic Detail with ID ${id} not found`);
        }

        const now = new Date();

        // Compute next revision number for this order
        const [{ maxRev }] = await this.db
            .select({ maxRev: sql<number | null>`max(${woOrderRevisions.revisionNumber})::int` })
            .from(woOrderRevisions)
            .where(eq(woOrderRevisions.woBasicDetailId, id));

        const revisionNumber = (maxRev ?? 0) + 1;

        // Snapshot current order values
        const snapshotWoDate = row.woDate ?? null;
        await this.db.insert(woOrderRevisions).values({
            woBasicDetailId: id,
            woNumber: row.woNumber,
            woDate: snapshotWoDate,
            woValuePreGst: row.woValuePreGst,
            woValueGstAmt: row.woValueGstAmt,
            woDraft: row.woDraft,
            revisionNumber,
            revisionDate: now,
            revisedBy: userId ?? null,
            revisionNotes: data.revisionNotes ?? null,
        });

        // Apply new order values
        const updateValues: Record<string, unknown> = { updatedAt: now };
        if (data.woNumber !== undefined) updateValues.woNumber = data.woNumber;
        if (data.woDate !== undefined) updateValues.woDate = data.woDate;
        if (data.woValuePreGst !== undefined) updateValues.woValuePreGst = data.woValuePreGst;
        if (data.woValueGstAmt !== undefined) updateValues.woValueGstAmt = data.woValueGstAmt;
        if (data.woDraft !== undefined) updateValues.woDraft = data.woDraft;
        if (userId) updateValues.updatedBy = userId;

        const [updated] = await this.db
            .update(woBasicDetails)
            .set(updateValues)
            .where(eq(woBasicDetails.id, id))
            .returning();

        // Keep the linked project's PO fields in sync (if a project exists via woBasicDetailId)
        const projectSync: Record<string, unknown> = { updatedAt: now };
        if (data.woNumber !== undefined) projectSync.poNo = data.woNumber;
        if (data.woDate !== undefined) projectSync.poDate = this.parseDate(data.woDate);
        if (data.woDraft !== undefined) projectSync.poUpload = data.woDraft;
        await this.db
            .update(projects)
            .set(projectSync)
            .where(eq(projects.woBasicDetailId, id));

        // Send WhatsApp notification to the WORKORDER group (non-blocking)
        if (updated) {
            this.notifyWoBasicDetailsWhatsapp(updated, 'revised', {
                revisionNumber,
                revisionNotes: data.revisionNotes ?? null,
            });
        }

        const revisions = await this.getOrderRevisions(id);

        return {
            ...this.mapRowToResponse(updated),
            revisions,
        };
    }

    /**
     * Returns the revision history for a WO basic detail, newest first.
     */
    async getOrderRevisions(woBasicDetailId: number) {
        const rows = await this.db
            .select({
                id: woOrderRevisions.id,
                woBasicDetailId: woOrderRevisions.woBasicDetailId,
                woNumber: woOrderRevisions.woNumber,
                woDate: woOrderRevisions.woDate,
                woValuePreGst: woOrderRevisions.woValuePreGst,
                woValueGstAmt: woOrderRevisions.woValueGstAmt,
                woDraft: woOrderRevisions.woDraft,
                revisionNumber: woOrderRevisions.revisionNumber,
                revisionDate: woOrderRevisions.revisionDate,
                revisedBy: woOrderRevisions.revisedBy,
                revisionNotes: woOrderRevisions.revisionNotes,
                revisedByName: users.name,
                createdAt: woOrderRevisions.createdAt,
            })
            .from(woOrderRevisions)
            .leftJoin(users, eq(users.id, woOrderRevisions.revisedBy))
            .where(eq(woOrderRevisions.woBasicDetailId, woBasicDetailId))
            .orderBy(desc(woOrderRevisions.revisionNumber));

        return rows;
    }

    // OE ASSIGNMENT OPERATIONS
    async assignOe(id: number, data: AssignOeDto, assignedByUserId?: number) {
        // Check if record exists
        await this.findById(id);

        const now = new Date();
        const updateValues: Record<string, unknown> = { updatedAt: now };

        // Handle oeFirst assignment
        if (data.oeFirst !== undefined) {
            updateValues.oeFirst = data.oeFirst;
            updateValues.oeFirstAssignedAt = data.oeFirstAssignedAt ?? now;
            updateValues.oeFirstAssignedBy = data.oeFirstAssignedBy ?? assignedByUserId ?? null;
        }

        // Handle oeSiteVisit assignment
        if (data.oeSiteVisit !== undefined) {
            updateValues.oeSiteVisit = data.oeSiteVisit;
            updateValues.oeSiteVisitAssignedAt = data.oeSiteVisitAssignedAt ?? now;
            updateValues.oeSiteVisitAssignedBy = data.oeSiteVisitAssignedBy ?? assignedByUserId ?? null;
        }

        // Handle oeDocsPrep assignment
        if (data.oeDocsPrep !== undefined) {
            updateValues.oeDocsPrep = data.oeDocsPrep;
            updateValues.oeDocsPrepAssignedAt = data.oeDocsPrepAssignedAt ?? now;
            updateValues.oeDocsPrepAssignedBy = data.oeDocsPrepAssignedBy ?? assignedByUserId ?? null;
        }

        const [row] = await this.db
            .update(woBasicDetails)
            .set(updateValues as Partial<typeof woBasicDetails.$inferInsert>)
            .where(eq(woBasicDetails.id, id))
            .returning();

        return this.mapRowToResponse(row!);
    }

    async bulkAssignOe(id: number, data: BulkAssignOeDto) {
        // Check if record exists
        await this.findById(id);

        const now = new Date();
        const updateValues: Record<string, unknown> = { updatedAt: now };

        for (const assignment of data.assignments) {
            switch (assignment.assignmentType) {
                case 'first':
                    updateValues.oeFirst = assignment.oeUserId;
                    updateValues.oeFirstAssignedAt = now;
                    updateValues.oeFirstAssignedBy = data.assignedBy ?? null;
                    break;
                case 'siteVisit':
                    updateValues.oeSiteVisit = assignment.oeUserId;
                    updateValues.oeSiteVisitAssignedAt = now;
                    updateValues.oeSiteVisitAssignedBy = data.assignedBy ?? null;
                    break;
                case 'docsPrep':
                    updateValues.oeDocsPrep = assignment.oeUserId;
                    updateValues.oeDocsPrepVisitAssignedAt = now;
                    updateValues.oeDocsPrepVisitAssignedBy = data.assignedBy ?? null;
                    break;
            }
        }

        const [row] = await this.db
            .update(woBasicDetails)
            .set(updateValues as Partial<typeof woBasicDetails.$inferInsert>)
            .where(eq(woBasicDetails.id, id))
            .returning();

        return this.mapRowToResponse(row!);
    }

    async removeOeAssignment(id: number, data: RemoveOeAssignmentDto) {
        // Check if record exists
        await this.findById(id);

        const updateValues: Record<string, unknown> = { updatedAt: new Date() };

        switch (data.assignmentType) {
            case 'first':
                updateValues.oeFirst = null;
                updateValues.oeFirstAssignedAt = null;
                updateValues.oeFirstAssignedBy = null;
                break;
            case 'siteVisit':
                updateValues.oeSiteVisit = null;
                updateValues.oeSiteVisitAssignedAt = null;
                updateValues.oeSiteVisitAssignedBy = null;
                break;
            case 'docsPrep':
                updateValues.oeDocsPrep = null;
                updateValues.oeDocsPrepVisitAssignedAt = null;
                updateValues.oeDocsPrepVisitAssignedBy = null;
                break;
        }

        const [row] = await this.db
            .update(woBasicDetails)
            .set(updateValues as Partial<typeof woBasicDetails.$inferInsert>)
            .where(eq(woBasicDetails.id, id))
            .returning();

        return this.mapRowToResponse(row!);
    }

    async getOeAssignments(id: number) {
        const row = await this.findById(id);

        return {
            woBasicDetailId: id,
            assignments: {
                first: row.oeFirst
                    ? {
                          oeUserId: row.oeFirst,
                          assignedAt: row.oeFirstAssignedAt,
                          assignedBy: row.oeFirstAssignedBy,
                      }
                    : null,
                siteVisit: row.oeSiteVisit
                    ? {
                          oeUserId: row.oeSiteVisit,
                          assignedAt: row.oeSiteVisitAssignedAt,
                          assignedBy: row.oeSiteVisitAssignedBy,
                      }
                    : null,
                docsPrep: row.oeDocsPrep
                    ? {
                          oeUserId: row.oeDocsPrep,
                          assignedAt: row.oeDocsPrepAssignedAt,
                          assignedBy: row.oeDocsPrepAssignedBy,
                      }
                    : null,
            },
        };
    }

    // UTILITY OPERATIONS
    async checkProjectCodeExists(projectCode: string) {
        const [existing] = await this.db
            .select({ id: woBasicDetails.id })
            .from(woBasicDetails)
            .where(eq(woBasicDetails.projectCode, projectCode))
            .limit(1);

        return {
            exists: !!existing,
            projectCode,
        };
    }

    async checkProjectNameExists(projectName: string, teamId?: number) {
        if (!projectName || !projectName.trim()) {
            return { exists: false, count: 0, projectName: '', existingProjectNames: [], suggestion: null };
        }

        const trimmed = projectName.trim();

        // Search for exact match AND suffixed variants like "Name (2)", "Name (3)" etc.
        const suffixPattern = `${trimmed} (%)`;
        const conditions: any[] = [
            or(
                eq(woBasicDetails.projectName, trimmed),
                ilike(woBasicDetails.projectName, suffixPattern),
            ),
        ];

        if (teamId) {
            conditions.push(eq(woBasicDetails.team, teamId));
        }

        const rows = await this.db
            .select({ projectName: woBasicDetails.projectName })
            .from(woBasicDetails)
            .where(and(...conditions));

        const count = rows.length;
        const exists = count > 0;

        let suggestion: string | null = null;
        if (exists) {
            suggestion = `${trimmed} (${count + 1})`;
        }

        return {
            exists,
            count,
            projectName: trimmed,
            existingProjectNames: rows.map(r => r.projectName),
            suggestion,
        };
    }

    async findByTenderId(tenderId: number) {
        const rows = await this.db
            .select()
            .from(woBasicDetails)
            .where(eq(woBasicDetails.tenderId, tenderId))
            .orderBy(asc(woBasicDetails.orderSequence), asc(woBasicDetails.id));

        return rows.map((r) => this.mapRowToResponse(r));
    }

    async findByEnquiryId(enquiryId: number) {
        const rows = await this.db
            .select()
            .from(woBasicDetails)
            .where(eq(woBasicDetails.enquiryId, enquiryId))
            .orderBy(asc(woBasicDetails.orderSequence), asc(woBasicDetails.id));

        return rows.map((r) => this.mapRowToResponse(r));
    }

    async getPrefillData(tenderId: number) {
        const [tender] = await this.db
            .select({
                team: tenderInfos.team,
                websiteId: tenderInfos.website,
                organizationAcronym: organizations.acronym,
                itemName: items.name,
                locationName: locations.name,
            })
            .from(tenderInfos)
            .leftJoin(organizations, eq(organizations.id, tenderInfos.organization))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(locations, eq(locations.id, tenderInfos.location))
            .where(eq(tenderInfos.id, tenderId))
            .limit(1);

        const [costingDetail] = await this.db
            .select({
                budgetPrice: sql<string>`COALESCE(SUM(${tenderCostingDetails.budgetPrice}), '0')`,
                receiptPrice: sql<string>`COALESCE(SUM(${tenderCostingDetails.receiptPrice}), '0')`,
                grossMargin: sql<string>`AVG(${tenderCostingDetails.grossMargin})`,
                finalPrice: sql<string>`COALESCE(SUM(${tenderCostingDetails.finalPrice}), '0')`,
            })
            .from(tenderCostingDetails)
            .innerJoin(tenderCostingSheets, eq(tenderCostingSheets.id, tenderCostingDetails.tenderCostingSheetId))
            .where(and(
                eq(tenderCostingSheets.tenderId, tenderId),
                eq(tenderCostingDetails.status, 'Approved'),
            ))
            .limit(1);

        const clients = await this.db
            .select({
                clientName: tenderClients.clientName,
                clientDesignation: tenderClients.clientDesignation,
                clientMobile: tenderClients.clientMobile,
                clientEmail: tenderClients.clientEmail,
            })
            .from(tenderClients)
            .where(eq(tenderClients.tenderId, tenderId));

        const websiteId = tender?.websiteId ?? null;

        return {
            team: tender?.team ?? null,
            websiteId,
            isGemTender: websiteId === GEM_WEBSITE_ID,
            organizationAcronym: tender?.organizationAcronym ?? null,
            itemName: tender?.itemName ?? null,
            locationName: tender?.locationName ?? null,
            budgetPrice: costingDetail?.budgetPrice ?? null,
            receiptPrice: costingDetail?.receiptPrice ?? null,
            grossMargin: costingDetail?.grossMargin ?? null,
            finalPrice: costingDetail?.finalPrice ?? null,
            clients: clients.map(c => ({
                clientName: c.clientName,
                clientDesignation: c.clientDesignation,
                clientMobile: c.clientMobile,
                clientEmail: c.clientEmail,
            })),
        };
    }

    // DASHBOARD/REPORTING
    private buildRoleFilterConditions(user?: ValidatedUser, teamId?: number) {
        const conditions: any[] = [];

        if (!user) return conditions;

        if (user.dataScope === 'all') {
            // Super User / Admin: Show all, respect teamId filter if provided
            if (teamId !== undefined && teamId !== null) {
                conditions.push(eq(woBasicDetails.team, teamId));
            }
        } else if (user.canSwitchTeams && teamId !== undefined && teamId !== null) {
            // Coordinator with team switcher: filter by selected team
            conditions.push(eq(woBasicDetails.team, teamId));
        } else if (user.dataScope === 'team') {
            // Team-scoped: filter by user's own team
            if (user.teamId) {
                conditions.push(eq(woBasicDetails.team, user.teamId));
            } else {
                conditions.push(sql`1 = 0`);
            }
        } else {
            // Self-scoped: Show where they created or are assigned as any OE role
            if (user.sub) {
                conditions.push(
                    or(
                        eq(woBasicDetails.createdBy, user.sub),
                        eq(woBasicDetails.oeFirst, user.sub),
                        eq(woBasicDetails.oeSiteVisit, user.sub),
                        eq(woBasicDetails.oeDocsPrep, user.sub),
                    ),
                );
            } else {
                conditions.push(sql`1 = 0`);
            }
        }

        return conditions;
    }

    async getDashboardSummary(user?: ValidatedUser, teamId?: number) {
        const conditions: any[] = [];
        if (user) {
            conditions.push(...this.buildRoleFilterConditions(user, teamId));
        }
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [stageCounts] = await this.db
            .select({
                total: sql<number>`count(distinct ${woBasicDetails.id})::int`,
                basicDetails: sql<number>`count(distinct ${woBasicDetails.id}) filter (where ${woBasicDetails.currentStage} is distinct from 'completed' and (${woDetails.id} is null or ${woDetails.status} is distinct from 'wo_details_filled'))::int`,
                woDetails: sql<number>`count(distinct ${woBasicDetails.id}) filter (where ${woBasicDetails.currentStage} is distinct from 'completed' and ${woDetails.status} = 'wo_details_filled')::int`,
                completed: sql<number>`count(distinct ${woBasicDetails.id}) filter (where ${woBasicDetails.currentStage} = 'completed')::int`,
                paused: sql<number>`count(distinct ${woBasicDetails.id}) filter (where ${woBasicDetails.isWorkflowPaused} = true)::int`,
            })
            .from(woBasicDetails)
            .leftJoin(woDetails, eq(woDetails.woBasicDetailId, woBasicDetails.id))
            .where(whereClause);

        return {
            summary: stageCounts,
            generatedAt: new Date().toISOString(),
        };
    }

    async getPendingOeAssignments(user?: ValidatedUser, teamId?: number) {
        const conditions: any[] = [
            isNull(woBasicDetails.oeFirst),
            eq(woBasicDetails.currentStage, 'basic_details'),
        ];
        if (user) {
            conditions.push(...this.buildRoleFilterConditions(user, teamId));
        }

        const rows = await this.db
            .select()
            .from(woBasicDetails)
            .where(and(...conditions))
            .orderBy(asc(woBasicDetails.createdAt));

        return {
            count: rows.length,
            data: rows.map((r) => this.mapRowToResponse(r)),
        };
    }

    async getWorkflowStatusSummary(user?: ValidatedUser, teamId?: number) {
        const conditions: any[] = [];
        if (user) {
            conditions.push(...this.buildRoleFilterConditions(user, teamId));
        }
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [summary] = await this.db
            .select({
                totalActive: sql<number>`count(*) filter (where ${woBasicDetails.isWorkflowPaused} = false)::int`,
                totalPaused: sql<number>`count(*) filter (where ${woBasicDetails.isWorkflowPaused} = true)::int`,
                avgGrossMargin: sql<string>`round(avg(${woBasicDetails.grossMargin}::numeric), 2)::text`,
                totalWoValue: sql<string>`sum(${woBasicDetails.woValuePreGst}::numeric)::text`,
            })
            .from(woBasicDetails)
            .where(whereClause);

        return {
            ...summary,
            generatedAt: new Date().toISOString(),
        };
    }
}
