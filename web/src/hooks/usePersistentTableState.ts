import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedSearch } from './useDebouncedSearch';

const STORAGE_PREFIX = 'tms:table-state:';

export interface PersistentTableStateOptions<Tab extends string> {
    storageKey: string;
    defaultTab: Tab;
    tabParam?: string;
    defaultPageSize?: number;
}

const RELEVANT_PARAMS = ['tab', 'q', 'page', 'size', 'sortBy', 'sortOrder'];

export function usePersistentTableState<Tab extends string>({
    storageKey,
    defaultTab,
    tabParam = 'tab',
    defaultPageSize = 50,
}: PersistentTableStateOptions<Tab>) {
    const [searchParams, setSearchParams] = useSearchParams();

    const hasAnyRelevantParam = RELEVANT_PARAMS.some(p => searchParams.has(p));

    const readInitial = <T>(field: string, urlParam: string, defaultValue: T, transform?: (s: string) => T): T => {
        if (hasAnyRelevantParam) {
            const urlValue = searchParams.get(urlParam);
            if (urlValue !== null) {
                return transform ? transform(urlValue) : urlValue as unknown as T;
            }
            return defaultValue;
        }
        try {
            const saved = sessionStorage.getItem(STORAGE_PREFIX + storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                const val = parsed[field];
                if (val !== undefined && val !== null) return val;
            }
        } catch { }
        return defaultValue;
    };

    const activeTabParam = tabParam;
    const initialTab = readInitial<Tab>('activeTab', activeTabParam, defaultTab);
    const initialSearch = readInitial<string>('search', 'q', '');
    const initialPage = readInitial<number>('pageIndex', 'page', 0, (s) => Math.max(0, parseInt(s) - 1));
    const initialPageSize = readInitial<number>('pageSize', 'size', defaultPageSize, parseInt);
    const initialSortBy = readInitial<string | undefined>('sortBy', 'sortBy', undefined);
    const initialSortOrder = readInitial<'asc' | 'desc' | undefined>('sortOrder', 'sortOrder', undefined);

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
            q: search || undefined,
            page: pagination.pageIndex > 0 ? String(pagination.pageIndex + 1) : undefined,
            size: pagination.pageSize !== defaultPageSize ? String(pagination.pageSize) : undefined,
            sortBy: sortModel[0]?.colId,
            sortOrder: sortModel[0]?.sort,
        };
        const next = new URLSearchParams(searchParams);
        for (const [key, value] of Object.entries(params)) {
            if (value === undefined || value === '') {
                next.delete(key);
            } else {
                next.set(key, value);
            }
        }
        const nextStr = next.toString();
        const currentStr = searchParams.toString();
        if (nextStr !== currentStr) {
            setSearchParams(next, { replace: true });
        }
    }, [activeTab, search, pagination, sortModel, searchParams, tabParam, defaultTab, defaultPageSize, setSearchParams]);

    useEffect(() => {
        syncUrl();
    }, [syncUrl]);

    useEffect(() => {
        try {
            sessionStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify({
                activeTab,
                search,
                pageIndex: pagination.pageIndex,
                pageSize: pagination.pageSize,
                sortBy: sortModel[0]?.colId,
                sortOrder: sortModel[0]?.sort,
            }));
        } catch { }
    }, [activeTab, search, pagination, sortModel, storageKey]);

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
    };
}
