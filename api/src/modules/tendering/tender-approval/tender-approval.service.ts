import { Inject, Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import type { TenderApprovalPayload } from "@/modules/tendering/tender-approval/dto/tender-approval.dto";
import { tenderInfos } from "@db/schemas/tendering/tenders.schema";
import { eq, and, asc, desc, sql, or, inArray, isNull } from "drizzle-orm";
import { tenderInformation } from "@db/schemas/tendering/tender-info-sheet.schema";
import { tenderStatusHistory } from "@db/schemas/tendering/tender-status-history.schema";
import { users } from "@db/schemas/auth/users.schema";
import { statuses } from "@db/schemas/master/statuses.schema";
import { items } from "@db/schemas/master/items.schema";
import { tenderIncompleteFields } from "@db/schemas/tendering/tender-incomplete-fields.schema";
import { TenderInfosService } from "@/modules/tendering/tenders/tenders.service";
import type { PaginatedResult } from "@/modules/tendering/types/shared.types";
import { TenderStatusHistoryService } from "@/modules/tendering/tender-status-history/tender-status-history.service";
import { EmailService } from "@/modules/email/email.service";
import { RecipientResolver } from "@/modules/email/recipient.resolver";
import type { RecipientSource } from "@/modules/email/dto/send-email.dto";
import { Logger } from "@nestjs/common";
import { wrapPaginatedResponse } from "@/utils/responseWrapper";
import { WorkflowService } from "@/modules/timers/services/workflow.service";
import { TenderInfoSheetsService } from "../info-sheets/info-sheets.service";
import { stepInstances } from "@/db/schemas/workflow/workflows.schema";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";

export type TenderApprovalFilters = {
    tlStatus?: "0" | "1" | "2" | "3" | number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
};

type TenderRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    item: number;
    gstValues: number;
    tenderFees: number;
    emd: number;
    teamMember: number;
    dueDate: Date;
    status: number;
    teamMemberName: string;
    itemName: string;
    statusName: string;
    tlStatus: string | number;
    statusRemark?: string | null;
    rejectReason?: number | null;
    rejectRemarks?: string | null;
};

@Injectable()
export class TenderApprovalService {
    private readonly logger = new Logger(TenderApprovalService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
        private readonly workflowService: WorkflowService,
        private readonly tenderInfoSheetsService: TenderInfoSheetsService
    ) {}

    /**
     * Build role-based filter conditions for tender queries
     */
    private buildRoleFilterConditions(user?: ValidatedUser, teamId?: number): any[] {
        const roleFilterConditions: any[] = [];

        if (user && user.roleId) {
            if (user.roleId === 1 || user.roleId === 2) {
                // Super User or Admin: Show all, respect teamId filter if provided
                if (teamId !== undefined && teamId !== null) {
                    roleFilterConditions.push(eq(tenderInfos.team, teamId));
                }
            } else if (user.roleId === 3 || user.roleId === 4 || user.roleId === 6) {
                // Team Leader, Coordinator, Engineer: Filter by primary_team_id
                if (user.teamId) {
                    roleFilterConditions.push(eq(tenderInfos.team, user.teamId));
                } else {
                    roleFilterConditions.push(sql`1 = 0`); // Empty results
                }
            } else {
                // All other roles: Show only own tenders
                if (user.sub) {
                    roleFilterConditions.push(eq(tenderInfos.teamMember, user.sub));
                } else {
                    roleFilterConditions.push(sql`1 = 0`); // Empty results
                }
            }
        } else {
            // No user provided - return empty for security
            roleFilterConditions.push(sql`1 = 0`);
        }

        return roleFilterConditions;
    }

    /**
     * Get dashboard data by tab
     */
    async getDashboardData(
        user?: ValidatedUser,
        teamId?: number,
        tabKey?: "pending" | "accepted" | "rejected" | "tender-dnb",
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: "asc" | "desc"; search?: string }
    ): Promise<PaginatedResult<TenderRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const activeTab = tabKey || "pending";

        // Validate tab key
        if (!["pending", "accepted", "rejected", "tender-dnb"].includes(activeTab)) {
            throw new BadRequestException(`Invalid tab: ${activeTab}`);
        }

        // Base conditions for all tabs
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            // TenderInfosService.getExcludeStatusCondition(['lost']),
        ];

        // Apply role-based filtering
        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);

        // Tab-specific conditions
        let tabConditions: any[] = [];
        tabConditions.push(...roleFilterConditions);
        if (activeTab === "pending") {
            tabConditions.push(or(eq(tenderInfos.tlStatus, 0), eq(tenderInfos.tlStatus, 3), isNull(tenderInfos.tlStatus)));
        } else if (activeTab === "accepted") {
            tabConditions.push(eq(tenderInfos.tlStatus, 1));
        } else if (activeTab === "rejected") {
            tabConditions.push(eq(tenderInfos.tlStatus, 2));
        } else if (activeTab === "tender-dnb") {
            tabConditions.push(inArray(tenderInfos.status, [8, 34]), inArray(tenderInfos.tlStatus, [1, 2, 3]));
        }

        // Search conditions
        if (filters?.search) {
            const searchStr = `%${filters.search}%`;
            tabConditions.push(
                sql`(
                    ${tenderInfos.tenderName} ILIKE ${searchStr} OR
                    ${tenderInfos.tenderNo} ILIKE ${searchStr} OR
                    ${tenderInfos.gstValues}::text ILIKE ${searchStr} OR
                    ${tenderInfos.dueDate}::text ILIKE ${searchStr} OR
                    ${users.name} ILIKE ${searchStr} OR
                    ${items.name} ILIKE ${searchStr} OR
                    ${tenderInformation.teRejectionRemarks} ILIKE ${searchStr}
                )`
            );
        }

        const allConditions = [...baseConditions, ...tabConditions];
        const whereClause = and(...allConditions);

        // Build orderBy clause
        const sortBy =
            filters?.sortBy || (activeTab === "pending" ? "dueDate" : activeTab === "accepted" ? "approvalDate" : activeTab === "rejected" ? "rejectionDate" : "statusChangeDate");
        const sortOrder = filters?.sortOrder || (activeTab === "pending" ? "asc" : "desc");
        let orderByClause: any = asc(tenderInfos.dueDate); // Default

        if (sortBy) {
            const sortFn = sortOrder === "desc" ? desc : asc;
            switch (sortBy) {
                case "tenderNo":
                    orderByClause = sortFn(tenderInfos.tenderNo);
                    break;
                case "tenderName":
                    orderByClause = sortFn(tenderInfos.tenderName);
                    break;
                case "teamMemberName":
                    orderByClause = sortFn(users.name);
                    break;
                case "dueDate":
                    orderByClause = sortFn(tenderInfos.dueDate);
                    break;
                case "approvalDate":
                    orderByClause = sortFn(tenderInfos.updatedAt);
                    break;
                case "rejectionDate":
                    orderByClause = sortFn(tenderInfos.updatedAt);
                    break;
                case "statusChangeDate":
                    orderByClause = sortFn(tenderInfos.updatedAt);
                    break;
                case "gstValues":
                    orderByClause = sortFn(tenderInfos.gstValues);
                    break;
                case "itemName":
                    orderByClause = sortFn(items.name);
                    break;
                case "statusName":
                    orderByClause = sortFn(statuses.name);
                    break;
                case "tlStatus":
                    orderByClause = sortFn(tenderInfos.tlStatus);
                    break;
                default:
                    orderByClause = sortFn(tenderInfos.dueDate);
            }
        }

        // Build query
        const query = this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                item: tenderInfos.item,
                gstValues: tenderInfos.gstValues,
                tenderFees: tenderInfos.tenderFees,
                emd: tenderInfos.emd,
                teamMember: tenderInfos.teamMember,
                dueDate: tenderInfos.dueDate,
                status: tenderInfos.status,
                tlStatus: tenderInfos.tlStatus,
                teamMemberName: users.name,
                itemName: items.name,
                statusName: statuses.name,
                rejectReason: tenderInformation.teRejectionReason,
                rejectRemarks: tenderInformation.teRejectionRemarks,
            })
            .from(tenderInfos)
            .innerJoin(users, eq(tenderInfos.teamMember, users.id))
            .innerJoin(statuses, eq(tenderInfos.status, statuses.id))
            .innerJoin(items, eq(tenderInfos.item, items.id))
            .innerJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);
        // Execute query
        const rows = (await query) as unknown as TenderRow[];

        // Get total count
        let countQuery: any = this.db
            .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
            .from(tenderInfos)
            .innerJoin(users, eq(tenderInfos.teamMember, users.id))
            .innerJoin(statuses, eq(tenderInfos.status, statuses.id))
            .innerJoin(items, eq(tenderInfos.item, items.id))
            .innerJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id));

        // Add search joins to count query if search is used
        if (filters?.search) {
            // Joins already added above
        }

        const [countResult] = await countQuery.where(whereClause);
        const total = Number(countResult?.count || 0);

        return wrapPaginatedResponse(rows, total, page, limit);
    }

    async getCounts(user?: ValidatedUser, teamId?: number) {
        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);

        // Base conditions for all tabs
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            // TenderInfosService.getExcludeStatusCondition(['lost']),
            ...roleFilterConditions,
        ];

        // Build conditions for each tab
        const pendingConditions = [...baseConditions, or(eq(tenderInfos.tlStatus, 0), eq(tenderInfos.tlStatus, 3), isNull(tenderInfos.tlStatus))];

        const acceptedConditions = [...baseConditions, eq(tenderInfos.tlStatus, 1)];

        const rejectedConditions = [...baseConditions, eq(tenderInfos.tlStatus, 2)];

        const tenderDnbConditions = [...baseConditions, inArray(tenderInfos.status, [8, 34]), inArray(tenderInfos.tlStatus, [1, 2, 3])];

        // Count for each tab
        const [pendingCount, acceptedCount, rejectedCount, tenderDnbCount] = await Promise.all([
            this.countTabItems(and(...pendingConditions)),
            this.countTabItems(and(...acceptedConditions)),
            this.countTabItems(and(...rejectedConditions)),
            this.countTabItems(and(...tenderDnbConditions)),
        ]);

        return {
            pending: pendingCount,
            accepted: acceptedCount,
            rejected: rejectedCount,
            "tender-dnb": tenderDnbCount,
            total: pendingCount + acceptedCount + rejectedCount + tenderDnbCount,
        };
    }

    private async countTabItems(whereClause: any): Promise<number> {
        const countQuery = this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .innerJoin(users, eq(tenderInfos.teamMember, users.id))
            .innerJoin(statuses, eq(tenderInfos.status, statuses.id))
            .innerJoin(items, eq(tenderInfos.item, items.id))
            .innerJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .where(whereClause);

        const [result] = await countQuery;
        return Number(result?.count || 0);
    }

    async getByTenderId(tenderId: number) {
        // Validate tender exists first
        await this.tenderInfosService.validateExists(tenderId);

        const result = await this.db
            .select({
                tlStatus: tenderInfos.tlStatus,
                rfqTo: tenderInfos.rfqTo,
                processingFeeMode: tenderInfos.processingFeeMode,
                tenderFeeMode: tenderInfos.tenderFeeMode,
                emdMode: tenderInfos.emdMode,
                approvePqrSelection: tenderInfos.approvePqrSelection,
                approveFinanceDocSelection: tenderInfos.approveFinanceDocSelection,
                tenderStatus: tenderInfos.status,
                oemNotAllowed: tenderInfos.oemNotAllowed,
                tlRejectionRemarks: tenderInfos.tlRejectionRemarks,
            })
            .from(tenderInfos)
            .where(eq(tenderInfos.id, tenderId))
            .limit(1);

        if (!result.length) {
            return null;
        }

        const data = result[0];

        const rfqToArray = data.rfqTo
            ? data.rfqTo
                  .split(",")
                  .map(Number)
                  .filter(n => !isNaN(n))
            : [];

        // Fetch incomplete fields
        const incompleteFieldsResult = await this.db
            .select({
                id: tenderIncompleteFields.id,
                fieldName: tenderIncompleteFields.fieldName,
                comment: tenderIncompleteFields.comment,
                status: tenderIncompleteFields.status,
            })
            .from(tenderIncompleteFields)
            .where(eq(tenderIncompleteFields.tenderId, tenderId));

        return {
            ...data,
            rfqTo: rfqToArray,
            incompleteFields: incompleteFieldsResult,
        };
    }

    async getByTenderIdWithDetails(tenderId: number) {
        const [approvalData, tenderDetails] = await Promise.all([this.getByTenderId(tenderId), this.tenderInfosService.getTenderForApproval(tenderId)]);

        return {
            ...approvalData,
            tender: tenderDetails,
        };
    }

    async updateApproval(tenderId: number, payload: TenderApprovalPayload, changedBy: number) {
        // Validate tender exists
        await this.tenderInfosService.validateExists(tenderId);

        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(tenderId);
        const prevStatus = currentTender?.status ?? null;

        const updateData: any = {
            tlStatus: payload.tlStatus,
            updatedAt: new Date(),
        };

        let newStatus: number | null = null;
        let statusComment: string = "";

        // Clear incomplete fields for statuses other than '3'
        if (payload.tlStatus !== "3") {
            await this.db.delete(tenderIncompleteFields).where(eq(tenderIncompleteFields.tenderId, tenderId));
        }

        if (payload.tlStatus === "1") {
            // Approved - Status 3
            const rfqToString = payload.rfqTo?.join(",") || "";

            updateData.rfqTo = rfqToString;
            updateData.processingFeeMode = payload.processingFeeMode ?? null;
            updateData.tenderFeeMode = payload.tenderFeeMode ?? null;
            updateData.emdMode = payload.emdMode ?? null;
            updateData.approvePqrSelection = payload.approvePqrSelection ?? null;
            updateData.approveFinanceDocSelection = payload.approveFinanceDocSelection ?? null;

            updateData.tlRejectionRemarks = null;
            updateData.oemNotAllowed = null;
            updateData.status = 3; // Tender Info approved
            newStatus = 3;
            statusComment = "Tender info approved";

            // Update tender values from info sheet
            const infoSheet = await this.tenderInfoSheetsService.findByTenderId(tenderId);
            if (infoSheet) {
                // Convert numeric values to string for decimal fields
                if (infoSheet.tenderValue !== null && infoSheet.tenderValue !== undefined) {
                    updateData.gstValues = String(infoSheet.tenderValue);
                }
                if (infoSheet.tenderFeeAmount !== null && infoSheet.tenderFeeAmount !== undefined) {
                    updateData.tenderFees = String(infoSheet.tenderFeeAmount);
                }
                if (infoSheet.emdAmount !== null && infoSheet.emdAmount !== undefined) {
                    updateData.emd = String(infoSheet.emdAmount);
                }
            }
        } else if (payload.tlStatus === "2") {
            // Rejected - Use tenderStatus from payload (contains rejection reason status ID)
            updateData.tlRejectionRemarks = payload.tlRejectionRemarks;
            updateData.oemNotAllowed = payload.oemNotAllowed;

            if (payload.tenderStatus) {
                updateData.status = payload.tenderStatus;
                newStatus = payload.tenderStatus;
                statusComment = "Tender rejected";
            }

            updateData.rfqTo = null;
            updateData.processingFeeMode = null;
            updateData.tenderFeeMode = null;
            updateData.emdMode = null;
            updateData.approvePqrSelection = null;
            updateData.approveFinanceDocSelection = null;
        } else if (payload.tlStatus === "3") {
            // Incomplete - Status 29
            // Incomplete status - clear approval/rejection fields
            updateData.rfqTo = null;
            updateData.processingFeeMode = null;
            updateData.tenderFeeMode = null;
            updateData.emdMode = null;
            updateData.approvePqrSelection = null;
            updateData.approveFinanceDocSelection = null;
            updateData.tlRejectionRemarks = null;
            updateData.oemNotAllowed = null;
            updateData.status = 29; // Tender Info sheet Incomplete
            newStatus = 29;
            statusComment = "Tender info sheet incomplete";

            // Delete existing incomplete fields
            await this.db.delete(tenderIncompleteFields).where(eq(tenderIncompleteFields.tenderId, tenderId));

            // Insert new incomplete fields
            if (payload.incompleteFields && payload.incompleteFields.length > 0) {
                const incompleteFieldsData = payload.incompleteFields.map(field => ({
                    tenderId,
                    fieldName: field.fieldName,
                    comment: field.comment,
                    status: "pending" as const,
                }));

                await this.db.insert(tenderIncompleteFields).values(incompleteFieldsData);
            }
        }

        // Update tender and track status change in transaction
        await this.db.transaction(async tx => {
            await tx.update(tenderInfos).set(updateData).where(eq(tenderInfos.id, tenderId)).returning();

            // Track status change if status was updated
            if (newStatus !== null && newStatus !== prevStatus) {
                await this.tenderStatusHistoryService.trackStatusChange(tenderId, newStatus, changedBy, prevStatus, statusComment, tx);
            }
        });

        // Send email notification for approval/rejection/review
        if (payload.tlStatus === "1" || payload.tlStatus === "2" || payload.tlStatus === "3") {
            await this.sendApprovalEmail(tenderId, payload, changedBy);
        }

        try {
            // TIMER TRANSITION
            this.logger.log(`Transitioning timers for tender ${tenderId} after approval`);

            // 1. Get workflow status
            const workflowStatus = await this.workflowService.getWorkflowStatus("TENDER", tenderId.toString());

            // 2. Complete the tender_approval step
            const tenderApprovalStep = workflowStatus.steps.find(step => step.stepKey === "tender_approval" && step.status === "IN_PROGRESS");

            if (tenderApprovalStep) {
                this.logger.log(`Completing tender_approval step ${tenderApprovalStep.id} for tender ${tenderId}`);
                await this.workflowService.completeStep(tenderApprovalStep.id.toString(), {
                    userId: changedBy.toString(),
                    notes: "Tender approved",
                });
            } else {
                this.logger.warn(`No active tender_approval step found for tender ${tenderId}`);
            }

            // 3. Get updated workflow status
            const updatedWorkflowStatus = await this.workflowService.getWorkflowStatus("TENDER", tenderId.toString());

            // 4. Get tender and info sheet data
            const tender = await this.tenderInfosService.findById(tenderId);
            const infoSheet = await this.tenderInfoSheetsService.findByTenderId(tenderId);

            if (!tender || !infoSheet) {
                throw new NotFoundException(`Tender or info sheet not found for tender ${tenderId}`);
            }

            // 5. Find steps that should be started based on tender configuration
            const stepsToStart = updatedWorkflowStatus.steps.filter(step => {
                // Check if step should be started based on tender configuration
                if (step.stepKey === "rfq_sent" && tender.rfqTo && tender.rfqTo !== "0") {
                    return step.status === "PENDING";
                }
                if (step.stepKey === "emd_requested" && (infoSheet.emdRequired === "YES" || infoSheet.emdRequired === "1")) {
                    return step.status === "PENDING";
                }
                if (step.stepKey === "physical_docs" && infoSheet.physicalDocsRequired === "YES") {
                    return step.status === "PENDING";
                }
                if (step.stepKey === "document_checklist" || step.stepKey === "costing_sheets") {
                    return step.status === "PENDING";
                }
                return false;
            });

            this.logger.log(`Found ${stepsToStart.length} steps to start after approval for tender ${tenderId}`, {
                steps: stepsToStart.map(step => step.stepKey),
            });

            // 6. Update timer configurations for negative countdown timers
            if (tender.dueDate) {
                const dueDate = new Date(tender.dueDate);
                this.logger.log(`Tender due date: ${dueDate.toISOString()}`);

                for (const step of stepsToStart) {
                    if (step.stepKey === "document_checklist" || step.stepKey === "costing_sheets") {
                        const hoursBeforeDeadline = step.stepKey === "document_checklist" ? -72 : -72;
                        const cutoffDate = new Date(dueDate.getTime() + hoursBeforeDeadline * 60 * 60 * 1000);

                        this.logger.log(`Updating ${step.stepKey} step ${step.id} with deadline ${cutoffDate.toISOString()}`);

                        try {
                            await this.db
                                .update(stepInstances)
                                .set({
                                    customDeadline: cutoffDate,
                                    timerConfig: {
                                        ...step.timerConfig,
                                        type: "NEGATIVE_COUNTDOWN",
                                        hoursBeforeDeadline: hoursBeforeDeadline,
                                    },
                                })
                                .where(eq(stepInstances.id, step.id));

                            this.logger.log(`Successfully updated timer config for step ${step.stepKey}`);
                        } catch (error) {
                            this.logger.error(`Failed to update timer config for step ${step.stepKey}:`, error);
                        }
                    }
                }
            } else {
                this.logger.warn(`No due date set for tender ${tenderId}, cannot configure negative countdown timers`);
            }

            // 7. Start all eligible steps
            for (const step of stepsToStart) {
                try {
                    this.logger.log(`Starting step ${step.stepKey} (${step.id}) for tender ${tenderId}`);
                    await this.workflowService.startStep(step.id.toString(), {
                        stepKey: step.stepKey,
                        assignedToUserId: step.assignedToUserId?.toString(),
                    });
                    this.logger.log(`Successfully started step ${step.stepKey} for tender ${tenderId}`);
                } catch (error) {
                    this.logger.error(`Failed to start step ${step.stepKey} for tender ${tenderId}:`, error);
                }
            }

            this.logger.log(`Successfully transitioned timers after approval for tender ${tenderId}`);
        } catch (error) {
            this.logger.error(`Failed to transition timers after approval for tender ${tenderId}:`, error);
            // Don't fail the entire operation if timer transition fails
        }

        return this.getByTenderId(tenderId);
    }

    /**
     * Helper method to send email notifications
     */
    private async sendEmail(
        eventType: string,
        tenderId: number,
        fromUserId: number,
        subject: string,
        template: string,
        data: Record<string, any>,
        recipients: { to?: RecipientSource[]; cc?: RecipientSource[] }
    ) {
        try {
            await this.emailService.sendTenderEmail({
                tenderId,
                eventType,
                fromUserId,
                to: recipients.to || [],
                cc: recipients.cc,
                subject,
                template,
                data,
            });
        } catch (error) {
            this.logger.error(`Failed to send email for tender ${tenderId}: ${error instanceof Error ? error.message : String(error)}`);
            // Don't throw - email failure shouldn't break main operation
        }
    }

    /**
     * Send approval/rejection email
     */
    private async sendApprovalEmail(tenderId: number, payload: TenderApprovalPayload, changedBy: number) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember) return;

        const assignee = await this.recipientResolver.getUserById(tender.teamMember);
        if (!assignee) return;

        // Get Team Leader name
        const teamLeaderEmails = await this.recipientResolver.getEmailsByRole("Team Leader", tender.team);
        let tlName = "Team Leader";
        if (teamLeaderEmails.length > 0) {
            const [tlUser] = await this.db.select({ name: users.name }).from(users).where(eq(users.email, teamLeaderEmails[0])).limit(1);
            if (tlUser?.name) {
                tlName = tlUser.name;
            }
        }

        const isBidApproved = payload.tlStatus === "1";
        const isRejected = payload.tlStatus === "2";
        const isReview = payload.tlStatus === "3";

        // Generate links (TODO: Update with actual frontend URLs)
        const emdLink = `#/tendering/emds?tenderId=${tenderId}`;
        const tenderFeesLink = `#/tendering/tender-fees?tenderId=${tenderId}`;
        const rfqLink = `#/tendering/rfqs?tenderId=${tenderId}`;

        // Get vendor names from rfqTo
        let vendor = "Selected Vendors";
        if (payload.rfqTo && payload.rfqTo.length > 0) {
            // TODO: Fetch vendor organization names from rfqTo IDs
            vendor = `${payload.rfqTo.length} vendor(s)`;
        }

        // Get physical docs requirement
        const phyDocs = "As per tender requirements"; // TODO: Get from tender data if available

        // Map document IDs to names
        const technicalDocMap: Record<string, string> = {
            "1": "Technical Specification Document",
            "2": "Product Catalog",
            "3": "Test Certificates",
            "4": "Quality Certifications (ISO, etc.)",
            "5": "OEM Authorization",
            "6": "Similar Work Experience Certificates",
            "7": "Installation Manual",
        };

        const financialDocMap: Record<string, string> = {
            "1": "Balance Sheet (Last 3 Years)",
            "2": "Profit & Loss Statement",
            "3": "Income Tax Returns",
            "4": "GST Registration Certificate",
            "5": "PAN Card",
            "6": "Audited Financial Statements",
            "7": "Bank Solvency Certificate",
            "8": "Working Capital Certificate",
        };

        const mapDocIdsToNames = (ids: string[] | undefined, map: Record<string, string>): string[] => {
            if (!ids || !Array.isArray(ids)) return [];
            return ids.map(id => map[id] || id).filter(Boolean);
        };

        const alternativeTechnicalDocNames = mapDocIdsToNames(payload.alternativeTechnicalDocs, technicalDocMap);
        const alternativeFinancialDocNames = mapDocIdsToNames(payload.alternativeFinancialDocs, financialDocMap);

        const emailData = {
            assignee: assignee.name,
            isBidApproved,
            isRejected,
            isReview,
            remarks: payload.tlRejectionRemarks || "",
            rej_remark: payload.tlRejectionRemarks || "",
            emdLink,
            tenderFeesLink,
            rfqLink,
            processingFeeMode: payload.processingFeeMode || "Not specified",
            tenderFeesMode: payload.tenderFeeMode || "Not specified",
            emdMode: payload.emdMode || "Not specified",
            vendor,
            phyDocs,
            pqrApproved: payload.approvePqrSelection === "1",
            finApproved: payload.approveFinanceDocSelection === "1",
            alternativeTechnicalDocs: alternativeTechnicalDocNames.length > 0 ? alternativeTechnicalDocNames.join(", ") : "",
            alternativeFinancialDocs: alternativeFinancialDocNames.length > 0 ? alternativeFinancialDocNames.join(", ") : "",
            tlName,
        };

        const template = isBidApproved ? "tender-approved-by-tl" : isReview ? "tender-rejected-by-tl" : "tender-rejected-by-tl";
        let subject: string;
        let eventType: string;

        if (isBidApproved) {
            subject = `Tender Approved - ${tender.tenderName}`;
            eventType = "tender.approved";
        } else if (isReview) {
            subject = `Tender Needs Review - ${tender.tenderName}`;
            eventType = "tender.review";
        } else {
            subject = `Tender Rejected - ${tender.tenderName}`;
            eventType = "tender.rejected";
        }

        await this.sendEmail(eventType, tenderId, changedBy, subject, template, emailData, {
            to: [{ type: "user", userId: tender.teamMember }],
            cc: [
                { type: "role", role: "Admin", teamId: tender.team },
                { type: "role", role: "Coordinator", teamId: tender.team },
            ],
        });
    }
}
