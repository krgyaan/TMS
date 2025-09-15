import type { ColDef, ValueFormatterParams } from "ag-grid-community";
import { BooleanIconCell } from "./renderers/BooleanIconCell";
import { CompanyLogoCell } from "./renderers/CompanyLogoCell";
import { currencyFormatter, dateFormatter } from "./formatters";

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

export function logoCol<T = any>(
  field: Field<T>,
  overrides: ColDef<T> = {}
): ColDef<T> {
  return {
    field: field as string,
    cellRenderer: CompanyLogoCell as any,
    ...overrides,
  } as ColDef<T>;
}

export function dateCol<T = any>(
  field: Field<T>,
  overrides: ColDef<T> = {}
): ColDef<T> {
  return {
    field: field as string,
    valueFormatter: dateFormatter,
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

