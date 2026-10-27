import * as React from 'react';
import type { BaseUIComponentProps } from "../../internals/types.js";
/**
 * Groups menu items so other content, such as a filter input, can share the popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export declare const MenuList: React.ForwardRefExoticComponent<Omit<MenuListProps, "ref"> & React.RefAttributes<HTMLDivElement>>;
export interface MenuListState {}
export interface MenuListProps extends BaseUIComponentProps<'div', MenuListState> {}
export declare namespace MenuList {
  type Props = MenuListProps;
  type State = MenuListState;
}