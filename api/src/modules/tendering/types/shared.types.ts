
/**
 * Paginated result structure used across all dashboard endpoints
 */
export type PaginatedResult<T> = {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
};

/**
 * Common filter parameters for list endpoints
 */
export type BaseFilters = {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

/**
 * Common dashboard counts structure
 */
export type DashboardCounts = {
    [key: string]: number;
    total: number;
};
