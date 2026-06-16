import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedSearch } from './useDebouncedSearch';

export interface PersistentTableStateOptions<Tab extends string> {
    storageKey: string;
    defaultTab: Tab;
    tabParam?: string;
    defaultPageSize?: number;
}

export interface ColumnWidthState {
    colId: string;
    width: number;
}

export function usePersistentTableState<Tab extends string>({
    storageKey,
    defaultTab,
    tabParam = 'tab',
    defaultPageSize = 50,
}: PersistentTableStateOptions<Tab>) {
    const [searchParams, setSearchParams] = useSearchParams();

    const initialTab = (searchParams.get(tabParam) as Tab) || defaultTab;
    const initialSearch = searchParams.get('q') || '';
    const initialPage = Math.max(0, (parseInt(searchParams.get('page') || '1') - 1));
    const initialPageSize = parseInt(searchParams.get('size') || String(defaultPageSize));
    const initialSortBy = searchParams.get('sortBy') || undefined;
    const initialSortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined;

    const [activeTab, setActiveTabState] = useState<Tab>(initialTab);
    const [search, setSearch] = useState<string>(initialSearch);
    const debouncedSearch = useDebouncedSearch(search, 300);
    const [pagination, setPagination] = useState({ pageIndex: initialPage, pageSize: initialPageSize });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>(
        initialSortBy ? [{ colId: initialSortBy, sort: initialSortOrder || 'asc' }] : []
    );

    const setActiveTab = useCallback((tab: Tab) => {
        setActiveTabState(tab);
    }, []);

    const syncUrl = useCallback(() => {
        const params: Record<string, string | undefined> = {
            [tabParam]: activeTab !== defaultTab ? activeTab as string : undefined,
            q: debouncedSearch || undefined,
            page: pagination.pageIndex > 0 ? String(pagination.pageIndex + 1) : undefined,
            size: pagination.pageSize !== defaultPageSize ? String(pagination.pageSize) : undefined,
            sortBy: sortModel[0]?.colId,
            sortOrder: sortModel[0]?.sort,
        };
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            for (const [key, value] of Object.entries(params)) {
                if (value === undefined || value === '') {
                    next.delete(key);
                } else {
                    next.set(key, value);
                }
            }
            return next;
        }, { replace: true });
    }, [activeTab, debouncedSearch, pagination, sortModel, tabParam, defaultTab, defaultPageSize, setSearchParams]);

    useEffect(() => {
        syncUrl();
    }, [syncUrl]);

    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [activeTab, debouncedSearch]);

    const handleSortChanged = useCallback((event: any) => {
        const newSortModel = event.api.getColumnState()
            .filter((col: any) => col.sort)
            .map((col: any) => ({
                colId: col.colId,
                sort: col.sort as 'asc' | 'desc',
            }));
        setSortModel(newSortModel);
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, []);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPagination({ pageIndex: 0, pageSize: newPageSize });
    }, []);

    const columnStorageKey = `tms:cols:${storageKey}:${activeTab}`;

    const saveColumnState = useCallback((event: any) => {
        const api = event.api || event;
        try {
            const columnState = api.getColumnState().map((col: any) => ({
                colId: col.colId,
                width: col.width,
            }));
            localStorage.setItem(columnStorageKey, JSON.stringify(columnState));
        } catch { }
    }, [columnStorageKey]);

    const restoreColumnState = useCallback((event: any) => {
        const api = event.api || event;
        try {
            const saved = localStorage.getItem(columnStorageKey);
            if (saved) {
                const state: ColumnWidthState[] = JSON.parse(saved);
                api.applyColumnState({ state, applyOrder: true });
            }
        } catch { }
    }, [columnStorageKey]);

    return {
        activeTab,
        setActiveTab,
        search,
        setSearch,
        debouncedSearch,
        pagination,
        setPagination,
        sortModel,
        handleSortChanged,
        handlePageSizeChange,
        saveColumnState,
        restoreColumnState,
    };
}
