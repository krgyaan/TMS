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
                // Record 1: Credit the receiver in employee_imprest_transactions
                await tx.insert(employeeImprestTransactions).values({
                    userId: data.transferToId!,
                    txnDate: new Date().toISOString().split("T")[0],
                    teamMemberName: receiverName,
                    amount: data.amount,
                    projectName: `Transfered from ${senderName}`,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

                // Record 2: Imprest expense for the sender
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

        const updateData: Record<string, any> = {
            updatedAt: new Date(),
        };

        // Editable fields
        if (data.partyName !== undefined) updateData.partyName = data.partyName;
        if (data.projectName !== undefined) updateData.projectName = data.projectName;
        if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
        if (data.teamId !== undefined) updateData.teamId = data.teamId;
        if (data.amount !== undefined) updateData.amount = data.amount;
        if (data.remark !== undefined) updateData.remark = data.remark;

        // Status / workflow fields (allowed as per your instruction)
        if (data.approvalStatus !== undefined) updateData.approvalStatus = data.approvalStatus;
        if (data.proofStatus !== undefined) updateData.proofStatus = data.proofStatus;
        if (data.tallyStatus !== undefined) updateData.tallyStatus = data.tallyStatus;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.approvedDate !== undefined) updateData.approvedDate = data.approvedDate;

        const [updated] = await this.db.update(employeeImprests).set(updateData).where(eq(employeeImprests.id, id)).returning();

        return updated;
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

        await this.db
            .update(employeeImprests)
            .set({
                proofStatus: 1,
            })
            .where(eq(employeeImprests.id, imprestId));

        return {
            success: true,
            message: "Proof approved successfully",
        };
    }

    async approveImprest({ imprestId, userId }: { imprestId: number; userId: number }) {
        await this.db
            .update(employeeImprests)
            .set({
                approvalStatus: 1, // Laravel: buttonstatus = 1
                approvedDate: new Date(), // Laravel: Carbon::now()
            })
            .where(eq(employeeImprests.id, imprestId));

        return {
            success: true,
            message: "Imprest approved successfully",
        };
    }

    async tallyAddImprest({ imprestId, userId }: { imprestId: number; userId: number }) {
        const imprest = await this.db.query.employeeImprests.findFirst({
            where: eq(employeeImprests.id, imprestId),
        });

        if (!imprest) {
            throw new NotFoundException("Imprest not found");
        }

        await this.db
            .update(employeeImprests)
            .set({
                tallyStatus: 1,
            })
            .where(eq(employeeImprests.id, imprestId));

        return {
            success: true,
            message: "Tally Entry added successfully",
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
}
