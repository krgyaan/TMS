import * as React from 'react';
import { MenuRootContext } from "./MenuRootContext.js";
import type { MenubarContext } from "../../menubar/MenubarContext.js";
import type { BaseUIChangeEventDetails, BaseUIHighlightEventDetails } from "../../internals/createBaseUIEventDetails.js";
import { REASONS } from "../../internals/reasons.js";
import type { ContextMenuRootContext } from "../../context-menu/root/ContextMenuRootContext.js";
import { MenuStore } from "../store/MenuStore.js";
import type { MenuHandle } from "../store/MenuHandle.js";
import type { PayloadChildRenderFunction } from "../../utils/popups/index.js";
/**
 * Groups all parts of the menu.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export declare function MenuRoot<Payload>(props: MenuRoot.Props<Payload>): React.JSX.Element;
export interface MenuRootState {}
export interface MenuRootProps<Payload = unknown> {
  /**
   * Whether the menu is initially open.
   *
   * To render a controlled menu, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Whether to loop keyboard focus back to the first item
   * when the end of the list is reached while using the arrow keys.
   * @default true
   */
  loopFocus?: boolean | undefined;
  /**
   * Whether moving the pointer over items should highlight them.
   * Disabling this prop allows CSS `:hover` to be differentiated from the `:focus` (`data-highlighted`) state.
   * @default true
   */
  highlightItemOnHover?: boolean | undefined;
  /**
   * Determines if the menu enters a modal state when open.
   * - `true`: user interaction is limited to the menu: document page scroll is locked and pointer interactions on outside elements are disabled.
   * - `false`: user interaction with the rest of the document is allowed.
   *
   * On touch devices, a `true` modal blocks outside taps but leaves the page scrollable unless the popup spans nearly the full viewport width, matching native iOS behavior.
   *
   * Nested menus ignore this prop, and menus opened by hover are never modal.
   * @default true
   */
  modal?: boolean | undefined;
  /**
   * Event handler called when the menu is opened or closed.
   */
  onOpenChange?: ((open: boolean, eventDetails: MenuRoot.ChangeEventDetails) => void) | undefined;
  /**
   * Event handler called after any animations complete when the menu is opened or closed.
   */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /**
   * Callback fired when an item is highlighted or unhighlighted.
   * Receives the highlighted item element (or `undefined` if no item is highlighted) and details
   * containing the reason for the change, the event, and the item's text label.
   * The `reason` can be:
   * - `'keyboard'`: the highlight changed due to keyboard navigation.
   * - `'pointer'`: the highlight changed due to pointer hovering. The event may be a `MouseEvent`
   *   rather than a `PointerEvent`.
   * - `'none'`: the highlight changed for another reason, such as automatic highlighting while
   *   filtering, the item list changing, or the popup opening or closing.
   */
  onItemHighlighted?: ((highlightedItem: HTMLElement | undefined, eventDetails: MenuRoot.HighlightEventDetails) => void) | undefined;
  /**
   * Whether the menu is currently open.
   */
  open?: boolean | undefined;
  /**
   * The visual orientation of the menu.
   * Controls whether roving focus uses up/down or left/right arrow keys.
   * @default 'vertical'
   */
  orientation?: MenuRoot.Orientation | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * When in a submenu, determines whether pressing the Escape key
   * closes the entire menu, or only the current child menu.
   * @default false
   */
  closeParentOnEsc?: boolean | undefined;
  /**
   * A ref to imperative actions.
   * - `unmount`: Ends the closing phase of the menu after an externally controlled closing animation finishes.
   *   Call `preventUnmountOnClose()` in `onOpenChange` first, otherwise the menu completes closing on its own.
   *   Whether it leaves the DOM is decided by `keepMounted` on the portal.
   * - `close`: Closes the menu imperatively when called.
   */
  actionsRef?: React.RefObject<MenuRoot.Actions | null> | undefined;
  /**
   * ID of the trigger that the menu is associated with.
   * This is useful in conjunction with the `open` prop to create a controlled menu.
   * There's no need to specify this prop when the menu is uncontrolled (that is, when the `open` prop is not set).
   */
  triggerId?: string | null | undefined;
  /**
   * ID of the trigger that the menu is associated with.
   * This is useful in conjunction with the `defaultOpen` prop to create an initially open menu.
   */
  defaultTriggerId?: string | null | undefined;
  /**
   * A handle to associate the menu with a trigger.
   * If specified, allows external triggers to control the menu's open state.
   */
  handle?: MenuHandle<Payload> | undefined;
  /**
   * The content of the menu.
   * This can be a regular React node or a render function that receives the `payload` of the active trigger.
   */
  children?: React.ReactNode | PayloadChildRenderFunction<Payload>;
}
export interface MenuRootActions {
  unmount: () => void;
  close: () => void;
}
export type MenuRootChangeEventReason = typeof REASONS.triggerHover | typeof REASONS.triggerFocus | typeof REASONS.triggerPress | typeof REASONS.outsidePress | typeof REASONS.focusOut | typeof REASONS.listNavigation | typeof REASONS.escapeKey | typeof REASONS.itemPress | typeof REASONS.closePress | typeof REASONS.siblingOpen | typeof REASONS.cancelOpen | typeof REASONS.imperativeAction | typeof REASONS.none;
export type MenuRootChangeEventDetails = BaseUIChangeEventDetails<MenuRoot.ChangeEventReason> & {
  /** Prevents the popup from unmounting until the `unmount` action is called. */
  preventUnmountOnClose: () => void;
};
export type MenuRootHighlightEventReason = typeof REASONS.keyboard | typeof REASONS.pointer | typeof REASONS.none;
export type MenuRootHighlightEventDetails = BaseUIHighlightEventDetails<MenuRoot.HighlightEventReason, {
  /**
   * The highlighted item's `label` prop, or its text content when the prop is not set.
   */
  label: string | undefined;
}>;
export type MenuRootOrientation = 'horizontal' | 'vertical';
export type MenuParent = {
  type: 'menu';
  store: MenuStore<unknown>;
} | {
  type: 'menubar';
  context: MenubarContext;
} | {
  type: 'context-menu';
  context: ContextMenuRootContext;
} | {
  type: 'nested-context-menu';
  context: ContextMenuRootContext;
  menuContext: MenuRootContext;
} | {
  type: undefined;
};
export declare namespace MenuRoot {
  type State = MenuRootState;
  type Props<Payload = unknown> = MenuRootProps<Payload>;
  type Actions = MenuRootActions;
  type ChangeEventReason = MenuRootChangeEventReason;
  type ChangeEventDetails = MenuRootChangeEventDetails;
  type HighlightEventReason = MenuRootHighlightEventReason;
  type HighlightEventDetails = MenuRootHighlightEventDetails;
  type Orientation = MenuRootOrientation;
}