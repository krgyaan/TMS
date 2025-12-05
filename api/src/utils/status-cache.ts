import { statuses } from "@db/schemas/master/statuses.schema";
import type { DbInstance } from "@db";

export class StatusCache {
    private static categoryMap: Record<string, number[]> = {};
    private static loaded = false;

    static async load(db: DbInstance) {
        if (this.loaded) return;

        const rows = await db.select({ id: statuses.id, tenderCategory: statuses.tenderCategory }).from(statuses);

        this.categoryMap = rows.reduce((acc, row) => {
            if (!acc[row.tenderCategory]) acc[row.tenderCategory] = [];
            acc[row.tenderCategory].push(row.id as number);
            return acc;
        }, {} as Record<string, number[]>);

        this.loaded = true;
    }

    static getIds(category: string): number[] {
        return this.categoryMap[category] ?? [];
    }
}
