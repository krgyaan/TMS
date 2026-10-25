export type ImprestPaginationState = {
    pageIndex: number;
    pageSize: number;
    totalRows: number;
};

export function getImprestPaginationMeta({ pageIndex, pageSize, totalRows }: ImprestPaginationState) {
    const safePageSize = Math.max(1, pageSize || 10);
    const safeTotalRows = Math.max(0, totalRows || 0);
    const totalPages = safeTotalRows === 0 ? 0 : Math.max(1, Math.ceil(safeTotalRows / safePageSize));
    const clampedPageIndex = totalPages === 0 ? 0 : Math.min(Math.max(pageIndex, 0), totalPages - 1);
    const currentPage = totalPages === 0 ? 0 : clampedPageIndex + 1;

    return {
        currentPage,
        totalPages,
        hasPrev: currentPage > 1,
        hasNext: currentPage > 0 && currentPage < totalPages,
    };
}
