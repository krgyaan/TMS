import type { DataScope } from "@/common/constants/roles.constant";
import { DRIZZLE } from "@/db/database.module";
import { imprestCategories, users } from "@/db/schemas";
import { employeeImprestVouchers } from "@/db/schemas/accounts/employee-imprest-voucher";
import { PermissionService } from "@/modules/auth/services/permission.service";
import type { CreateEmployeeImprestDto } from "@/modules/employee-imprest/zod/create-employee-imprest.schema";
import type { UpdateEmployeeImprestDto } from "@/modules/employee-imprest/zod/update-employee-imprest.schema";
import { InsurancePolicyService } from "@/modules/insurance/insurance-policy.service";
import { insurancePayloadSchema, type InsurancePayload } from "@/modules/insurance/zod/insurance-policy.schema";
import { wrapPaginatedResponse } from "@/utils/responseWrapper";
import type { DbInstance } from "@db";
import { employeeImprests, employeeImprestTransactions } from "@db/schemas/shared";
import { projects } from "@/db/schemas/master/projects.schema";
import { BadRequestException, ForbiddenException, Inject, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ImprestAdminService } from "@/modules/imprest-admin/imprest-admin.service";
const TRANSFER_CATEGORY_ID = 22;
const INSURANCE_CATEGORY_ID = 8;
const WEEK_LOCK_EXEMPT_PERMISSION = { module: "shared.imprests", action: "week-lock-exempt" } as const;

export type ImprestActorUser = {
    sub?: number;
    roleId?: number | null;
    role?: string | null;
    roleName?: string | null;
    teamId?: number | null;
    dataScope?: DataScope;
};

@Injectable()
export class EmployeeImprestService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance,
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger,
        private readonly permissionService: PermissionService,
        private readonly insurancePolicyService: InsurancePolicyService,
        private readonly imprestAdminService: ImprestAdminService
    ) {}

    /* ----------------------- WEEK LOCK GUARD ------------------------ */
    private async assertExpenseWeekNotLocked({
        beneficiaryUserId,
        expenseDate,
        actorUser,
    }: {
        beneficiaryUserId?: number | null;
        expenseDate?: Date | null;
        actorUser?: ImprestActorUser | null;
    }) {
        if (!expenseDate || !beneficiaryUserId) {
            return;
        }

        const isExempt = actorUser?.sub
            ? await this.permissionService.hasPermission(
                  {
                      userId: actorUser.sub,
                      roleId: actorUser.roleId ?? null,
                      roleName: actorUser.role ?? actorUser.roleName ?? null,
                      teamId: actorUser.teamId ?? null,
                      dataScope: (actorUser.dataScope ?? "self") as DataScope,
                  },
                  WEEK_LOCK_EXEMPT_PERMISSION
              )
            : false;

        if (isExempt) {
            return;
        }

        // [commented out] Allow approved week voucher for all users for now
        const [lockedVoucher] = await this.db
            .select({ voucherCode: employeeImprestVouchers.voucherCode })
            .from(employeeImprestVouchers)
            .where(
                and(
                    eq(employeeImprestVouchers.beneficiaryName, String(beneficiaryUserId)),
                    sql`TRIM(COALESCE(${employeeImprestVouchers.accountsSignedBy}, '')) <> ''`,
                    sql`EXTRACT(ISOYEAR FROM ${employeeImprestVouchers.validFrom}) = EXTRACT(ISOYEAR FROM CAST(${expenseDate} AS TIMESTAMP))`,
                    sql`EXTRACT(WEEK FROM ${employeeImprestVouchers.validFrom}) = EXTRACT(WEEK FROM CAST(${expenseDate} AS TIMESTAMP))`
                )
            )
            .limit(1);

        if (lockedVoucher) {
            throw new ForbiddenException(
                `Expenses for the week of ${expenseDate.toISOString().split("T")[0]} are locked: voucher ${lockedVoucher.voucherCode} is already approved by accounts.`
            );
        }
    }

    /* ----------------------------- CREATE ----------------------------- */
    async createWithTransfer(data: CreateEmployeeImprestDto, files: string[], actorUser?: ImprestActorUser) {
        const isTransfer = Number(data.categoryId) === TRANSFER_CATEGORY_ID;

        this.logger.debug("Logging the dto", {
            dto: data,
        });

        if (!data.userId) {
            throw new Error("No sender user found. Kindly login again");
        }

        await this.assertExpenseWeekNotLocked({
            beneficiaryUserId: data.userId,
            expenseDate: data.dateOfExpense,
            actorUser,
        });

        if (isTransfer) {
            if (!data.transferToId) {
                throw new BadRequestException("Team member is required for transfer");
            }

            // Fetch project ID from projectName if provided
            let resolvedProjectId: number | null = null;
            let resolvedProjectName: string | null = null;
            if (data.projectName) {
                const [project] = await this.db
                    .select({ id: projects.id, projectName: projects.projectName })
                    .from(projects)
                    .where(ilike(projects.projectName, data.projectName))
                    .limit(1);
                if (project) {
                    resolvedProjectId = project.id;
                    resolvedProjectName = project.projectName;
                }
            }

            // Fetch sender name from DB — never trust client for this
            const [sender] = await this.db.select({ name: users.name }).from(users).where(eq(users.id, data.userId)).limit(1);

            // Fetch receiver name from DB — never trust client for this
            const [receiver] = await this.db.select({ name: users.name }).from(users).where(eq(users.id, data.transferToId)).limit(1);

            if (!receiver) {
                throw new BadRequestException("Selected team member not found");
            }

            const senderName = sender?.name ?? "Unknown";
            const receiverName = receiver.name;

            // Both inserts wrapped in a transaction — if one fails, both roll back
            return await this.db.transaction(async tx => {
                // Record 1: Imprest expense for the sender
                const [imprest] = await tx
                    .insert(employeeImprests)
                    .values({
                        userId: data.userId,
                        categoryId: data.categoryId,
                        teamId: isTransfer ? Number(data.transferToId) : null,
                        partyName: null, // always null for cat 22
                        projectId: resolvedProjectId,
                        projectName: resolvedProjectName, // always null for cat 22
                        amount: data.amount,
                        remark: data.remark,
                        invoiceProof: files,
                        dateOfExpense: data.dateOfExpense,
                    })
                    .returning();

                // Record 2: Credit the receiver in employee_imprest_transactions
                await tx.insert(employeeImprestTransactions).values({
                    userId: data.transferToId!,
                    txnDate: new Date().toISOString().split("T")[0],
                    teamMemberName: receiverName,
                    amount: data.amount,
                    projectName: `Transfered from ${senderName}`,
                    imprestId: imprest.id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

                return imprest;
            });
        }

        // Normal flow — any other category
        const imprest = await this.db.transaction(async tx => {
            // Resolve projectId from projectName if provided
            let resolvedProjectId: number | null = null;
            let resolvedProjectName: string | null = null;
            if (data.projectName) {
                const [project] = await this.db
                    .select({ id: projects.id, projectName: projects.projectName })
                    .from(projects)
                    .where(ilike(projects.projectName, data.projectName))
                    .limit(1);
                if (project) {
                    resolvedProjectId = project.id;
                    resolvedProjectName = project.projectName;
                }
            }

            const [created] = await tx
                .insert(employeeImprests)
                .values({
                    userId: data.userId,
                    categoryId: data.categoryId,
                    partyName: data.partyName,
                    projectId: resolvedProjectId,
                    projectName: resolvedProjectName,
                    amount: data.amount,
                    remark: data.remark,
                    invoiceProof: files,
                    dateOfExpense: data.dateOfExpense,
                })
                .returning();

            const insurance = this.parseInsurancePayload(data.insurance);

            if (insurance) {
                await this.insurancePolicyService.createFromImprest(tx, insurance, created.id, actorUser?.sub ?? data.userId ?? 0, created.projectId ?? undefined);
            }

            return created;
        });

        return imprest;
    }

    private parseInsurancePayload(raw?: string | null): InsurancePayload | null {
        if (!raw || raw.trim() === "") {
            return null;
        }

        const parsed = insurancePayloadSchema.safeParse(raw);

        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten());
        }

        return parsed.data;
    }

    /* ----------------------------- READ ------------------------------ */
    async getEmployeeDashboard(userId: number, pagination?: { page?: number; limit?: number; search?: string }) {
        this.logger.info("Fetching employee dashboard", { userId });

        try {
            const page = Math.max(1, pagination?.page ?? 1);
            const limit = Math.max(1, Math.min(pagination?.limit ?? 50, 100));
            const offset = (page - 1) * limit;
            const search = pagination?.search?.trim();

            const [user] = await this.db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);

            const [imprestAgg] = await this.db
                .select({
                    amountSpent: sql<number>`
          COALESCE(SUM(${employeeImprests.amount}), 0)
        `.as("amountSpent"),

                    amountApproved: sql<number>`
          COALESCE(
            SUM(
              CASE 
                WHEN ${employeeImprests.approvalStatus} = 1
                THEN ${employeeImprests.amount}
                ELSE 0
              END
            ),
          0)
        `.as("amountApproved"),
                })
                .from(employeeImprests)
                .where(eq(employeeImprests.userId, userId));

            const [txnAgg] = await this.db
                .select({
                    amountReceived: sql<number>`
          COALESCE(SUM(${employeeImprestTransactions.amount}), 0)
        `.as("amountReceived"),
                })
                .from(employeeImprestTransactions)
                .where(eq(employeeImprestTransactions.userId, userId));

            const amountSpent = Number(imprestAgg.amountSpent);
            const amountApproved = Number(imprestAgg.amountApproved);
            const amountReceived = Number(txnAgg.amountReceived);

            // ==============================
            // 2️⃣ Detailed Lists
            // ==============================
            const searchCondition = search
                ? or(ilike(employeeImprests.partyName, `%${search}%`), ilike(employeeImprests.projectName, `%${search}%`), ilike(employeeImprests.remark, `%${search}%`))
                : undefined;

            const [countRow] = await this.db
                .select({ total: sql<number>`COUNT(*)`.as("total") })
                .from(employeeImprests)
                .where(and(eq(employeeImprests.userId, userId), searchCondition));

            const imprests = await this.db
                .select({
                    id: employeeImprests.id,

                    categoryName: imprestCategories.name,

                    teamId: employeeImprests.teamId,
                    teamName: users.name, // ✅

                    partyName: employeeImprests.partyName,
                    projectName: employeeImprests.projectName,

                    amount: employeeImprests.amount,
                    remark: employeeImprests.remark,

                    invoiceProof: employeeImprests.invoiceProof,
                    approvalStatus: employeeImprests.approvalStatus,
                    accRemark: employeeImprests.accRemark,
                    tallyStatus: employeeImprests.tallyStatus,
                    proofStatus: employeeImprests.proofStatus,

                    dateOfExpense: employeeImprests.dateOfExpense,
                    createdAt: employeeImprests.createdAt,
                    insurancePolicyId: employeeImprests.insurancePolicyId,
                })
                .from(employeeImprests)
                .leftJoin(imprestCategories, eq(imprestCategories.id, employeeImprests.categoryId))
                .leftJoin(users, eq(users.id, employeeImprests.teamId)) // ✅ IMPORTANT
                .where(and(eq(employeeImprests.userId, userId), searchCondition))
                .orderBy(desc(employeeImprests.createdAt))
                .limit(limit)
                .offset(offset);

            this.logger.info("Employee dashboard fetched", {
                userId,
                imprestCount: imprests.length,
            });

            return {
                summary: {
                    userName: user?.name ?? "User",
                    amountSpent,
                    amountApproved,
                    amountReceived,
                    amountLeft: amountApproved - amountReceived,
                },
                imprests: wrapPaginatedResponse(imprests, Number(countRow?.total ?? 0), page, limit),
            };
        } catch (error: any) {
            this.logger.error("Failed to fetch employee dashboard", {
                userId,
                message: error?.message,
                stack: error?.stack,
            });

            throw error;
        }
    }

    /* ------------------------- TRANSACTIONS ------------------------- */
    async getTransactions(userId: number) {
        const transactions = await this.db
            .select({
                id: employeeImprestTransactions.id,
                userId: employeeImprestTransactions.userId,
                txnDate: employeeImprestTransactions.txnDate,
                teamMemberName: employeeImprestTransactions.teamMemberName,
                projectName: employeeImprestTransactions.projectName,
                amount: employeeImprestTransactions.amount,
                createdAt: employeeImprestTransactions.createdAt,
                updatedAt: employeeImprestTransactions.updatedAt,

                categoryName: imprestCategories.name,
            })
            .from(employeeImprestTransactions)
            .leftJoin(employeeImprests, eq(employeeImprests.id, employeeImprestTransactions.imprestId))
            .leftJoin(imprestCategories, eq(imprestCategories.id, employeeImprests.categoryId))
            .where(eq(employeeImprestTransactions.userId, userId))
            .orderBy(desc(employeeImprestTransactions.txnDate));

        return transactions;
    }

    async findOne(id: number) {
        const result = await this.db.query.employeeImprests.findFirst({
            where: eq(employeeImprests.id, id),
            with: { insurancePolicy: true },
        });

        return result ?? null;
    }

    /* ----------------------------- UPDATE ----------------------------- */
    async update(id: number, data: UpdateEmployeeImprestDto, actorUser?: ImprestActorUser) {
        const existing = await this.findOne(id);

        if (!existing) {
            throw new NotFoundException("Employee imprest not found");
        }

        await this.assertExpenseWeekNotLocked({
            beneficiaryUserId: data.userId ?? existing.userId,
            expenseDate: data.dateOfExpense ?? existing.dateOfExpense,
            actorUser,
        });

        const oldIsTransfer = Number(existing.categoryId) === TRANSFER_CATEGORY_ID;
        const newIsTransfer = Number(data.categoryId ?? existing.categoryId) === TRANSFER_CATEGORY_ID;

        const updated = await this.db.transaction(async tx => {
            const existingTxn = await tx.query.employeeImprestTransactions.findFirst({
                where: eq(employeeImprestTransactions.imprestId, id),
            });

            const hasLinkedTxn = !!existingTxn;

            if (oldIsTransfer && !hasLinkedTxn) {
                throw new BadRequestException("This transfer cannot be edited because it was created before system upgrade. Please delete and recreate it.");
            }

            const isReceiverChanged = data.teamId !== undefined && data.teamId !== existing.teamId;
            const isAmountChanged = data.amount !== undefined && data.amount !== existing.amount;

            const shouldDeleteOld =
                oldIsTransfer &&
                (!newIsTransfer || // transfer → non-transfer
                    isReceiverChanged); // receiver changed

            if (shouldDeleteOld) {
                const deleted = await tx.delete(employeeImprestTransactions).where(eq(employeeImprestTransactions.imprestId, id)).returning();

                if (deleted.length === 0) {
                    throw new BadRequestException("Unable to update transfer: linked transaction not found.");
                }
            }

            const updateData: Record<string, any> = {
                updatedAt: new Date(),
            };

            // Resolve projectId from projectName if provided
            let resolvedProjectId: number | null = null;
            let resolvedProjectName: string | null = null;
            if (data.projectName !== undefined) {
                if (data.projectName) {
                    const [project] = await this.db
                        .select({ id: projects.id, projectName: projects.projectName })
                        .from(projects)
                        .where(ilike(projects.projectName, data.projectName))
                        .limit(1);
                    if (project) {
                        resolvedProjectId = project.id;
                        resolvedProjectName = project.projectName;
                    }
                }
                updateData.projectName = resolvedProjectName;
                updateData.projectId = resolvedProjectId;
            } else {
                if (data.partyName !== undefined) updateData.partyName = data.partyName;
                if (data.projectName !== undefined) updateData.projectName = data.projectName;
            }
            if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
            if (data.teamId !== undefined) updateData.teamId = data.teamId;
            if (data.userId !== undefined) updateData.userId = data.userId;
            if (data.amount !== undefined) updateData.amount = data.amount;
            if (data.remark !== undefined) updateData.remark = data.remark;

            if (data.approvalStatus !== undefined) updateData.approvalStatus = data.approvalStatus;
            if (data.proofStatus !== undefined) updateData.proofStatus = data.proofStatus;
            if (data.tallyStatus !== undefined) updateData.tallyStatus = data.tallyStatus;
            if (data.status !== undefined) updateData.status = data.status;
            if (data.approvedDate !== undefined) updateData.approvedDate = data.approvedDate;
            if (data.dateOfExpense !== undefined) updateData.dateOfExpense = data.dateOfExpense;

            const [updated] = await tx.update(employeeImprests).set(updateData).where(eq(employeeImprests.id, id)).returning();

            // CREATE (non-transfer → transfer)
            if (!oldIsTransfer && newIsTransfer) {
                const receiverId = data.teamId;

                if (!updated.userId) {
                    throw new BadRequestException("User ID missing for transfer");
                }

                if (!receiverId) {
                    throw new BadRequestException("Transfer requires a team member");
                }

                const [sender] = await tx.select({ name: users.name }).from(users).where(eq(users.id, updated.userId)).limit(1);

                const [receiver] = await tx.select({ name: users.name }).from(users).where(eq(users.id, receiverId)).limit(1);

                await tx.insert(employeeImprestTransactions).values({
                    imprestId: updated.id,
                    userId: receiverId,
                    txnDate: new Date().toISOString().split("T")[0],
                    teamMemberName: receiver?.name ?? "Unknown",
                    amount: updated.amount,
                    projectName: `Transfered from ${sender?.name ?? "Unknown"}`,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }

            // UPDATE AMOUNT ONLY
            else if (oldIsTransfer && newIsTransfer && isAmountChanged && !isReceiverChanged) {
                await tx
                    .update(employeeImprestTransactions)
                    .set({
                        amount: data.amount,
                        updatedAt: new Date(),
                    })
                    .where(eq(employeeImprestTransactions.imprestId, id));
            }

            // RECREATE (receiver changed)
            else if (oldIsTransfer && newIsTransfer && isReceiverChanged) {
                const receiverId = data.teamId!;
                const amount = data.amount ?? existing.amount;

                if (!updated.userId) {
                    throw new BadRequestException("User ID not found for the imprest.");
                }

                const [sender] = await tx.select({ name: users.name }).from(users).where(eq(users.id, updated.userId)).limit(1);

                const [receiver] = await tx.select({ name: users.name }).from(users).where(eq(users.id, receiverId)).limit(1);

                await tx.insert(employeeImprestTransactions).values({
                    imprestId: updated.id,
                    userId: receiverId,
                    txnDate: new Date().toISOString().split("T")[0],
                    teamMemberName: receiver?.name ?? "Unknown",
                    amount,
                    projectName: `Transfered from ${sender?.name ?? "Unknown"}`,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }

            // (transfer → non-transfer already handled by delete)
            const insurance = this.parseInsurancePayload(data.insurance);
            const newCategoryIsInsurance = Number(data.categoryId ?? existing.categoryId) === INSURANCE_CATEGORY_ID;

            if (newCategoryIsInsurance && insurance) {
                await this.insurancePolicyService.upsertForImprest(tx, updated.id, insurance, actorUser?.sub ?? data.userId ?? 0);
            } else if (!newCategoryIsInsurance && existing.insurancePolicyId) {
                await this.insurancePolicyService.unlinkFromImprest(tx, updated.id);
            }

            return updated;
        });

        // Re-sync voucher membership only when fields that affect a voucher's
        // contents (approval state, amount) actually changed.
        const touchesVoucher =
            data.approvalStatus !== undefined || data.approvedDate !== undefined || data.amount !== undefined;

        if (touchesVoucher) {
            await this.syncVoucherLinksForUpdatedImprest(updated, actorUser);
        }

        return updated;
    }

    /**
     * After an edit, refresh the imprest's voucher linkage: remove it from its
     * previous voucher (if any) and re-attach it to the correct one based on
     * the currently approved state.
     */
    private async syncVoucherLinksForUpdatedImprest(updated: any, actorUser?: ImprestActorUser) {
        const wasModified = updated.approvalStatus === 1 || updated.approvedDate;

        if (updated.approvalStatus === 1) {
            // Rebuild the mapping to the correct acceptance period.
            if (updated.userId) {
                await this.imprestAdminService.removeImprestFromVoucher(updated.id);
                await this.imprestAdminService.ensureVoucherForImprest({
                    imprestId: updated.id,
                    userId: updated.userId,
                    approvedDate: updated.approvedDate ?? updated.createdAt,
                    createdBy: String(actorUser?.sub ?? updated.userId),
                });
            }
        } else if (wasModified) {
            await this.imprestAdminService.removeImprestFromVoucher(updated.id);
        }
    }

    private async deleteExistingTransfer(tx: any, existing: any) {
        const deleted = await tx.delete(employeeImprestTransactions).where(eq(employeeImprestTransactions.imprestId, existing.id)).returning();

        if (deleted.length === 0) {
            throw new BadRequestException("Unable to delete transfer: linked transaction not found. This record may be legacy or inconsistent.");
        }
    }

    /* ------------------------- UPLOAD DOCUMENTS ------------------------ */
    async uploadDocs(id: number, files: string[], userId: number) {
        const existing = await this.findOne(id);
        if (!existing) {
            throw new NotFoundException("Employee imprest not found");
        }

        if (!files || files.length === 0) {
            throw new BadRequestException("No files uploaded");
        }

        // Guardrail (never silently fix bad data)
        if (!Array.isArray(existing.invoiceProof)) {
            throw new InternalServerErrorException("invoiceProof is corrupted (expected JSON array)");
        }

        const updatedDocs = [...existing.invoiceProof, ...files];

        const [updated] = await this.db
            .update(employeeImprests)
            .set({
                invoiceProof: updatedDocs, // ← RAW JSON ARRAY
                updatedAt: new Date(),
            })
            .where(eq(employeeImprests.id, id))
            .returning();

        return updated;
    }

    async proofApprove({ imprestId, userId }: { imprestId: number; userId: number }) {
        const imprest = await this.db.query.employeeImprests.findFirst({
            where: eq(employeeImprests.id, imprestId),
        });

        if (!imprest) {
            throw new NotFoundException("Imprest not found");
        }

        const newStatus = imprest.proofStatus === 1 ? 0 : 1;

        await this.db
            .update(employeeImprests)
            .set({
                proofStatus: newStatus,
            })
            .where(eq(employeeImprests.id, imprestId));

        return {
            success: true,
            message: newStatus === 1 ? "Proof approved successfully" : "Proof approval removed",
        };
    }

    async approveImprest({ imprestId, userId }: { imprestId: number; userId: number }) {
        const imprest = await this.db.query.employeeImprests.findFirst({
            where: eq(employeeImprests.id, imprestId),
        });

        if (!imprest) {
            throw new NotFoundException("Imprest not found");
        }

        const newStatus = imprest.approvalStatus === 1 ? 0 : 1;
        const approvedDate = newStatus === 1 ? new Date() : null;

        await this.db
            .update(employeeImprests)
            .set({
                approvalStatus: newStatus,
                approvedDate,
            })
            .where(eq(employeeImprests.id, imprestId));

        // Keep voucher <-> imprest links in sync: link on approve, unlink on
        // revoke so the explicit join table always mirrors approved entries.
        if (newStatus === 1) {
            if (imprest.userId) {
                await this.imprestAdminService.ensureVoucherForImprest({
                    imprestId,
                    userId: imprest.userId,
                    approvedDate: approvedDate!,
                    createdBy: String(userId),
                });
            }
        } else {
            await this.imprestAdminService.removeImprestFromVoucher(imprestId);
        }

        return {
            success: true,
            message: newStatus === 1 ? "Imprest approved successfully" : "Imprest approval removed",
        };
    }

    async tallyAddImprest({ imprestId, userId }: { imprestId: number; userId: number }) {
        const imprest = await this.db.query.employeeImprests.findFirst({
            where: eq(employeeImprests.id, imprestId),
        });

        if (!imprest) {
            throw new NotFoundException("Imprest not found");
        }

        const newStatus = imprest.tallyStatus === 1 ? 0 : 1;

        await this.db
            .update(employeeImprests)
            .set({
                tallyStatus: newStatus,
            })
            .where(eq(employeeImprests.id, imprestId));

        return {
            success: true,
            message: newStatus === 1 ? "Tally Entry added successfully" : "Tally Entry removed",
        };
    }

    /* ----------------------------- DELETE ------------------------------ */
    async delete(id: number, userId: number) {
        const existing = await this.findOne(id);

        if (!existing) {
            throw new NotFoundException("Employee imprest not found");
        }

        // Unlink from any voucher BEFORE deleting (recomputes the voucher amount
        // and drops the voucher if it becomes empty). Also blocks deletion when
        // the imprest is part of an accounts-signed voucher.
        await this.imprestAdminService.removeImprestFromVoucher(id);

        await this.db.transaction(async tx => {
            if (existing.insurancePolicyId) {
                await this.insurancePolicyService.removeByImprestId(tx, id);
            }

            await tx.delete(employeeImprests).where(eq(employeeImprests.id, id));
        });

        return { success: true };
    }

    async deleteProof(id: number, filename: string, userId: number) {
        const existing = await this.findOne(id);

        if (!existing) {
            throw new NotFoundException("Employee imprest not found");
        }

        if (!Array.isArray(existing.invoiceProof)) {
            throw new InternalServerErrorException("invoiceProof is corrupted");
        }

        const updatedProofs = existing.invoiceProof.filter(f => f !== filename);

        const [updated] = await this.db
            .update(employeeImprests)
            .set({
                invoiceProof: updatedProofs,
                updatedAt: new Date(),
            })
            .where(eq(employeeImprests.id, id))
            .returning();

        // Optionally: delete file from disk
        // const filePath = join('./uploads/employeeimprest', filename);
        // if (existsSync(filePath)) unlinkSync(filePath);

        return updated;
    }

    async addAccountRemark(id, remark) {
        const imprest = await this.db.query.employeeImprests.findFirst({
            where: eq(employeeImprests.id, id),
        });

        if (!imprest) {
            throw new BadRequestException(`Imprest #${id} not Found `);
        }

        //updating the imprest
        try {
            const [updated] = await this.db
                .update(employeeImprests)
                .set({
                    accRemark: remark.trim(),
                    updatedAt: new Date(),
                })
                .where(eq(employeeImprests.id, id))
                .returning();

            this.logger.info("Account remark added", {
                id,
            });

            return {
                success: true,
                message: "Remark added successfully",
                data: updated,
            };
        } catch (error: any) {
            this.logger.error("Failed to add account remark", {
                id,
                message: error?.message,
            });

            throw new InternalServerErrorException("Failed to add remark");
        }
    }
}
