import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";

import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';

import { employee_imprests } from '@db/schemas/accounts/employee-imprests.schema';

import { CreateEmployeeImprestDto } from '@/modules/employee-imprest/zod/create-employee-imprest.schema';
import { UpdateEmployeeImprestDto } from '@/modules/employee-imprest/zod/update-employee-imprest.schema';

@Injectable()
export class EmployeeImprestService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance
    ) { }

    async create(data: CreateEmployeeImprestDto) {
        const result = await this.db
            .insert(employee_imprests)
            .values({
                ...data,
                invoice_proof: [],
            })
            .returning();

        return result[0];
    }

    async findAllByUser(userId: number) {
        return this.db.select().from(employee_imprests).where(eq(employee_imprests.user_id, userId)).orderBy(employee_imprests.created_at);
    }

    async findOne(id: number) {
        const result = await this.db.select().from(employee_imprests).where(eq(employee_imprests.id, id)).limit(1);

        return result[0] ?? null;
    }

    async update(id: number, data: UpdateEmployeeImprestDto) {
        const result = await this.db
            .update(employee_imprests)
            .set({ ...data, updated_at: new Date() })
            .where(eq(employee_imprests.id, id))
            .returning();

        return result[0];
    }

    async delete(id: number) {
        await this.db.delete(employee_imprests).where(eq(employee_imprests.id, id));

        return { success: true };
    }
}
