import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { paymentCategory, type PaymentCategory } from "@db/schemas/master/payment-category.schema";
import type { CreatePaymentCategoryDto, ListPaymentCategoriesQuery } from "@/modules/master/payment-categories/dto/payment-categories.dto";

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

    
    async create(data: CreatePaymentCategoryDto, createdBy: number): Promise<PaymentCategory> {
        const category = data.category.trim();
        const subCategory = data.subCategory?.trim() || null;

        const [existing] = await this.db
            .select({ id: paymentCategory.id })
            .from(paymentCategory)
            .where(
                and(
                    eq(paymentCategory.purpose, data.purpose),
                    sql`lower(${paymentCategory.category}) = lower(${category})`,
                    subCategory ? sql`lower(coalesce(${paymentCategory.subCategory}, '')) = lower(${subCategory})` : sql`coalesce(${paymentCategory.subCategory}, '') = ''`
                )
            )
            .limit(1);

        if (existing) {
            throw new BadRequestException(subCategory ? "Sub type already exists for this type" : "Type already exists");
        }

        const [inserted] = await this.db
            .insert(paymentCategory)
            .values({
                purpose: data.purpose,
                category,
                subCategory,
                status: data.status,
                createdBy,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        return inserted;
    }
}
