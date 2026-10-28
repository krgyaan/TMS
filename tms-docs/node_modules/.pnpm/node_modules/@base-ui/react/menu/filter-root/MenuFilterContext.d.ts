import * as React from 'react';
import type { HTMLProps } from "../../internals/types.js";
import type { MenuFilterPopup } from "./MenuFilterPopup.js";
import type { MenuFilterGroup, MenuFilterRadioGroup } from "./MenuFilterGroup.js";
import type { MenuFilterList } from "./MenuFilterList.js";
import type { MenuParent } from "../root/MenuRoot.js";
import type { MenuStore } from "../store/MenuStore.js";
export interface MenuFilterItemParams {
  label?: string | undefined;
  children?: React.ReactNode;
  render?: unknown;
}
export interface MenuFilterItemResult {
  /** Whether the item matches the query. A hidden item renders nothing. */
  visible: boolean;
  /** Registers the element with the filter. */
  ref: React.Ref<HTMLElement> | null;
  /** Props the filter needs on the element, merged under the consumer's. */
  props?: HTMLProps | undefined;
}
/**
 * The filter implementation that a filterable root hands to the parts below it. Only the roots
 * `Menu.FilterProvider` renders import it, so a plain menu never bundles it. Parts whose whole
 * structure differs are swapped as components; parts that only register with the filter call an
 * injected hook, so a menu that never renders them doesn't bundle a second implementation.
 */
export interface MenuFilterImpl {
  Popup: typeof MenuFilterPopup;
  List: typeof MenuFilterList;
  Group: typeof MenuFilterGroup;
  RadioGroup: typeof MenuFilterRadioGroup;
  /** Registers an item with the filter and reports whether it matches the query. */
  useItem: (params: MenuFilterItemParams) => MenuFilterItemResult;
  /** Like `useItem` for a submenu trigger, which is an item of the parent list. */
  useSubmenuTrigger: (params: MenuFilterItemParams) => MenuFilterItemResult;
  /** Hands focus and the highlight back to a filterable parent when a plain submenu closes. */
  useParentHandoff: (store: MenuStore<unknown>, parent: MenuParent, open: boolean, virtualFocus: boolean) => MenuFilterParentHandoff;
}
export interface MenuFilterParentHandoff {
  /** The filterable parent's input, which the closing submenu returns focus to. */
  parentVirtualFocusRef: React.RefObject<HTMLElement | null> | undefined;
  handleFocus: (() => void) | undefined;
}
/** Static below a filter root: the implementation never changes, so subscribers never re-render. */
export declare const MenuFilterImplContext: React.Context<MenuFilterImpl | null>;
export type MenuFilterPartScope = /** The part belongs to the nearest root. */
'root'
/** The part is an item of the parent list but renders inside its own submenu root. */ | 'submenu-trigger';
/**
 * The filter implementation when the menu this part belongs to is filterable, otherwise `null`.
 * `virtualFocus` marks a filter root; a plain `Menu.Root` never sets it. The result is fixed for
 * a mounted part: a filter root can't appear above it without remounting it.
 */
export declare function useMenuFilterImpl(scope?: MenuFilterPartScope): MenuFilterImpl | null;
/**
 * Throws unless the menu this part renders in is filterable, naming the part and the provider.
 */
export declare function useMenuFilterPart(part: string): void;
/**
 * Registers an item part with the filter of the menu it belongs to. A plain menu's items are
 * always visible.
 */
export declare function useMenuFilterItem(props: MenuFilterItemParams, forwardedRef: React.ForwardedRef<HTMLElement>, scope?: MenuFilterPartScope): MenuFilterItemResult;