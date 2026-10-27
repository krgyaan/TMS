import * as React from 'react';
import type { BaseUIEvent } from "../../internals/types.mjs";
export declare const MenuSubmenuRootContext: React.Context<MenuSubmenuRootContext | undefined>;
export interface MenuSubmenuRootContext {
  /** The element that receives focus when the submenu closes; `false` leaves focus where it is. */
  getReturnElement?: (() => HTMLElement | null | false) | undefined;
  onTriggerKeyDown?: ((event: BaseUIEvent<React.KeyboardEvent<HTMLElement>>) => void) | undefined;
  onPopupKeyDown?: ((event: React.KeyboardEvent) => void) | undefined;
}
export declare function useMenuSubmenuRootContext(): MenuSubmenuRootContext | undefined;