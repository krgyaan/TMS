import type { PaginatedResult } from '@/modules/tendering/types/shared.types';

/**
 * Wrap paginated data in a standardized response format
 * @param data Array of items for the current page
 * @param total Total number of items across all pages
 * @param page Current page number (1-indexed)
 * @param limit Number of items per page
 * @returns PaginatedResult with data and metadata
 */
export function wrapPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
): PaginatedResult<T> {
    return {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}
