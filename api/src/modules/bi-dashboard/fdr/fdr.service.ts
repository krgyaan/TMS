import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { eq, and, inArray, isNull, sql, asc, desc, like } from "drizzle-orm";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { paymentRequests, paymentInstruments, instrumentFdrDetails } from "@db/schemas/tendering/emds.schema";
import { tenderInfos } from "@db/schemas/tendering/tenders.schema";
import { users } from "@db/schemas/auth/users.schema";
import { statuses } from "@db/schemas/master/statuses.schema";
import { teams } from "@db/schemas/master/teams.schema";
import { wrapPaginatedResponse } from "@/utils/responseWrapper";
import type { PaginatedResult } from "@/modules/tendering/types/shared.types";
import type { FdrDashboardRow, FdrDashboardCounts } from "@/modules/bi-dashboard/fdr/helpers/fdr.types";
import { FDR_STATUSES } from "@/modules/tendering/emds/constants/emd-statuses";
import { FollowUpService } from "@/modules/follow-up/follow-up.service";
import type { CreateFollowUpDto } from "@/modules/follow-up/zod/create-follow-up.dto";

@Injectable()
export class FdrService {
    private readonly logger = new Logger(FdrService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly followUpService: FollowUpService
    ) {}

    private statusMap() {
        return {
            [FDR_STATUSES.PENDING]: "Pending",
            [FDR_STATUSES.ACCOUNTS_FORM_ACCEPTED]: "Accepted",
            [FDR_STATUSES.ACCOUNTS_FORM_REJECTED]: "Rejected",
            [FDR_STATUSES.FOLLOWUP_INITIATED]: "Followup Initiated",
            [FDR_STATUSES.COURIER_RETURN_RECEIVED]: "Courier Return",
            [FDR_STATUSES.BANK_RETURN_COMPLETED]: "Bank Return",
            [FDR_STATUSES.PROJECT_SETTLEMENT_COMPLETED]: "Project Settlement",
            [FDR_STATUSES.CANCELLATION_REQUESTED]: "Cancellation Request",
            [FDR_STATUSES.CANCELLED_AT_BRANCH]: "Cancelled",
        };
    }

    private buildFdrDashboardConditions(tab?: string): { conditions: any[]; needsFdrDetails: boolean } {
        const conditions: any[] = [eq(paymentInstruments.instrumentType, "FDR"), eq(paymentInstruments.isActive, true)];
        let needsFdrDetails = false;

        if (tab === "pending") {
            conditions.push(eq(paymentInstruments.action, 0), eq(paymentInstruments.status, FDR_STATUSES.PENDING));
        } else if (tab === "rejected") {
            conditions.push(inArray(paymentInstruments.action, [1, 2]), eq(paymentInstruments.status, FDR_STATUSES.ACCOUNTS_FORM_REJECTED));
        } else if (tab === "returned") {
            conditions.push(inArray(paymentInstruments.action, [3, 4, 5]));
        } else if (tab === "cancelled") {
            conditions.push(inArray(paymentInstruments.action, [6, 7]));
        } else if (tab === "pnb-bg-linked") {
            needsFdrDetails = true;
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                like(instrumentFdrDetails.fdrSource, "BG_%"),
                sql`EXISTS (
                    SELECT 1 FROM instrument_bg_details bg
                    WHERE bg.id = CAST(SUBSTRING(${instrumentFdrDetails.fdrSource} FROM 4) AS INTEGER)
                    AND bg.bank_name = 'PNB_6011'
                )`
            );
        } else if (tab === "ybl-bg-linked") {
            needsFdrDetails = true;
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                like(instrumentFdrDetails.fdrSource, "BG_%"),
                sql`EXISTS (
                    SELECT 1 FROM instrument_bg_details bg
                    WHERE bg.id = CAST(SUBSTRING(${instrumentFdrDetails.fdrSource} FROM 4) AS INTEGER)
                    AND bg.bank_name IN ('YESBANK_2011', 'YESBANK_0771', 'BGLIMIT_0771')
                )`
            );
        } else if (tab === "security-deposit") {
            needsFdrDetails = true;
            conditions.push(inArray(paymentInstruments.action, [1, 2]), eq(instrumentFdrDetails.fdrPurpose, "deposit"));
        } else if (tab === "bond-linked") {
            conditions.push(eq(paymentInstruments.action, 8));
        }

        return { conditions, needsFdrDetails };
    }

    private async countFdrByConditions(conditions: any[], needsFdrDetails: boolean) {
        const query = this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId));

        if (needsFdrDetails) {
            query.leftJoin(instrumentFdrDetails, eq(instrumentFdrDetails.instrumentId, paymentInstruments.id));
        }

        const [result] = await query.where(and(...conditions));
        return Number(result?.count || 0);
    }

    async getDashboardData(
        tab?: string,
        options?: {
            page?: number;
            limit?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            search?: string;
        }
    ): Promise<PaginatedResult<FdrDashboardRow>> {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const offset = (page - 1) * limit;

        const { conditions: baseConditions, needsFdrDetails } = this.buildFdrDashboardConditions(tab);
        const conditions = [...baseConditions];

        // Search filter - search across all rendered columns
        // Note: We always join instrumentFdrDetails in the query, so we can search FDR columns
        if (options?.search) {
            const searchStr = `%${options.search}%`;
            const searchConditions: any[] = [
                sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`,
                sql`${instrumentFdrDetails.fdrNo} ILIKE ${searchStr}`,
                sql`${paymentInstruments.favouring} ILIKE ${searchStr}`,
                sql`${paymentInstruments.amount}::text ILIKE ${searchStr}`,
                sql`${statuses.name} ILIKE ${searchStr}`,
                sql`${users.name} ILIKE ${searchStr}`,
                sql`${instrumentFdrDetails.fdrDate}::text ILIKE ${searchStr}`,
                sql`${instrumentFdrDetails.fdrExpiryDate}::text ILIKE ${searchStr}`,
                sql`${paymentInstruments.status} ILIKE ${searchStr}`,
            ];
            conditions.push(sql`(${sql.join(searchConditions, sql` OR `)})`);
        }

        // Build order clause
        let orderClause: any = desc(paymentInstruments.createdAt);
        if (options?.sortBy) {
            const direction = options.sortOrder === "desc" ? desc : asc;
            switch (options.sortBy) {
                case "fdrCreationDate":
                    orderClause = direction(instrumentFdrDetails.fdrDate);
                    break;
                case "fdrNo":
                    orderClause = direction(instrumentFdrDetails.fdrNo);
                    break;
                case "tenderNo":
                    orderClause = direction(tenderInfos.tenderNo);
                    break;
                case "fdrAmount":
                    orderClause = direction(paymentInstruments.amount);
                    break;
                default:
                    orderClause = direction(paymentInstruments.createdAt);
            }
        }

        // Build base query with joins
        const baseQuery = this.db
            .select({
                id: paymentInstruments.id,
                fdrCreationDate: instrumentFdrDetails.fdrDate,
                fdrNo: instrumentFdrDetails.fdrNo,
                beneficiaryName: paymentInstruments.favouring,
                fdrAmount: paymentInstruments.amount,
                tenderName: tenderInfos.tenderName,
                projectName: paymentRequests.projectName,
                projectNo: paymentRequests.tenderNo,
                tenderNo: tenderInfos.tenderNo,
                tenderStatus: statuses.name,
                teamMember: users.name,
                source: instrumentFdrDetails.fdrSource,
                expiry: instrumentFdrDetails.fdrExpiryDate,
                fdrStatus: paymentInstruments.status,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .innerJoin(instrumentFdrDetails, eq(instrumentFdrDetails.instrumentId, paymentInstruments.id))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status));

        // Data query
        const rows = await baseQuery
            .where(and(...conditions))
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset);

        // Count query
        const countQuery = this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .innerJoin(instrumentFdrDetails, eq(instrumentFdrDetails.instrumentId, paymentInstruments.id))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status));

        const [countResult] = await countQuery.where(and(...conditions));

        const total = Number(countResult?.count || 0);

        const data: FdrDashboardRow[] = rows.map(row => ({
            id: row.id,
            fdrCreationDate: row.fdrCreationDate ? new Date(row.fdrCreationDate) : null,
            fdrNo: row.fdrNo,
            beneficiaryName: row.beneficiaryName,
            fdrAmount: row.fdrAmount ? Number(row.fdrAmount) : null,
            tenderName: row.tenderName || row.projectName,
            tenderNo: row.tenderNo || row.projectNo,
            tenderStatus: row.tenderStatus || row.tenderStatus,
            member: row.teamMember?.toString() ?? null,
            expiry: row.expiry ? new Date(row.expiry) : null,
            fdrStatus: this.statusMap()[row.fdrStatus],
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    async getDashboardCounts(): Promise<FdrDashboardCounts> {
        const pending = await this.countFdrByConditions(this.buildFdrDashboardConditions("pending").conditions, this.buildFdrDashboardConditions("pending").needsFdrDetails);

        const rejected = await this.countFdrByConditions(this.buildFdrDashboardConditions("rejected").conditions, this.buildFdrDashboardConditions("rejected").needsFdrDetails);

        const returned = await this.countFdrByConditions(this.buildFdrDashboardConditions("returned").conditions, this.buildFdrDashboardConditions("returned").needsFdrDetails);

        const cancelled = await this.countFdrByConditions(this.buildFdrDashboardConditions("cancelled").conditions, this.buildFdrDashboardConditions("cancelled").needsFdrDetails);

        const pnbBgLinked = await this.countFdrByConditions(
            this.buildFdrDashboardConditions("pnb-bg-linked").conditions,
            this.buildFdrDashboardConditions("pnb-bg-linked").needsFdrDetails
        );

        const yblBgLinked = await this.countFdrByConditions(
            this.buildFdrDashboardConditions("ybl-bg-linked").conditions,
            this.buildFdrDashboardConditions("ybl-bg-linked").needsFdrDetails
        );

        const securityDeposit = await this.countFdrByConditions(
            this.buildFdrDashboardConditions("security-deposit").conditions,
            this.buildFdrDashboardConditions("security-deposit").needsFdrDetails
        );

        const bondLinked = await this.countFdrByConditions(
            this.buildFdrDashboardConditions("bond-linked").conditions,
            this.buildFdrDashboardConditions("bond-linked").needsFdrDetails
        );

        return {
            pending,
            rejected,
            returned,
            cancelled,
            "pnb-bg-linked": pnbBgLinked,
            "ybl-bg-linked": yblBgLinked,
            "security-deposit": securityDeposit,
            "bond-linked": bondLinked,
            total: pending + rejected + returned + cancelled + pnbBgLinked + yblBgLinked + securityDeposit + bondLinked,
        };
    }

    private mapActionToNumber(action: string): number {
        const actionMap: Record<string, number> = {
            "accounts-form": 1,
            "accounts-form-1": 1,
            "initiate-followup": 2,
            "returned-courier": 3,
            "returned-bank-transfer": 4,
            settled: 5,
            "settled-with-project": 5,
            "request-cancellation": 6,
            "fdr-cancellation-confirmation": 7,
            "cancelled-at-branch": 7,
        };
        return actionMap[action] || 1;
    }

    /**
     * Get single file for a field by checking if body field exists or if it's a file path string
     * Files are processed in order as they appear in the files array
     */
    private getFileForField(fieldname: string, files: Express.Multer.File[], body: any, fileIndexTracker: { current: number }): Express.Multer.File | null {
        // Check if body has this field (indicating a file was uploaded)
        if (body[fieldname] !== undefined && files.length > fileIndexTracker.current) {
            const file = files[fileIndexTracker.current];
            fileIndexTracker.current++;
            return file;
        }
        return null;
    }

    /**
     * Get file path from body if it's a string (from TenderFileUploader)
     */
    private getFilePathFromBody(fieldname: string, body: any): string | null {
        if (body[fieldname] && typeof body[fieldname] === "string") {
            return body[fieldname];
        }
        return null;
    }

    async updateAction(instrumentId: number, body: any, files: Express.Multer.File[], user: any) {
        const [instrument] = await this.db.select().from(paymentInstruments).where(eq(paymentInstruments.id, instrumentId)).limit(1);

        if (!instrument) {
            throw new NotFoundException(`Instrument ${instrumentId} not found`);
        }

        if (instrument.instrumentType !== "FDR") {
            throw new BadRequestException("Instrument is not an FDR");
        }

        const actionNumber = this.mapActionToNumber(body.action);
        let contacts: any[] = [];
        if (body.contacts) {
            try {
                contacts = typeof body.contacts === "string" ? JSON.parse(body.contacts) : body.contacts;
            } catch (e) {
                this.logger.warn("Failed to parse contacts", e);
            }
        }

        // Track file index for processing files in order
        const fileIndexTracker = { current: 0 };

        const filePaths: string[] = [];
        if (files && files.length > 0) {
            for (const file of files) {
                const relativePath = `bi-dashboard/${file.filename}`;
                filePaths.push(relativePath);
            }
        }

        const updateData: any = {
            action: actionNumber,
            updatedAt: new Date(),
        };

        if (body.action === "accounts-form" || body.action === "accounts-form-1") {
            if (body.fdr_req === "Accepted") {
                updateData.status = FDR_STATUSES.ACCOUNTS_FORM_ACCEPTED;
            } else if (body.fdr_req === "Rejected") {
                updateData.status = FDR_STATUSES.ACCOUNTS_FORM_REJECTED;
                updateData.rejectionReason = body.reason_req || null;
            }
            // Store file paths from TenderFileUploader (strings) or files
            const fdrFormatImranFile = this.getFileForField("fdr_format_imran", files, body, fileIndexTracker);
            const fdrFormatImranPath = this.getFilePathFromBody("fdr_format_imran", body);
            if (fdrFormatImranFile) {
                updateData.legacyData = {
                    ...(instrument.legacyData || {}),
                    fdr_format_imran: `bi-dashboard/${fdrFormatImranFile.filename}`,
                };
            } else if (fdrFormatImranPath) {
                updateData.legacyData = {
                    ...(instrument.legacyData || {}),
                    fdr_format_imran: fdrFormatImranPath,
                };
            }
            // Store prefilled_signed_fdr files (can be array of paths or files)
            if (body.prefilled_signed_fdr) {
                try {
                    const prefilledFiles = typeof body.prefilled_signed_fdr === "string" ? JSON.parse(body.prefilled_signed_fdr) : body.prefilled_signed_fdr;
                    if (Array.isArray(prefilledFiles) && prefilledFiles.length > 0) {
                        updateData.legacyData = {
                            ...(instrument.legacyData || {}),
                            ...(updateData.legacyData || {}),
                            prefilled_signed_fdr: JSON.stringify(prefilledFiles),
                        };
                    }
                } catch (e) {
                    this.logger.warn("Failed to parse prefilled_signed_fdr", e);
                }
            }
        } else if (body.action === "accounts-form-2") {
            updateData.status = FDR_STATUSES.ACCOUNTS_FORM_ACCEPTED;
        } else if (body.action === "accounts-form-3") {
            updateData.status = FDR_STATUSES.ACCOUNTS_FORM_ACCEPTED;
        } else if (body.action === "initiate-followup") {
            updateData.status = FDR_STATUSES.FOLLOWUP_INITIATED;
        } else if (body.action === "returned-courier") {
            updateData.status = FDR_STATUSES.COURIER_RETURN_RECEIVED;
            // Handle docket_slip file or path
            const docketSlipFile = this.getFileForField("docket_slip", files, body, fileIndexTracker);
            const docketSlipPath = this.getFilePathFromBody("docket_slip", body);
            if (docketSlipFile) {
                updateData.docketSlip = `bi-dashboard/${docketSlipFile.filename}`;
            } else if (docketSlipPath) {
                updateData.docketSlip = docketSlipPath;
            } else if (filePaths.length > 0) {
                updateData.docketSlip = filePaths[0];
            }
        } else if (body.action === "returned-bank-transfer") {
            updateData.status = FDR_STATUSES.BANK_RETURN_COMPLETED;
            if (body.transfer_date) updateData.transferDate = body.transfer_date;
            if (body.utr) updateData.utr = body.utr;
        } else if (body.action === "settled" || body.action === "settled-with-project") {
            updateData.status = FDR_STATUSES.PROJECT_SETTLEMENT_COMPLETED;
        } else if (body.action === "request-cancellation") {
            updateData.status = FDR_STATUSES.CANCELLATION_REQUESTED;
            // Handle covering letter file or path
            const coveringLetterFile = this.getFileForField("covering_letter", files, body, fileIndexTracker);
            const coveringLetterPath = this.getFilePathFromBody("covering_letter", body);
            if (coveringLetterFile) {
                updateData.coveringLetter = `bi-dashboard/${coveringLetterFile.filename}`;
            } else if (coveringLetterPath) {
                updateData.coveringLetter = coveringLetterPath;
            }
            // Handle req_receive file or path
            const reqReceiveFile = this.getFileForField("req_receive", files, body, fileIndexTracker);
            const reqReceivePath = this.getFilePathFromBody("req_receive", body);
            if (reqReceiveFile) {
                updateData.reqReceive = `bi-dashboard/${reqReceiveFile.filename}`;
            } else if (reqReceivePath) {
                updateData.reqReceive = reqReceivePath;
            }
            // Store cancellation remarks
            if (body.cancellation_remarks) {
                updateData.legacyData = {
                    ...(instrument.legacyData || {}),
                    cancellation_remarks: body.cancellation_remarks,
                };
            }
        } else if (body.action === "fdr-cancellation-confirmation" || body.action === "cancelled-at-branch") {
            updateData.status = FDR_STATUSES.CANCELLED_AT_BRANCH;
            // Store cancellation details in legacyData
            if (body.fdr_cancellation_date || body.fdr_cancellation_amount || body.fdr_cancellation_reference_no) {
                updateData.legacyData = {
                    ...(instrument.legacyData || {}),
                    fdr_cancellation_date: body.fdr_cancellation_date || null,
                    fdr_cancellation_amount: body.fdr_cancellation_amount || null,
                    fdr_cancellation_reference_no: body.fdr_cancellation_reference_no || null,
                };
            }
        }

        await this.db.update(paymentInstruments).set(updateData).where(eq(paymentInstruments.id, instrumentId));

        const fdrDetailsUpdate: any = {};
        if (body.action === "accounts-form" || body.action === "accounts-form-1") {
            if (body.fdr_no) fdrDetailsUpdate.fdrNo = body.fdr_no;
            if (body.fdr_date) fdrDetailsUpdate.fdrDate = body.fdr_date;
            if (body.fdr_validity) fdrDetailsUpdate.fdrExpiryDate = body.fdr_validity;
            if (body.fdr_percentage) fdrDetailsUpdate.marginPercent = body.fdr_percentage;
            if (body.fdr_amount) fdrDetailsUpdate.fdrAmt = body.fdr_amount;
            if (body.fdr_roi) fdrDetailsUpdate.roi = body.fdr_roi;
            // Store charges in legacyData (schema doesn't have charge fields)
            if (body.fdr_charges || body.sfms_charges || body.stamp_charges || body.other_charges) {
                updateData.legacyData = {
                    ...(instrument.legacyData || {}),
                    ...(updateData.legacyData || {}),
                    fdr_charges: body.fdr_charges || null,
                    sfms_charges: body.sfms_charges || null,
                    stamp_charges: body.stamp_charges || null,
                    other_charges: body.other_charges || null,
                };
            }
        } else if (body.action === "accounts-form-2") {
            if (body.fdr_no) fdrDetailsUpdate.fdrNo = body.fdr_no;
            if (body.fdr_date) fdrDetailsUpdate.fdrDate = body.fdr_date;
            if (body.fdr_validity) fdrDetailsUpdate.fdrExpiryDate = body.fdr_validity;
            if (body.req_no) fdrDetailsUpdate.reqNo = body.req_no;
            if (body.remarks) fdrDetailsUpdate.fdrRemark = body.remarks;
        } else if (body.action === "accounts-form-3") {
            if (body.fdr_percentage) fdrDetailsUpdate.marginPercent = body.fdr_percentage;
            if (body.fdr_amount) fdrDetailsUpdate.fdrAmt = body.fdr_amount;
            if (body.fdr_roi) fdrDetailsUpdate.roi = body.fdr_roi;
            // Handle sfms_confirmation file or path
            const sfmsConfFile = this.getFileForField("sfms_confirmation", files, body, fileIndexTracker);
            const sfmsConfPath = this.getFilePathFromBody("sfms_confirmation", body);
            if (sfmsConfFile) {
                updateData.legacyData = {
                    ...(instrument.legacyData || {}),
                    sfms_confirmation: `bi-dashboard/${sfmsConfFile.filename}`,
                };
            } else if (sfmsConfPath) {
                updateData.legacyData = {
                    ...(instrument.legacyData || {}),
                    sfms_confirmation: sfmsConfPath,
                };
            }
            // Store charges in legacyData
            if (body.fdr_charges || body.sfms_charges || body.stamp_charges || body.other_charges) {
                updateData.legacyData = {
                    ...(instrument.legacyData || {}),
                    ...(updateData.legacyData || {}),
                    fdr_charges: body.fdr_charges || null,
                    sfms_charges: body.sfms_charges || null,
                    stamp_charges: body.stamp_charges || null,
                    other_charges: body.other_charges || null,
                };
            }
        } else if (body.action === "request-extension") {
            // Store request letter/email file or path
            const requestLetterFile = this.getFileForField("request_letter_email", files, body, fileIndexTracker);
            const requestLetterPath = this.getFilePathFromBody("request_letter_email", body);
            if (requestLetterFile) {
                updateData.legacyData = {
                    ...(instrument.legacyData || {}),
                    request_letter_email: `bi-dashboard/${requestLetterFile.filename}`,
                };
            } else if (requestLetterPath) {
                updateData.legacyData = {
                    ...(instrument.legacyData || {}),
                    request_letter_email: requestLetterPath,
                };
            }
            // Store modification fields if provided
            if (body.modification_fields) {
                try {
                    const modFields = typeof body.modification_fields === "string" ? JSON.parse(body.modification_fields) : body.modification_fields;
                    if (Array.isArray(modFields) && modFields.length > 0) {
                        updateData.legacyData = {
                            ...(instrument.legacyData || {}),
                            ...(updateData.legacyData || {}),
                            modification_fields: JSON.stringify(modFields),
                        };
                    }
                } catch (e) {
                    this.logger.warn("Failed to parse modification_fields", e);
                }
            }
        }

        if (Object.keys(fdrDetailsUpdate).length > 0) {
            fdrDetailsUpdate.updatedAt = new Date();

            // Check if fdrDetails record exists
            const [existingFdrDetails] = await this.db.select().from(instrumentFdrDetails).where(eq(instrumentFdrDetails.instrumentId, instrumentId)).limit(1);

            if (existingFdrDetails) {
                await this.db.update(instrumentFdrDetails).set(fdrDetailsUpdate).where(eq(instrumentFdrDetails.instrumentId, instrumentId));
            } else {
                // Create new fdrDetails record
                await this.db.insert(instrumentFdrDetails).values({
                    instrumentId,
                    ...fdrDetailsUpdate,
                    createdAt: new Date(),
                });
            }
        }

        // Create follow-up if action is initiate-followup
        if (body.action === "initiate-followup") {
            try {
                // Get payment request and tender info
                const [paymentRequest] = await this.db
                    .select({
                        requestId: paymentRequests.id,
                        tenderId: paymentRequests.tenderId,
                    })
                    .from(paymentRequests)
                    .where(eq(paymentRequests.id, instrument.requestId))
                    .limit(1);

                if (paymentRequest) {
                    const [tenderInfo] = await this.db
                        .select({
                            teamId: tenderInfos.team,
                            teamMemberId: tenderInfos.teamMember,
                        })
                        .from(tenderInfos)
                        .where(eq(tenderInfos.id, paymentRequest.tenderId))
                        .limit(1);

                    if (tenderInfo) {
                        // Get team name
                        const [team] = await this.db.select({ name: teams.name }).from(teams).where(eq(teams.id, tenderInfo.teamId)).limit(1);

                        // Map team name to area format (AC → 'AC Team', Accounts → 'Accounts', others → '{team} Team')
                        let area = "DC Team";
                        if (team?.name === "AC") {
                            area = "AC Team";
                        } else if (team?.name === "Accounts") {
                            area = "Accounts";
                        } else if (team?.name) {
                            area = `${team.name} Team`;
                        }

                        // Identify proof image from files
                        let proofImagePath: string | null = null;
                        const proofImageFile = this.getFileForField("proof_image", files, body, fileIndexTracker);
                        const proofImagePathFromBody = this.getFilePathFromBody("proof_image", body);
                        if (proofImageFile) {
                            proofImagePath = proofImageFile.filename;
                        } else if (proofImagePathFromBody) {
                            proofImagePath = proofImagePathFromBody;
                        }

                        // Map contacts to ContactPersonDto format and filter out invalid ones
                        const mappedContacts = contacts
                            .filter(contact => contact.name && contact.name.trim().length > 0)
                            .map(contact => ({
                                name: contact.name.trim(),
                                email: contact.email || null,
                                phone: contact.phone || null,
                                org: contact.org || null,
                            }));

                        if (mappedContacts.length === 0) {
                            throw new BadRequestException("At least one valid contact with name is required");
                        }

                        // Create followup DTO
                        const followUpDto: CreateFollowUpDto = {
                            area,
                            partyName: body.organisation_name || "",
                            amount: instrument.amount ? Number(instrument.amount) : 0,
                            followupFor: "FDR",
                            assignedToId: tenderInfo.teamMemberId || null,
                            emdId: paymentRequest.requestId,
                            contacts: mappedContacts,
                            frequency: body.frequency ? Number(body.frequency) : 1,
                            startFrom: body.followup_start_date || undefined,
                            stopReason: body.stop_reason ? Number(body.stop_reason) : null,
                            proofText: body.proof_text || null,
                            proofImagePath: proofImagePath,
                            stopRemarks: body.stop_remarks || null,
                            attachments: [],
                            createdById: user.id,
                            followUpHistory: [],
                        };

                        await this.followUpService.create(followUpDto, user.id);
                        this.logger.log(`Follow-up created successfully for instrument ${instrumentId}`);
                    }
                }
            } catch (error) {
                this.logger.error(`Failed to create follow-up for instrument ${instrumentId}:`, error);
                // Don't throw - allow the action to complete even if followup creation fails
            }
        }

        return {
            success: true,
            instrumentId,
            action: body.action,
            actionNumber,
        };
    }
}
