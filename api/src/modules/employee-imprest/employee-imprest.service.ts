// employee-imprest.service.ts
import { Inject, Injectable, ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { eq } from "drizzle-orm";

import { DRIZZLE } from "../../db/database.module";
import type { DbInstance } from "../../db";

import { employee_imprests } from "../../db/employee-imprests.schema";

import { CreateEmployeeImprestDto } from "./zod/create-employee-imprest.schema";
import { UpdateEmployeeImprestDto } from "./zod/update-employee-imprest.schema";

@Injectable()
export class EmployeeImprestService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance
    ) {}

    async create(data: CreateEmployeeImprestDto, userId: number) {
        const result = await this.db
            .insert(employee_imprests)
            .values({
                ...data,
                user_id: userId,
                invoice_proof: [],
            })
            .returning();
        console.log(result);
        return result[0];
    }

    async findAllByUser(userId: number) {
        return this.db.select().from(employee_imprests).where(eq(employee_imprests.user_id, userId)).orderBy(employee_imprests.created_at);
    }

    async findOne(id: number) {
        const result = await this.db.select().from(employee_imprests).where(eq(employee_imprests.id, id)).limit(1);

        return result[0] ?? null;
    }

    async update(id: number, data: UpdateEmployeeImprestDto, userId: number) {
        const existing = await this.findOne(id);
        if (!existing || existing.user_id !== userId) {
            return null; // Or throw ForbiddenException
        }

        const result = await this.db
            .update(employee_imprests)
            .set({ ...data, updated_at: new Date() })
            .where(eq(employee_imprests.id, id))
            .returning();

        return result[0];
    }

    async uploadDocs(id: number, files: Express.Multer.File[], userId: number) {
        const existing = await this.findOne(id);

        if (!existing) {
            throw new NotFoundException("Courier not found");
        }

        if (existing.user_id !== userId) {
            throw new ForbiddenException("Not authorized");
        }

        const newDocs = files.map(file => ({
            url: `/uploads/employee-imprest/${file.filename}`,
            name: file.originalname,
            type: file.mimetype.startsWith("image") ? "image" : "file",
        }));

        const existingDocs = (existing.invoice_proof as any[]) || [];
        const updatedDocs = [...existingDocs, ...newDocs];

        const result = await this.db
            .update(employee_imprests)
            .set({
                invoice_proof: updatedDocs,
                updated_at: new Date(),
            })
            .where(eq(employee_imprests.id, id))
            .returning();

        return result[0];
    }

    async delete(id: number, userId: number) {
        const existing = await this.findOne(id);
        if (!existing || existing.user_id !== userId) {
            return { success: false };
        }

        await this.db.delete(employee_imprests).where(eq(employee_imprests.id, id));

        return { success: true };
    }
}
