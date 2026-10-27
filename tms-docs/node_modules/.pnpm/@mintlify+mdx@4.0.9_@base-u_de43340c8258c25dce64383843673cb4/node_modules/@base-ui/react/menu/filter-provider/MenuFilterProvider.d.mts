import * as React from 'react';
import type { MenuFilterProviderOptions } from "./MenuFilterProviderOptions.mjs";
import type { FilterDropdownRoot } from "../../filter-dropdown/root/FilterDropdownRootContext.mjs";
/**
 * Enables filtering for the menu or submenu it wraps. Add `Menu.Input` to the popup and place
 * its items in `Menu.List`.
 * Wrap each searchable submenu in its own provider.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export declare function MenuFilterProvider(props: MenuFilterProvider.Props): React.JSX.Element;
export interface MenuFilterProviderState {}
export interface MenuFilterProviderProps extends MenuFilterProviderOptions {
  /**
   * The `<Menu.Root>` or `<Menu.SubmenuRoot>` to make filterable.
   */
  children?: React.ReactNode;
}
export type MenuFilterProviderChangeEventReason = FilterDropdownRoot.ChangeEventReason;
export type MenuFilterProviderChangeEventDetails = FilterDropdownRoot.ChangeEventDetails;
export declare namespace MenuFilterProvider {
  type State = MenuFilterProviderState;
  type Props = MenuFilterProviderProps;
  type ChangeEventReason = MenuFilterProviderChangeEventReason;
  type ChangeEventDetails = MenuFilterProviderChangeEventDetails;
}