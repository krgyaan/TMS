import * as React from 'react';
export interface FilterDropdownGroupContext {
  registerItem: (id: symbol, retained: boolean) => () => void;
}
export declare const FilterDropdownGroupContext: React.Context<FilterDropdownGroupContext | null>;
export declare function useFilterDropdownGroupContext(): FilterDropdownGroupContext | null;