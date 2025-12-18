// employee-imprest.service.ts
import { Inject, Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@db";

import { employeeImprests } from "@db/schemas/shared";

import { CreateEmployeeImprestDto } from "@/modules/employee-imprest/zod/create-employee-imprest.schema";
import { UpdateEmployeeImprestDto } from "@/modules/employee-imprest/zod/update-employee-imprest.schema";

@Injectable()
export class EmployeeImprestService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance
    ) {}

    /* ----------------------------- CREATE ----------------------------- */
    async create(data: CreateEmployeeImprestDto, userId: number) {
        const result = await this.db
            .insert(employeeImprests)
            .values({
                ...data,
                userId, // override client input
                invoiceProof: [], // safe explicit default
            })
            .returning();

        return result[0];
    }

    /* ----------------------------- READ ------------------------------ */
    async findAllByUser(userId: number) {
        userId = 31; // temp testing fix
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

        const result = await this.db
            .update(employeeImprests)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(employeeImprests.id, id))
            .returning();

        return result[0];
    }

    /* ------------------------- UPLOAD DOCUMENTS ------------------------ */
    async uploadDocs(id: number, files: Express.Multer.File[], userId: number) {
        const existing = await this.findOne(id);

        if (!existing) {
            throw new NotFoundException("Employee imprest not found");
        }

        if (existing.userId !== userId) {
            throw new ForbiddenException("Not authorized");
        }

        const newDocs = files.map(file => ({
            url: `/uploads/employee-imprest/${file.filename}`,
            name: file.originalname,
            type: file.mimetype.startsWith("image") ? "image" : "file",
        }));

        const existingDocs = (existing.invoiceProof as any[]) ?? [];
        const updatedDocs = [...existingDocs, ...newDocs];

        const result = await this.db
            .update(employeeImprests)
            .set({
                invoiceProof: updatedDocs,
                updatedAt: new Date(),
            })
            .where(eq(employeeImprests.id, id))
            .returning();

        return result[0];
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
