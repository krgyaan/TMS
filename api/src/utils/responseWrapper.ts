export function wrapPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
) {
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
