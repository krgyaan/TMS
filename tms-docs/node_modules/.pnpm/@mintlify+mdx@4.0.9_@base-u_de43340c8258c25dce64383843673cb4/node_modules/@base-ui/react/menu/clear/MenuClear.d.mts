import * as React from 'react';
import type { FilterDropdownClearProps, FilterDropdownClearState } from "../../filter-dropdown/clear/FilterDropdownClear.mjs";
/**
 * A button that clears the input text.
 * Requires the menu to be wrapped in `Menu.FilterProvider`.
 * Renders a `<button>` element when the input has text.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export declare const MenuClear: React.ForwardRefExoticComponent<Omit<MenuClearProps, "ref"> & React.RefAttributes<HTMLButtonElement>>;
export interface MenuClearState extends FilterDropdownClearState {}
export interface MenuClearProps extends FilterDropdownClearProps {}
export declare namespace MenuClear {
  type State = MenuClearState;
  type Props = MenuClearProps;
}