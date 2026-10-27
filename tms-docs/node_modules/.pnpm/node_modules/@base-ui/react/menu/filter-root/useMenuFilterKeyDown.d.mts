import type * as React from 'react';
import type { MenuRoot } from "../root/MenuRoot.mjs";
export type MenuFilterKeyAction = /** Native text editing in the input; list navigation and parent handlers stay out of it. */
'edit'
/** The menu's list navigation handles the key. */ | 'navigate'
/** A horizontal list is entered from the input with a vertical arrow. */ | 'enter-list'
/** The highlighted item handles the key, which opens or closes its submenu. */ | 'submenu'
/** The highlighted item is activated. */ | 'activate'
/** The popup closes and focus returns to where it came from. */ | 'close'
/** The key belongs to an IME composition or leaves the popup (Tab). */ | 'ignore';
export interface MenuFilterKeyContext {
  orientation: MenuRoot.Orientation;
  rtl: boolean;
  /** Whether an item is highlighted. */
  hasActiveItem: boolean;
  /** Whether the highlighted item opens a submenu. */
  activeItemOpensSubmenu: boolean;
  /** Whether the input has text. */
  hasValue: boolean;
}
/**
 * Decides what a key does while the filter input owns the keyboard.
 */
export declare function getMenuFilterKeyAction(event: React.KeyboardEvent, context: MenuFilterKeyContext): MenuFilterKeyAction;
/**
 * Routes keys for a filterable menu's input, which holds real focus while the list is navigated
 * with `aria-activedescendant`. Keys reaching the input, and those an item that received real
 * focus from assistive technology hands back, go through here; the trigger relays only the
 * vertical arrows while the popup is open. Navigation runs the menu's own `useListNavigation`
 * handler directly.
 */
export declare function useMenuFilterKeyDown(hasValue: boolean): (event: React.KeyboardEvent<HTMLElement>) => void;