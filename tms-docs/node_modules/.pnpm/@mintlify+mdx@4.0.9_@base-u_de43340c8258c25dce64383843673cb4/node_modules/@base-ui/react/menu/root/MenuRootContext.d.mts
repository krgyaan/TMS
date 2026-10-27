import * as React from 'react';
import type { MenuStore } from "../store/MenuStore.mjs";
import type { MenuParent, MenuRoot } from "./MenuRoot.mjs";
export interface MenuRootContext<Payload = unknown> {
  store: MenuStore<Payload>;
  parent: MenuParent;
  orientation: MenuRoot.Orientation;
  loopFocus: boolean;
  /** Whether arrow keys can step from either end of the list back to a virtual focus owner. */
  allowEscape: boolean;
  defaultFloatingId: string | undefined;
  /** Records the id the popup rendered with, when it differs from `defaultFloatingId`. */
  setRenderedFloatingId: React.Dispatch<React.SetStateAction<string | undefined>>;
  virtualFocus: boolean;
  parentVirtualFocus: boolean;
  /** Re-emits `onItemHighlighted` after the item registry settles. */
  syncHighlightedItem: () => void;
}
export declare const MenuRootContext: React.Context<MenuRootContext<unknown> | undefined>;
export declare function useMenuRootContext(optional?: false): MenuRootContext;
export declare function useMenuRootContext(optional: true): MenuRootContext | undefined;