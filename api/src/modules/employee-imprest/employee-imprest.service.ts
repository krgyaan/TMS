// employee-imprest.service.ts
import { Inject, Injectable, ForbiddenException, NotFoundException, InternalServerErrorException, BadRequestException } from "@nestjs/common";
import { and, desc, eq, sql } from "drizzle-orm";

import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@db";

import { employeeImprests, employeeImprestTransactions } from "@db/schemas/shared";

import type { CreateEmployeeImprestDto } from "@/modules/employee-imprest/zod/create-employee-imprest.schema";
import type { UpdateEmployeeImprestDto } from "@/modules/employee-imprest/zod/update-employee-imprest.schema";
import { CreateEmployeeImprestCreditDto } from "../imprest-admin/zod/create-employee-imprest-credit.schema";
import { employeeImprestVouchers } from "@/db/schemas/accounts/employee-imprest-voucher";
import { imprestCategories, users } from "@/db/schemas";

const TRANSFER_CATEGORY_ID = 22;
@Injectable()
export class EmployeeImprestService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance,

        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger
    ) {}

    /* ----------------------------- CREATE ----------------------------- */
    async createWithTransfer(data: CreateEmployeeImprestDto, files: Express.Multer.File[]) {
        const isTransfer = Number(data.categoryId) === TRANSFER_CATEGORY_ID;

        this.logger.debug("Logging the dto", {
            dto: data,
        });

        if (!data.userId) {
            throw new Error("No sender user found. Kindly login again");
        }

        if (isTransfer) {
            if (!data.transferToId) {
                throw new BadRequestException("Team member is required for transfer");
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
                        projectName: null, // always null for cat 22
                        amount: data.amount,
                        remark: data.remark,
                        invoiceProof: files.map(f => f.filename),
                        createdAt: new Date(),
                        updatedAt: new Date(),
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
        const [imprest] = await this.db
            .insert(employeeImprests)
            .values({
                ...data,
                invoiceProof: files.map(f => f.filename),
            })
            .returning();

        return imprest;
    }

    /* ----------------------------- READ ------------------------------ */
    async getEmployeeDashboard(userId: number) {
        this.logger.info("Fetching employee dashboard", { userId });

        try {
            // ==============================
            // 1️⃣ Summary (reuse logic pattern)
            // ==============================
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

            const [voucherAgg] = await this.db
                .select({
                    totalVouchers: sql<number>`
          COUNT(${employeeImprestVouchers.id})
        `.as("totalVouchers"),

                    accountsApproved: sql<number>`
          SUM(
            CASE 
              WHEN ${employeeImprestVouchers.accountsSignedBy} IS NOT NULL 
              THEN 1 ELSE 0
            END
          )
        `.as("accountsApproved"),

                    adminApproved: sql<number>`
          SUM(
            CASE 
              WHEN ${employeeImprestVouchers.adminSignedBy} IS NOT NULL 
              THEN 1 ELSE 0
            END
          )
        `.as("adminApproved"),
                })
                .from(employeeImprestVouchers)
                .where(eq(employeeImprestVouchers.beneficiaryName, String(userId)));

            const amountSpent = Number(imprestAgg.amountSpent);
            const amountApproved = Number(imprestAgg.amountApproved);
            const amountReceived = Number(txnAgg.amountReceived);

            // ==============================
            // 2️⃣ Detailed Lists
            // ==============================
            const imprests = await this.db
                .select({
                    id: employeeImprests.id,
                    userId: employeeImprests.userId,

                    categoryId: employeeImprests.categoryId,
                    categoryName: imprestCategories.name,

                    teamId: employeeImprests.teamId,
                    teamName: users.name, // ✅

                    formattedCategory: sql<string>`
                    CASE 
                        WHEN ${employeeImprests.categoryId} = 22 
                        THEN 'Transfer To Team Member - ' || ${users.name}
                        ELSE ${imprestCategories.name}
                    END
                    `.as("formattedCategory"),

                    partyName: employeeImprests.partyName,
                    projectName: employeeImprests.projectName,

                    amount: employeeImprests.amount,
                    remark: employeeImprests.remark,

                    invoiceProof: employeeImprests.invoiceProof,
                    approvalStatus: employeeImprests.approvalStatus,
                    tallyStatus: employeeImprests.tallyStatus,
                    proofStatus: employeeImprests.proofStatus,

                    createdAt: employeeImprests.createdAt,
                })
                .from(employeeImprests)
                .leftJoin(imprestCategories, eq(imprestCategories.id, employeeImprests.categoryId))
                .leftJoin(users, eq(users.id, employeeImprests.teamId)) // ✅ IMPORTANT
                .where(eq(employeeImprests.userId, userId))
                .orderBy(desc(employeeImprests.createdAt));

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
                .leftJoin(
                    employeeImprests,
                    and(eq(employeeImprests.userId, employeeImprestTransactions.userId), eq(employeeImprests.projectName, employeeImprestTransactions.projectName))
                )
                .leftJoin(imprestCategories, eq(imprestCategories.id, employeeImprests.categoryId))
                .where(eq(employeeImprestTransactions.userId, userId))
                .orderBy(desc(employeeImprestTransactions.txnDate));

            this.logger.info("Employee dashboard fetched", {
                userId,
                imprestCount: imprests.length,
                transactionCount: transactions.length,
            });

            return {
                summary: {
                    amountSpent,
                    amountApproved,
                    amountReceived,
                    amountLeft: amountApproved - amountReceived,

                    voucherInfo: {
                        totalVouchers: Number(voucherAgg.totalVouchers),
                        accountsApproved: Number(voucherAgg.accountsApproved),
                        adminApproved: Number(voucherAgg.adminApproved),
                    },
                },
                imprests,
                transactions,
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

    async findOne(id: number) {
        const result = await this.db.select().from(employeeImprests).where(eq(employeeImprests.id, id)).limit(1);

        return result[0] ?? null;
    }

    /* ----------------------------- UPDATE ----------------------------- */
    async update(id: number, data: UpdateEmployeeImprestDto) {
        const existing = await this.findOne(id);

        if (!existing) {
            throw new NotFoundException("Employee imprest not found");
        }

        const oldIsTransfer = Number(existing.categoryId) === TRANSFER_CATEGORY_ID;
        const newIsTransfer = Number(data.categoryId ?? existing.categoryId) === TRANSFER_CATEGORY_ID;

        return await this.db.transaction(async tx => {

            // =========================
            // 1️⃣ CHECK LINKED TRANSACTION
            // =========================
            const existingTxn = await tx.query.employeeImprestTransactions.findFirst({
                where: eq(employeeImprestTransactions.imprestId, id),
            });

            const hasLinkedTxn = !!existingTxn;

            if (oldIsTransfer && !hasLinkedTxn) {
                throw new BadRequestException(
                    "This transfer cannot be edited because it was created before system upgrade. Please delete and recreate it."
                );
            }

            // =========================
            // 2️⃣ DETERMINE ACTIONS
            // =========================
            const isReceiverChanged = data.teamId !== undefined && data.teamId !== existing.teamId;
            const isAmountChanged = data.amount !== undefined && data.amount !== existing.amount;

            const shouldDeleteOld =
                oldIsTransfer &&
                (
                    !newIsTransfer ||      // transfer → non-transfer
                    isReceiverChanged      // receiver changed
                );

            // =========================
            // 3️⃣ DELETE OLD TRANSFER (if needed)
            // =========================
            if (shouldDeleteOld) {
                const deleted = await tx
                    .delete(employeeImprestTransactions)
                    .where(eq(employeeImprestTransactions.imprestId, id))
                    .returning();

                if (deleted.length === 0) {
                    throw new BadRequestException(
                        "Unable to update transfer: linked transaction not found."
                    );
                }
            }

            // =========================
            // 4️⃣ UPDATE IMPREST
            // =========================
            const updateData: Record<string, any> = {
                updatedAt: new Date(),
            };

            if (data.userId !== undefined) updateData.userId = data.userId;
            if (data.partyName !== undefined) updateData.partyName = data.partyName;
            if (data.projectName !== undefined) updateData.projectName = data.projectName;
            if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
            if (data.teamId !== undefined) updateData.teamId = data.teamId;
            if (data.amount !== undefined) updateData.amount = data.amount;
            if (data.remark !== undefined) updateData.remark = data.remark;

            if (data.approvalStatus !== undefined) updateData.approvalStatus = data.approvalStatus;
            if (data.proofStatus !== undefined) updateData.proofStatus = data.proofStatus;
            if (data.tallyStatus !== undefined) updateData.tallyStatus = data.tallyStatus;
            if (data.status !== undefined) updateData.status = data.status;
            if (data.approvedDate !== undefined) updateData.approvedDate = data.approvedDate;

            const [updated] = await tx
                .update(employeeImprests)
                .set(updateData)
                .where(eq(employeeImprests.id, id))
                .returning();

            // =========================
            // 5️⃣ HANDLE TRANSFER LOGIC
            // =========================

            // ➕ CREATE (non-transfer → transfer)
            if (!oldIsTransfer && newIsTransfer) {
                const receiverId = data.teamId;
                
                if(!updated.userId){
                    throw new BadRequestException("User ID missing for transfer");
                }
                
                if (!receiverId) {
                    throw new BadRequestException("Transfer requires a team member");
                }

                const [sender] = await tx
                    .select({ name: users.name })
                    .from(users)
                    .where(eq(users.id, updated.userId))
                    .limit(1);

                const [receiver] = await tx
                    .select({ name: users.name })
                    .from(users)
                    .where(eq(users.id, receiverId))
                    .limit(1);

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

            // ✏️ UPDATE AMOUNT ONLY
            else if (oldIsTransfer && newIsTransfer && isAmountChanged && !isReceiverChanged) {
                await tx
                    .update(employeeImprestTransactions)
                    .set({
                        amount: data.amount,
                        updatedAt: new Date(),
                    })
                    .where(eq(employeeImprestTransactions.imprestId, id));
            }

            // 🔁 RECREATE (receiver changed)
            else if (oldIsTransfer && newIsTransfer && isReceiverChanged) {
                const receiverId = data.teamId!;
                const amount = data.amount ?? existing.amount;

                if(!updated.userId){
                    throw new BadRequestException("User ID not found for the imprest.")
                }

                const [sender] = await tx
                    .select({ name: users.name })
                    .from(users)
                    .where(eq(users.id, updated.userId))
                    .limit(1);

                const [receiver] = await tx
                    .select({ name: users.name })
                    .from(users)
                    .where(eq(users.id, receiverId))
                    .limit(1);

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

            return updated;
        });
    }

    private async deleteExistingTransfer(tx: any, existing: any) {
        const deleted = await tx
            .delete(employeeImprestTransactions)
            .where(eq(employeeImprestTransactions.imprestId, existing.id))
            .returning();

        if (deleted.length === 0) {
            throw new BadRequestException(
                "Unable to delete transfer: linked transaction not found. This record may be legacy or inconsistent."
            );
        }
    }
    
    /* ------------------------- UPLOAD DOCUMENTS ------------------------ */
    async uploadDocs(id: number, files: Express.Multer.File[], userId: number) {
        const existing = await this.findOne(id);
        if (!existing) {
            throw new NotFoundException("Employee imprest not found");
        }

        if (!files || files.length === 0) {
            throw new BadRequestException("No files uploaded");
        }

        // 🛑 Guardrail (never silently fix bad data)
        if (!Array.isArray(existing.invoiceProof)) {
            throw new InternalServerErrorException("invoiceProof is corrupted (expected JSON array)");
        }

        const updatedDocs = [...existing.invoiceProof, ...files.map(f => f.filename)];

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

        await this.db
            .update(employeeImprests)
            .set({
                approvalStatus: newStatus,
                approvedDate: newStatus === 1 ? new Date() : null,
            })
            .where(eq(employeeImprests.id, imprestId));

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

        await this.db.delete(employeeImprests).where(eq(employeeImprests.id, id));

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

    
}
