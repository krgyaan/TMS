// employee-imprest.service.ts
import { Inject, Injectable, ForbiddenException, NotFoundException, InternalServerErrorException, BadRequestException } from "@nestjs/common";
import { eq } from "drizzle-orm";

import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@db";

import { employeeImprests } from "@db/schemas/shared";

import type { CreateEmployeeImprestDto } from "@/modules/employee-imprest/zod/create-employee-imprest.schema";
import type { UpdateEmployeeImprestDto } from "@/modules/employee-imprest/zod/update-employee-imprest.schema";

@Injectable()
export class EmployeeImprestService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance,

        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger
    ) {}

    /* ----------------------------- CREATE ----------------------------- */
    async create(data: CreateEmployeeImprestDto, files: Express.Multer.File[]) {
        // console.log(userId);

        const result = await this.db
            .insert(employeeImprests)
            .values({
                ...data,
                invoiceProof: files.map(f => f.filename), // store filenames of uploaded files
            })
            .returning();

        console.log(result);
        return result[0];
    }

    /* ----------------------------- READ ------------------------------ */
    async findAllByUser(userId: number) {
        return this.db.select().from(employeeImprests).where(eq(employeeImprests.userId, userId)).orderBy(employeeImprests.createdAt);
    }

    async findOne(id: number) {
        const result = await this.db.select().from(employeeImprests).where(eq(employeeImprests.id, id)).limit(1);

        return result[0] ?? null;
    }

    /* ----------------------------- UPDATE ----------------------------- */
    async update(id: number, data: UpdateEmployeeImprestDto, userId: number) {
        const existing = await this.findOne(id);

        if (!existing) {
            throw new NotFoundException("Employee imprest not found");
        }

        if (existing.userId !== userId) {
            throw new ForbiddenException("Not authorized");
        }

        const updateData: Record<string, any> = {
            updatedAt: new Date(),
        };

        // Only real columns from employee_imprests
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
        const imprest = await this.db.query.employeeImprests.findFirst({
            where: eq(employeeImprests.id, imprestId),
        });

        if (!imprest) {
            throw new NotFoundException("Imprest not found");
        }

        await this.db
            .update(employeeImprests)
            .set({
                approvalStatus: 1,
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

        if (existing.userId !== userId) {
            throw new ForbiddenException("Not authorized");
        }

        await this.db.delete(employeeImprests).where(eq(employeeImprests.id, id));

        return { success: true };
    }
}
