import * as React from 'react';
import type { BaseUIComponentProps } from "../../internals/types.js";
/**
 * A link in the menu that can be used to navigate to a different page or section.
 * Renders an `<a>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export declare const MenuLinkItem: React.ForwardRefExoticComponent<Omit<MenuLinkItemProps, "ref"> & React.RefAttributes<Element>>;
export interface MenuLinkItemState {
  /**
   * Whether the item is highlighted.
   */
  highlighted: boolean;
}
export interface MenuLinkItemProps extends BaseUIComponentProps<'a', MenuLinkItemState, React.ComponentPropsWithRef<'a'>> {
  /**
   * Overrides the text used for keyboard text navigation and filtering.
   * Falls back to the rendered text when not provided.
   */
  label?: string | undefined;
  /**
   * @ignore
   */
  id?: string | undefined;
  /**
   * Whether to close the menu when the item is clicked.
   * @default false
   */
  closeOnClick?: boolean | undefined;
}
export declare namespace MenuLinkItem {
  type State = MenuLinkItemState;
  type Props = MenuLinkItemProps;
}