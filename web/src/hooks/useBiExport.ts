import { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface TabConfig {
    key: string;
    name: string;
}

interface UseBiExportConfig {
    getAllFn: (params: any) => Promise<{ data?: any[]; meta?: { total: number } }>;
    getActionFormDataFn: (id: number) => Promise<Record<string, any>>;
    tabsConfig: TabConfig[];
    pendingTabKey: string;
    tabsWithForm: string[];
    filenamePrefix: string;
    flattenFormData: (data: Record<string, any>) => Record<string, any>;
    mapPendingRow: (row: any) => Record<string, any>;
    mapRow: (row: any, isAllTab: boolean) => Record<string, any>;
}

export function useBiExport(config: UseBiExportConfig) {
    const [exportTab, setExportTab] = useState<string>('');
    const [exporting, setExporting] = useState(false);

    const exportOptions = useMemo(() => [
        ...config.tabsConfig.map(t => ({ value: t.key, label: t.name })),
        { value: 'all', label: 'All' },
    ], [config.tabsConfig]);

    const fetchAllRows = useCallback(async (tab: string): Promise<any[]> => {
        if (tab === 'all') {
            const allRows: any[] = [];
            for (const t of config.tabsConfig) {
                let page = 1;
                const limit = 100;
                let total = 0;
                const tabRows: any[] = [];
                do {
                    const data = await config.getAllFn({ tab: t.key, page, limit });
                    tabRows.push(...(data.data || []));
                    total = data.meta?.total || data.data?.length || 0;
                    page++;
                } while (tabRows.length < total);
                allRows.push(...tabRows.map(r => ({ ...r, _tab: t.name })));
            }
            return allRows;
        }
        const allRows: any[] = [];
        let page = 1;
        const limit = 100;
        let total = 0;
        do {
            const data = await config.getAllFn({ tab: tab as any, page, limit });
            allRows.push(...(data.data || []));
            total = data.meta?.total || data.data?.length || 0;
            page++;
        } while (allRows.length < total);
        return allRows;
    }, [config.getAllFn, config.tabsConfig]);

    const handleExport = useCallback(async () => {
        if (!exportTab) return;
        setExporting(true);
        try {
            const rows = await fetchAllRows(exportTab);
            if (rows.length === 0) return;

            const isPendingTab = exportTab === config.pendingTabKey;
            const isAllTab = exportTab === 'all';

            let exportRows: Record<string, any>[];

            if (isPendingTab) {
                exportRows = rows.map(config.mapPendingRow);
            } else {
                exportRows = rows.map((r: any) => config.mapRow(r, isAllTab));
                if (isAllTab || config.tabsWithForm.includes(exportTab)) {
                    for (let i = 0; i < rows.length; i++) {
                        try {
                            const formData = await config.getActionFormDataFn(rows[i].id);
                            if (formData && Object.keys(formData).length > 0) {
                                Object.assign(exportRows[i], config.flattenFormData(formData));
                            }
                        } catch {
                            // skip
                        }
                    }
                }
            }

            const ws = XLSX.utils.json_to_sheet(exportRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, isAllTab ? 'All Data' : exportTab);
            const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            saveAs(new Blob([buf]), `${config.filenamePrefix}_${exportTab}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setExporting(false);
        }
    }, [exportTab, config, fetchAllRows]);

    return { exportTab, setExportTab, exporting, handleExport, exportOptions };
}
