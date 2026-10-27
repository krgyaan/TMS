import * as React from 'react';
import type { FilterDropdownEmptyProps, FilterDropdownEmptyState } from "../../filter-dropdown/empty/FilterDropdownEmpty.js";
/**
 * A message shown when the menu has no matching items.
 * Requires the menu to be wrapped in `Menu.FilterProvider`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export declare const MenuEmpty: React.ForwardRefExoticComponent<Omit<MenuEmptyProps, "ref"> & React.RefAttributes<HTMLDivElement>>;
export interface MenuEmptyState extends FilterDropdownEmptyState {}
export interface MenuEmptyProps extends FilterDropdownEmptyProps {}
export declare namespace MenuEmpty {
  type State = MenuEmptyState;
  type Props = MenuEmptyProps;
}