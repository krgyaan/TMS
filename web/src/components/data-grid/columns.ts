import type { ColDef, ValueFormatterParams } from "ag-grid-community";
import { BooleanIconCell } from "./renderers/BooleanIconCell";
import TenderNameCell from "./renderers/TenderNameCell";
import { currencyFormatter, dateFormatter } from "./formatters";
import { formatDateTime } from "@/hooks/useFormatedDate";

type Field<T> = keyof T | string;

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

export function tenderNameCol<T extends { tenderNo: string; tenderName: string }>(
    field: Field<T> = 'tenderNo',
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

export function dateCol<T = any>(
    field: Field<T>,
    overrides: ColDef<T> = {}
): ColDef<T> {
    return {
        field: field as string,
        valueFormatter: (params) => {
            return params.value ? formatDateTime(params.value) : '—';
        },
        comparator: (dateA, dateB) => {
            const timeA = dateA ? new Date(dateA).getTime() : 0;
            const timeB = dateB ? new Date(dateB).getTime() : 0;
            return timeA - timeB;
        },
        filter: 'agDateColumnFilter',
        ...overrides,
    } as ColDef<T>;
}

export function currencyCol<T = any>(
    field: Field<T>,
    options: { locale?: string; currency?: string; maximumFractionDigits?: number } = {},
    overrides: ColDef<T> = {}
): ColDef<T> {
    return {
        field: field as string,
        valueFormatter: (p: ValueFormatterParams) => currencyFormatter(p, options),
        ...overrides,
    } as ColDef<T>;
}
