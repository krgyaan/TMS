import * as React from 'react';
import type { FilterDropdownInputProps, FilterDropdownInputState } from "../../filter-dropdown/input/FilterDropdownInput.js";
/**
 * A search field that filters the menu items.
 * Requires the menu to be wrapped in `Menu.FilterProvider`.
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export declare const MenuInput: React.ForwardRefExoticComponent<Omit<MenuInputProps, "ref"> & React.RefAttributes<HTMLInputElement>>;
export interface MenuInputState extends FilterDropdownInputState {}
export interface MenuInputProps extends FilterDropdownInputProps {}
export declare namespace MenuInput {
  type State = MenuInputState;
  type Props = MenuInputProps;
}