import { and, inArray, isNull, isNotNull, notInArray, eq, ne, or, sql } from 'drizzle-orm';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { getTabConfig, getCategoryStatusIds, type DashboardTabConfig } from '@/config/dashboard-config.loader';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';

/**
 * Build WHERE conditions for a dashboard tab based on config
 */
export function buildTabConditions(
    dashboardName: string,
    tabKey: string,
    baseConditions: any[] = [],
    fieldMappings: Record<string, any> = {}
): any[] {
    const tabConfig = getTabConfig(dashboardName, tabKey);
    if (!tabConfig) {
        throw new Error(`Tab config not found: ${dashboardName}.${tabKey}`);
    }

    const conditions = [...baseConditions];

    // Add status filter
    if (tabConfig.statusIds && tabConfig.statusIds.length > 0) {
        conditions.push(inArray(tenderInfos.status, tabConfig.statusIds));
    }

    // Add category filter (if no statusIds specified, or as additional filter)
    if (tabConfig.category) {
        const categoryStatusIds = getCategoryStatusIds(tabConfig.category);
        if (categoryStatusIds.length > 0) {
            // If statusIds also exist, combine them
            if (tabConfig.statusIds && tabConfig.statusIds.length > 0) {
                const combinedIds = [...new Set([...tabConfig.statusIds, ...categoryStatusIds])];
                conditions.push(inArray(tenderInfos.status, combinedIds));
            } else {
                conditions.push(inArray(tenderInfos.status, categoryStatusIds));
            }
        }
    }

    // Add field conditions
    if (tabConfig.fieldConditions) {
        const processedFields = new Set<string>();

        for (const [fieldName, condition] of Object.entries(tabConfig.fieldConditions)) {
            // Skip value fields (they're handled with their parent field)
            if (fieldName.endsWith('Value')) {
                continue;
            }

            const field = fieldMappings[fieldName];
            if (!field) {
                continue; // Skip if field mapping not provided
            }

            if (condition === 'IS_NULL') {
                conditions.push(isNull(field));
            } else if (condition === 'IS_NOT_NULL') {
                conditions.push(isNotNull(field));
            } else if (condition === 'EQUALS') {
                // For EQUALS, check if there's a value field (e.g., emdStatusValue)
                const valueField = `${fieldName}Value`;
                const value = tabConfig.fieldConditions[valueField];
                if (value && field) {
                    conditions.push(eq(field, value));
                }
            }
        }
    }

    // Exclude status IDs if specified
    if (tabConfig.excludeStatusIds && tabConfig.excludeStatusIds.length > 0) {
        conditions.push(notInArray(tenderInfos.status, tabConfig.excludeStatusIds));
    }

    return conditions;
}

/**
 * Build ORDER BY clause from config
 */
export function buildOrderBy(
    tabConfig: DashboardTabConfig,
    customSortBy?: string,
    customSortOrder?: 'asc' | 'desc',
    sortFieldMappings: Record<string, any> = {}
): any {
    const sortBy = customSortBy || tabConfig.sortBy;
    const sortOrder = customSortOrder || tabConfig.sortOrder || 'asc';

    if (!sortBy) {
        return null; // Let database use default
    }

    const field = sortFieldMappings[sortBy];
    if (!field) {
        return null; // Field mapping not found
    }

    return sortOrder === 'desc' ? sql`${field} DESC` : sql`${field} ASC`;
}

/**
 * Get base conditions for dashboard entry
 */
export function getBaseDashboardConditions(excludeCategories: string[] = ['dnb', 'lost']): any[] {
    return [
        TenderInfosService.getActiveCondition(),
        TenderInfosService.getApprovedCondition(),
        ...(excludeCategories.length > 0
            ? [TenderInfosService.getExcludeStatusCondition(excludeCategories)]
            : []),
    ];
}

/**
 * Count items for a specific tab
 */
export async function countTabItems(
    db: any,
    dashboardName: string,
    tabKey: string,
    baseConditions: any[],
    fieldMappings: Record<string, any> = {},
    fromTable: any = tenderInfos,
    joins: Array<{ table: any; condition: any }> = []
): Promise<number> {
    const conditions = buildTabConditions(dashboardName, tabKey, baseConditions, fieldMappings);

    let query = db.select({ count: sql<number>`count(*)` }).from(fromTable);

    // Apply joins
    for (const join of joins) {
        query = query.leftJoin(join.table, join.condition);
    }

    const [result] = await query.where(and(...conditions));

    return Number(result?.count || 0);
}
