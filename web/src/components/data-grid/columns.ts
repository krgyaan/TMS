import type { ColDef, ValueFormatterParams, ValueGetterParams } from "ag-grid-community";
import { BooleanIconCell } from "./renderers/BooleanIconCell";
import TenderNameCell from "./renderers/TenderNameCell";
import { formatDateTime, formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";

type Field<T> = keyof T | string;

// Helper function to safely get nested field value
function getFieldValue<T>(data: T | undefined, field: string): unknown {
    if (!data) return null;

    // Handle nested fields like "user.name"
    const keys = field.split('.');
    let value: unknown = data;

    for (const key of keys) {
        if (value === null || value === undefined) return null;
        value = (value as Record<string, unknown>)[key];
    }

    return value;
}

export function booleanIconCol<T = any>(
    field: Field<T>,
    overrides: ColDef<T> = {}
): ColDef<T> {
    return {
        field: field as string,
        cellRenderer: BooleanIconCell as any,
        ...overrides,
    } as ColDef<T>;
}

export function tenderNameCol<T extends { tenderNo?: string | null; tenderName?: string | null }>(
    field: Field<T> = 'tenderName',
    overrides: Partial<ColDef<T>> = {}
): ColDef<T> {
    return {
        field: field as string,
        headerName: 'Tender',
        sortable: true,
        filter: true,
        cellRenderer: TenderNameCell,
        minWidth: 150,
        ...overrides,
    } as ColDef<T>;
}

/**
 * Date column with proper sorting on actual date values
 * Displays formatted date/datetime but sorts on raw Date
 */
export function dateCol<T = unknown>(
    field: Field<T>,
    options: { includeTime?: boolean } = {},
    overrides: ColDef<T> = {}
): ColDef<T> {
    const { includeTime = true } = options;
    const fieldStr = field as string;

    return {
        field: fieldStr,
        sortable: true,
        filter: 'agDateColumnFilter',
        valueFormatter: (params: ValueFormatterParams<T>) => {
            if (!params.value) return '—';
            return includeTime ? formatDateTime(params.value) : formatDate(params.value);
        },
        valueGetter: (params: ValueGetterParams<T>): Date | null => {
            const value = getFieldValue(params.data, fieldStr);
            if (!value) return null;
            const date = new Date(value as string | number | Date);
            return isNaN(date.getTime()) ? null : date;
        },
        comparator: (dateA: Date | null, dateB: Date | null): number => {
            const timeA = dateA?.getTime() ?? 0;
            const timeB = dateB?.getTime() ?? 0;
            return timeA - timeB;
        },
        filterParams: {
            comparator: (filterDate: Date, cellValue: Date | null): number => {
                if (!cellValue) return -1;
                const cellDateOnly = new Date(cellValue.getFullYear(), cellValue.getMonth(), cellValue.getDate());
                const filterDateOnly = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());

                if (cellDateOnly < filterDateOnly) return -1;
                if (cellDateOnly > filterDateOnly) return 1;
                return 0;
            },
        },
        ...overrides,
    } as ColDef<T>;
}

/**
 * Date-only column (without time)
 */
export function dateOnlyCol<T = unknown>(
    field: Field<T>,
    overrides: ColDef<T> = {}
): ColDef<T> {
    return dateCol<T>(field, { includeTime: false }, overrides);
}

/**
 * Currency column with proper sorting on numeric values
 * Displays formatted INR but sorts on raw number
 */
export function currencyCol<T = unknown>(
    field: Field<T>,
    overrides: ColDef<T> = {}
): ColDef<T> {
    const fieldStr = field as string;

    return {
        field: fieldStr,
        sortable: true,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
        valueFormatter: (params: ValueFormatterParams<T>): string => {
            if (params.value === null || params.value === undefined) return '—';
            return formatINR(params.value);
        },
        valueGetter: (params: ValueGetterParams<T>): number | null => {
            const value = getFieldValue(params.data, fieldStr);
            if (value === null || value === undefined) return null;
            const num = typeof value === 'number' ? value : parseFloat(String(value));
            return isNaN(num) ? null : num;
        },
        comparator: (valueA: number | null, valueB: number | null): number => {
            const numA = valueA ?? 0;
            const numB = valueB ?? 0;
            return numA - numB;
        },
        ...overrides,
    } as ColDef<T>;
}

/**
 * Generic numeric column with proper sorting
 */
export function numericCol<T = unknown>(
    field: Field<T>,
    options: {
        decimals?: number;
        suffix?: string;
        prefix?: string;
    } = {},
    overrides: ColDef<T> = {}
): ColDef<T> {
    const { decimals = 0, suffix = '', prefix = '' } = options;
    const fieldStr = field as string;

    return {
        field: fieldStr,
        sortable: true,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
        valueFormatter: (params: ValueFormatterParams<T>): string => {
            if (params.value === null || params.value === undefined) return '—';
            const formatted = typeof params.value === 'number'
                ? params.value.toLocaleString('en-IN', { maximumFractionDigits: decimals })
                : String(params.value);
            return `${prefix}${formatted}${suffix}`;
        },
        valueGetter: (params: ValueGetterParams<T>): number | null => {
            const value = getFieldValue(params.data, fieldStr);
            if (value === null || value === undefined) return null;
            const num = typeof value === 'number' ? value : parseFloat(String(value));
            return isNaN(num) ? null : num;
        },
        comparator: (valueA: number | null, valueB: number | null): number => {
            const numA = valueA ?? 0;
            const numB = valueB ?? 0;
            return numA - numB;
        },
        ...overrides,
    } as ColDef<T>;
}

/**
 * Percentage column
 */
export function percentCol<T = any>(
    field: Field<T>,
    overrides: ColDef<T> = {}
): ColDef<T> {
    return numericCol<T>(field, { decimals: 2, suffix: '%' }, overrides);
}
