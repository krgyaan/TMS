import * as React from 'react';
import { ReactStore } from '@base-ui/utils/store';
import type { InteractionType } from '@base-ui/utils/useEnhancedClickHandler';
import type { MenuParent, MenuRoot } from "../root/MenuRoot.mjs";
import { FloatingTreeStore } from "../../floating-ui-react/components/FloatingTreeStore.mjs";
import type { HTMLProps } from "../../internals/types.mjs";
import type { AdaptiveOriginMiddleware } from "../../utils/adaptiveOriginConstants.mjs";
import type { PopupStoreContext, PopupStoreState, PopupTriggerStoreKeys } from "../../utils/popups/index.mjs";
export type State<Payload> = PopupStoreState<Payload> & {
  disabled: boolean;
  modal: boolean | undefined;
  openMethod: InteractionType | null;
  /** Whether the popup last opened from the keyboard or an assistive-technology press. */
  keyboardOpen: boolean;
  allowMouseEnter: boolean;
  highlightItemOnHover: boolean;
  parent: MenuParent;
  rootId: string | undefined;
  activeIndex: number | null;
  /** The `Menu.List` element, which takes the `menu` role from the popup when rendered. */
  listElement: HTMLElement | null;
  /**
   * Props a filter root adds to its triggers (dialog semantics and the key relay to the input).
   * Published by the filter implementation so a plain menu never bundles them.
   */
  filterTriggerProps: HTMLProps;
  /** List navigation props for the element that holds real focus under virtual focus. */
  inputProps: HTMLProps;
  /** Whether this menu's filter input has focus. */
  inputFocused: boolean;
  /** The element at `activeIndex` once the item list settles. Only virtual focus publishes it. */
  highlightedItem: HTMLElement | undefined;
  hoverEnabled: boolean;
  instantType: 'dismiss' | 'click' | 'group' | 'trigger-change' | undefined;
  openChangeReason: MenuRoot.ChangeEventReason | null;
  floatingTreeRoot: FloatingTreeStore;
  floatingNodeId: string | undefined;
  floatingParentNodeId: string | null;
  itemProps: HTMLProps;
  closeDelay: number;
  keyboardEventRelay: ((event: React.KeyboardEvent<any>) => void) | undefined;
  adaptiveOrigin: AdaptiveOriginMiddleware | undefined;
};
type Context = PopupStoreContext<MenuRoot.ChangeEventDetails> & {
  readonly positionerRef: React.RefObject<HTMLElement | null>;
  readonly popupRef: React.RefObject<HTMLElement | null>;
  readonly typingRef: React.RefObject<boolean>;
  readonly itemDomElements: React.RefObject<(HTMLElement | null)[]>;
  readonly itemLabels: React.RefObject<(string | null)[]>;
  /** Why the next `activeIndex` write happens, consumed by `onItemHighlighted` on commit. */
  highlightReason: MenuRoot.HighlightEventReason;
  /** The event that caused the next `activeIndex` write, reported along with `highlightReason`. */
  highlightEvent: Event | undefined;
  /** The item last committed as highlighted, kept in every menu so reasons compare against it. */
  reportedItem: HTMLElement | undefined;
  allowMouseUpTriggerRef: React.RefObject<boolean>;
  /** The element that holds real focus while virtual list navigation is active. */
  virtualFocusRef: React.RefObject<HTMLElement | null> | undefined;
  /** Whether a filterable menu's trigger was last pressed by a screen reader. */
  virtualPress?: boolean | undefined;
  readonly triggerFocusTargetRef: React.RefObject<HTMLElement | null>;
  readonly beforeTriggerFocusGuardRef: React.RefObject<HTMLElement | null>;
  readonly beforeContentFocusGuardRef: React.RefObject<HTMLElement | null>;
};
declare const selectors: {
  open: (state: {
    open: boolean;
    readonly openProp: boolean | undefined;
    mounted: boolean;
    transitionStatus: import("../../internals/useTransitionStatus.mjs").TransitionStatus;
    floatingRootContext: import("../../floating-ui-react/index.mjs").FloatingRootContext;
    floatingId: string | undefined;
    triggerCount: number;
    preventUnmountingOnClose: boolean;
    payload: unknown;
    activeTriggerId: string | null;
    activeTriggerElement: Element | null;
    openedWithoutTrigger: boolean;
    readonly triggerIdProp: string | null | undefined;
    popupElement: HTMLElement | null;
    positionerElement: HTMLElement | null;
    activeTriggerProps: HTMLProps;
    inactiveTriggerProps: HTMLProps;
    popupProps: HTMLProps;
  }) => boolean;
  mounted: (state: {
    open: boolean;
    readonly openProp: boolean | undefined;
    mounted: boolean;
    transitionStatus: import("../../internals/useTransitionStatus.mjs").TransitionStatus;
    floatingRootContext: import("../../floating-ui-react/index.mjs").FloatingRootContext;
    floatingId: string | undefined;
    triggerCount: number;
    preventUnmountingOnClose: boolean;
    payload: unknown;
    activeTriggerId: string | null;
    activeTriggerElement: Element | null;
    openedWithoutTrigger: boolean;
    readonly triggerIdProp: string | null | undefined;
    popupElement: HTMLElement | null;
    positionerElement: HTMLElement | null;
    activeTriggerProps: HTMLProps;
    inactiveTriggerProps: HTMLProps;
    popupProps: HTMLProps;
  }) => boolean;
  transitionStatus: (state: {
    open: boolean;
    readonly openProp: boolean | undefined;
    mounted: boolean;
    transitionStatus: import("../../internals/useTransitionStatus.mjs").TransitionStatus;
    floatingRootContext: import("../../floating-ui-react/index.mjs").FloatingRootContext;
    floatingId: string | undefined;
    triggerCount: number;
    preventUnmountingOnClose: boolean;
    payload: unknown;
    activeTriggerId: string | null;
    activeTriggerElement: Element | null;
    openedWithoutTrigger: boolean;
    readonly triggerIdProp: string | null | undefined;
    popupElement: HTMLElement | null;
    positionerElement: HTMLElement | null;
    activeTriggerProps: HTMLProps;
    inactiveTriggerProps: HTMLProps;
    popupProps: HTMLProps;
  }) => import("../../internals/useTransitionStatus.mjs").TransitionStatus;
  floatingRootContext: (state: {
    open: boolean;
    readonly openProp: boolean | undefined;
    mounted: boolean;
    transitionStatus: import("../../internals/useTransitionStatus.mjs").TransitionStatus;
    floatingRootContext: import("../../floating-ui-react/index.mjs").FloatingRootContext;
    floatingId: string | undefined;
    triggerCount: number;
    preventUnmountingOnClose: boolean;
    payload: unknown;
    activeTriggerId: string | null;
    activeTriggerElement: Element | null;
    openedWithoutTrigger: boolean;
    readonly triggerIdProp: string | null | undefined;
    popupElement: HTMLElement | null;
    positionerElement: HTMLElement | null;
    activeTriggerProps: HTMLProps;
    inactiveTriggerProps: HTMLProps;
    popupProps: HTMLProps;
  }) => import("../../floating-ui-react/components/FloatingRootStore.mjs").FloatingRootStore;
  triggerCount: (state: {
    open: boolean;
    readonly openProp: boolean | undefined;
    mounted: boolean;
    transitionStatus: import("../../internals/useTransitionStatus.mjs").TransitionStatus;
    floatingRootContext: import("../../floating-ui-react/index.mjs").FloatingRootContext;
    floatingId: string | undefined;
    triggerCount: number;
    preventUnmountingOnClose: boolean;
    payload: unknown;
    activeTriggerId: string | null;
    activeTriggerElement: Element | null;
    openedWithoutTrigger: boolean;
    readonly triggerIdProp: string | null | undefined;
    popupElement: HTMLElement | null;
    positionerElement: HTMLElement | null;
    activeTriggerProps: HTMLProps;
    inactiveTriggerProps: HTMLProps;
    popupProps: HTMLProps;
  }) => number;
  preventUnmountingOnClose: (state: {
    open: boolean;
    readonly openProp: boolean | undefined;
    mounted: boolean;
    transitionStatus: import("../../internals/useTransitionStatus.mjs").TransitionStatus;
    floatingRootContext: import("../../floating-ui-react/index.mjs").FloatingRootContext;
    floatingId: string | undefined;
    triggerCount: number;
    preventUnmountingOnClose: boolean;
    payload: unknown;
    activeTriggerId: string | null;
    activeTriggerElement: Element | null;
    openedWithoutTrigger: boolean;
    readonly triggerIdProp: string | null | undefined;
    popupElement: HTMLElement | null;
    positionerElement: HTMLElement | null;
    activeTriggerProps: HTMLProps;
    inactiveTriggerProps: HTMLProps;
    popupProps: HTMLProps;
  }) => boolean;
  payload: (state: {
    open: boolean;
    readonly openProp: boolean | undefined;
    mounted: boolean;
    transitionStatus: import("../../internals/useTransitionStatus.mjs").TransitionStatus;
    floatingRootContext: import("../../floating-ui-react/index.mjs").FloatingRootContext;
    floatingId: string | undefined;
    triggerCount: number;
    preventUnmountingOnClose: boolean;
    payload: unknown;
    activeTriggerId: string | null;
    activeTriggerElement: Element | null;
    openedWithoutTrigger: boolean;
    readonly triggerIdProp: string | null | undefined;
    popupElement: HTMLElement | null;
    positionerElement: HTMLElement | null;
    activeTriggerProps: HTMLProps;
    inactiveTriggerProps: HTMLProps;
    popupProps: HTMLProps;
  }) => unknown;
  activeTriggerId: (state: {
    open: boolean;
    readonly openProp: boolean | undefined;
    mounted: boolean;
    transitionStatus: import("../../internals/useTransitionStatus.mjs").TransitionStatus;
    floatingRootContext: import("../../floating-ui-react/index.mjs").FloatingRootContext;
    floatingId: string | undefined;
    triggerCount: number;
    preventUnmountingOnClose: boolean;
    payload: unknown;
    activeTriggerId: string | null;
    activeTriggerElement: Element | null;
    openedWithoutTrigger: boolean;
    readonly triggerIdProp: string | null | undefined;
    popupElement: HTMLElement | null;
    positionerElement: HTMLElement | null;
    activeTriggerProps: HTMLProps;
    inactiveTriggerProps: HTMLProps;
    popupProps: HTMLProps;
  }) => string | null;
  activeTriggerElement: (state: {
    open: boolean;
    readonly openProp: boolean | undefined;
    mounted: boolean;
    transitionStatus: import("../../internals/useTransitionStatus.mjs").TransitionStatus;
    floatingRootContext: import("../../floating-ui-react/index.mjs").FloatingRootContext;
    floatingId: string | undefined;
    triggerCount: number;
    preventUnmountingOnClose: boolean;
    payload: unknown;
    activeTriggerId: string | null;
    activeTriggerElement: Element | null;
    openedWithoutTrigger: boolean;
    readonly triggerIdProp: string | null | undefined;
    popupElement: HTMLElement | null;
    positionerElement: HTMLElement | null;
    activeTriggerProps: HTMLProps;
    inactiveTriggerProps: HTMLProps;
    popupProps: HTMLProps;
  }) => Element | null;
  popupId: (state: {
    open: boolean;
    readonly openProp: boolean | undefined;
    mounted: boolean;
    transitionStatus: import("../../internals/useTransitionStatus.mjs").TransitionStatus;
    floatingRootContext: import("../../floating-ui-react/index.mjs").FloatingRootContext;
    floatingId: string | undefined;
    triggerCount: number;
    preventUnmountingOnClose: boolean;
    payload: unknown;
    activeTriggerId: string | null;
    activeTriggerElement: Element | null;
    openedWithoutTrigger: boolean;
    readonly triggerIdProp: string | null | undefined;
    popupElement: HTMLElement | null;
    positionerElement: HTMLElement | null;
    activeTriggerProps: HTMLProps;
    inactiveTriggerProps: HTMLProps;
    popupProps: HTMLProps;
  }) => string | undefined;
  isTriggerActive: (state: {
    open: boolean;
    readonly openProp: boolean | undefined;
    mounted: boolean;
    transitionStatus: import("../../internals/useTransitionStatus.mjs").TransitionStatus;
    floatingRootContext: import("../../floating-ui-react/index.mjs").FloatingRootContext;
    floatingId: string | undefined;
    triggerCount: number;
    preventUnmountingOnClose: boolean;
    payload: unknown;
    activeTriggerId: string | null;
    activeTriggerElement: Element | null;
    openedWithoutTrigger: boolean;
    readonly triggerIdProp: string | null | undefined;
    popupElement: HTMLElement | null;
    positionerElement: HTMLElement | null;
    activeTriggerProps: HTMLProps;
    inactiveTriggerProps: HTMLProps;
    popupProps: HTMLProps;
  }, triggerId: string | undefined) => boolean;
  isOpenedByTrigger: (state: {
    open: boolean;
    readonly openProp: boolean | undefined;
    mounted: boolean;
    transitionStatus: import("../../internals/useTransitionStatus.mjs").TransitionStatus;
    floatingRootContext: import("../../floating-ui-react/index.mjs").FloatingRootContext;
    floatingId: string | undefined;
    triggerCount: number;
    preventUnmountingOnClose: boolean;
    payload: unknown;
    activeTriggerId: string | null;
    activeTriggerElement: Element | null;
    openedWithoutTrigger: boolean;
    readonly triggerIdProp: string | null | undefined;
    popupElement: HTMLElement | null;
    positionerElement: HTMLElement | null;
    activeTriggerProps: HTMLProps;
    inactiveTriggerProps: HTMLProps;
    popupProps: HTMLProps;
  }, triggerId: string | undefined) => boolean;
  isMountedByTrigger: (state: {
    open: boolean;
    readonly openProp: boolean | undefined;
    mounted: boolean;
    transitionStatus: import("../../internals/useTransitionStatus.mjs").TransitionStatus;
    floatingRootContext: import("../../floating-ui-react/index.mjs").FloatingRootContext;
    floatingId: string | undefined;
    triggerCount: number;
    preventUnmountingOnClose: boolean;
    payload: unknown;
    activeTriggerId: string | null;
    activeTriggerElement: Element | null;
    openedWithoutTrigger: boolean;
    readonly triggerIdProp: string | null | undefined;
    popupElement: HTMLElement | null;
    positionerElement: HTMLElement | null;
    activeTriggerProps: HTMLProps;
    inactiveTriggerProps: HTMLProps;
    popupProps: HTMLProps;
  }, triggerId: string | undefined) => boolean;
  triggerProps: (state: {
    open: boolean;
    readonly openProp: boolean | undefined;
    mounted: boolean;
    transitionStatus: import("../../internals/useTransitionStatus.mjs").TransitionStatus;
    floatingRootContext: import("../../floating-ui-react/index.mjs").FloatingRootContext;
    floatingId: string | undefined;
    triggerCount: number;
    preventUnmountingOnClose: boolean;
    payload: unknown;
    activeTriggerId: string | null;
    activeTriggerElement: Element | null;
    openedWithoutTrigger: boolean;
    readonly triggerIdProp: string | null | undefined;
    popupElement: HTMLElement | null;
    positionerElement: HTMLElement | null;
    activeTriggerProps: HTMLProps;
    inactiveTriggerProps: HTMLProps;
    popupProps: HTMLProps;
  }, isActive: boolean) => HTMLProps;
  triggerPopupId: (state: {
    open: boolean;
    readonly openProp: boolean | undefined;
    mounted: boolean;
    transitionStatus: import("../../internals/useTransitionStatus.mjs").TransitionStatus;
    floatingRootContext: import("../../floating-ui-react/index.mjs").FloatingRootContext;
    floatingId: string | undefined;
    triggerCount: number;
    preventUnmountingOnClose: boolean;
    payload: unknown;
    activeTriggerId: string | null;
    activeTriggerElement: Element | null;
    openedWithoutTrigger: boolean;
    readonly triggerIdProp: string | null | undefined;
    popupElement: HTMLElement | null;
    positionerElement: HTMLElement | null;
    activeTriggerProps: HTMLProps;
    inactiveTriggerProps: HTMLProps;
    popupProps: HTMLProps;
  }, triggerId: string | undefined) => string | undefined;
  popupProps: (state: {
    open: boolean;
    readonly openProp: boolean | undefined;
    mounted: boolean;
    transitionStatus: import("../../internals/useTransitionStatus.mjs").TransitionStatus;
    floatingRootContext: import("../../floating-ui-react/index.mjs").FloatingRootContext;
    floatingId: string | undefined;
    triggerCount: number;
    preventUnmountingOnClose: boolean;
    payload: unknown;
    activeTriggerId: string | null;
    activeTriggerElement: Element | null;
    openedWithoutTrigger: boolean;
    readonly triggerIdProp: string | null | undefined;
    popupElement: HTMLElement | null;
    positionerElement: HTMLElement | null;
    activeTriggerProps: HTMLProps;
    inactiveTriggerProps: HTMLProps;
    popupProps: HTMLProps;
  }) => HTMLProps;
  popupElement: (state: {
    open: boolean;
    readonly openProp: boolean | undefined;
    mounted: boolean;
    transitionStatus: import("../../internals/useTransitionStatus.mjs").TransitionStatus;
    floatingRootContext: import("../../floating-ui-react/index.mjs").FloatingRootContext;
    floatingId: string | undefined;
    triggerCount: number;
    preventUnmountingOnClose: boolean;
    payload: unknown;
    activeTriggerId: string | null;
    activeTriggerElement: Element | null;
    openedWithoutTrigger: boolean;
    readonly triggerIdProp: string | null | undefined;
    popupElement: HTMLElement | null;
    positionerElement: HTMLElement | null;
    activeTriggerProps: HTMLProps;
    inactiveTriggerProps: HTMLProps;
    popupProps: HTMLProps;
  }) => HTMLElement | null;
  positionerElement: (state: {
    open: boolean;
    readonly openProp: boolean | undefined;
    mounted: boolean;
    transitionStatus: import("../../internals/useTransitionStatus.mjs").TransitionStatus;
    floatingRootContext: import("../../floating-ui-react/index.mjs").FloatingRootContext;
    floatingId: string | undefined;
    triggerCount: number;
    preventUnmountingOnClose: boolean;
    payload: unknown;
    activeTriggerId: string | null;
    activeTriggerElement: Element | null;
    openedWithoutTrigger: boolean;
    readonly triggerIdProp: string | null | undefined;
    popupElement: HTMLElement | null;
    positionerElement: HTMLElement | null;
    activeTriggerProps: HTMLProps;
    inactiveTriggerProps: HTMLProps;
    popupProps: HTMLProps;
  }) => HTMLElement | null;
  disabled: (state: State<unknown>) => boolean;
  modal: (state: State<unknown>) => boolean;
  openMethod: (state: State<unknown>) => InteractionType | null;
  keyboardOpen: (state: State<unknown>) => boolean;
  allowMouseEnter: (state: State<unknown>) => boolean;
  highlightItemOnHover: (state: State<unknown>) => boolean;
  parent: (state: State<unknown>) => MenuParent;
  rootId: (state: State<unknown>) => string | undefined;
  activeIndex: (state: State<unknown>) => number | null;
  listElement: (state: State<unknown>) => HTMLElement | null;
  /** The trigger's `aria-controls`: the list when one holds the `menu` role, else the popup. */
  triggerControlsId: (state: State<unknown>, triggerId: string | undefined) => string | undefined;
  filterTriggerProps: (state: State<unknown>) => HTMLProps;
  inputProps: (state: State<unknown>) => HTMLProps;
  webkitAriaSelected: (state: State<unknown>, highlighted: boolean) => true | undefined;
  highlightedItemId: (state: State<unknown>) => string | undefined;
  isActive: (state: State<unknown>, itemIndex: number) => boolean;
  hoverEnabled: (state: State<unknown>) => boolean;
  instantType: (state: State<unknown>) => "click" | "dismiss" | "group" | "trigger-change" | undefined;
  lastOpenChangeReason: (state: State<unknown>) => import("../index.mjs").MenuRootChangeEventReason | null;
  floatingTreeRoot: (state: State<unknown>) => FloatingTreeStore;
  floatingNodeId: (state: State<unknown>) => string | undefined;
  floatingParentNodeId: (state: State<unknown>) => string | null;
  itemProps: (state: State<unknown>) => HTMLProps;
  closeDelay: (state: State<unknown>) => number;
  adaptiveOrigin: (state: State<unknown>) => AdaptiveOriginMiddleware | undefined;
  keyboardEventRelay: (state: State<unknown>) => React.KeyboardEventHandler<any> | undefined;
};
type Selectors = typeof selectors;
/**
 * The store view that detached handle-backed triggers read from. Both the real `MenuStore` and the
 * inert fallback store satisfy it, so a trigger can read from whichever store the handle currently
 * exposes. Narrowed to the members a trigger actually uses — the trigger-data members plus `setOpen`
 * (called by the focus guards) — so the exposed surface can't bypass the open-change pipeline; on
 * the detached fallback store every one of these mutations is a no-op.
 */
export type MenuHandleStore<Payload> = Pick<MenuStore<Payload>, PopupTriggerStoreKeys | 'setOpen'>;
export declare class MenuStore<Payload> extends ReactStore<Readonly<State<Payload>>, Context, Selectors> {
  constructor(initialState?: Partial<State<Payload>>, floatingId?: string | undefined, nested?: boolean);
  /**
   * Propagates changes of the parent menu's shared tree state to this store's subscribers.
   * The owning `Menu.Root` calls it from an effect so the parent store subscription is released
   * when the submenu unmounts.
   * @returns A function that removes the parent store subscription.
   */
  subscribeToParentMenu(): (() => void) | undefined;
  setOpen(open: boolean, eventDetails: Omit<MenuRoot.ChangeEventDetails, 'preventUnmountOnClose'>): void;
  setActiveIndex(activeIndex: number | null, reason: MenuRoot.HighlightEventReason, event?: Event | undefined): void;
  highlightItem(element: Element | null, reason: MenuRoot.HighlightEventReason, event?: Event | undefined): void;
}
/**
 * Creates the inert fallback store used by detached handle-backed triggers while no `Menu.Root` is
 * attached. It preserves a menu-specific trigger registry in context so detached triggers can
 * register before migrating to the live root store. `setOpen` is a no-op (matching the inert
 * reads/writes of `NullStore`), so a trigger can hand the store to focus-guard helpers that expect
 * `setOpen` without it ever taking effect while detached.
 */
export declare function createNullMenuStore<Payload>(): MenuHandleStore<Payload>;
export {};