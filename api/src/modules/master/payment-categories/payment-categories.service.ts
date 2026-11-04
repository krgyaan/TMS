import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { paymentCategory, type PaymentCategory } from "@db/schemas/master/payment-category.schema";
import type { ListPaymentCategoriesQuery } from "@/modules/master/payment-categories/dto/payment-categories.dto";

@Injectable()
export class PaymentCategoriesService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll(filters?: ListPaymentCategoriesQuery): Promise<PaymentCategory[]> {
        const conditions: (SQL<unknown> | undefined)[] = [];

        if (filters?.purpose) {
            conditions.push(eq(paymentCategory.purpose, filters.purpose));
        }

        if (filters?.status) {
            conditions.push(eq(paymentCategory.status, filters.status));
        }

        if (filters?.q) {
            const term = `%${filters.q}%`;
            conditions.push(or(ilike(paymentCategory.category, term), ilike(paymentCategory.subCategory, term)));
        }

        const whereClause = conditions.length > 0 ? and(...conditions.filter(Boolean)) : undefined;

        return this.db.select().from(paymentCategory).where(whereClause).orderBy(asc(paymentCategory.category), asc(paymentCategory.id));
    }

    async findById(id: number): Promise<PaymentCategory> {
        const [row] = await this.db.select().from(paymentCategory).where(eq(paymentCategory.id, id)).limit(1);

        if (!row) {
            throw new NotFoundException(`Payment category with ID ${id} not found`);
        }

        return row;
    }
}
