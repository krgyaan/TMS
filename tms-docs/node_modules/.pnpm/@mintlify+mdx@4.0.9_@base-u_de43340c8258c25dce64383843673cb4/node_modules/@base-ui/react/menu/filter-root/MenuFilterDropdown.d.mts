import * as React from 'react';
import type { FilterDropdownFilter } from "../../filter-dropdown/root/FilterDropdownRootContext.mjs";
import type { MenuFilterProvider } from "../filter-provider/MenuFilterProvider.mjs";
export interface MenuFilterDropdownProps {
  value: string | undefined;
  defaultValue: string | undefined;
  onValueChange: MenuFilterProvider.Props['onValueChange'];
  filter: FilterDropdownFilter | null | undefined;
  autoHighlight: boolean | 'always';
  locale: Intl.LocalesArgument | undefined;
  children?: React.ReactNode;
}
/**
 * Reads the menu store, which is only available below the menu root, and hands the filter
 * engine the list the menu navigates and the command that moves its highlight. The query is
 * owned here; the menu root keeps sole ownership of the open state.
 */
export declare function MenuFilterDropdown(props: MenuFilterDropdownProps): React.JSX.Element;