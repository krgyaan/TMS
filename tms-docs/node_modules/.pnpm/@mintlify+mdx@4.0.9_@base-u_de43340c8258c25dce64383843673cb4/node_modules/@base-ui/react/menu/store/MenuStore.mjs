import * as React from 'react';
import { ReactStore } from '@base-ui/utils/store';
import { EMPTY_OBJECT, NOOP } from '@base-ui/utils/empty';
import { platform } from '@base-ui/utils/platform';
import { FloatingTreeStore } from "../../floating-ui-react/components/FloatingTreeStore.mjs";
import { NullStore } from "../../utils/NullStore.mjs";
import { createInitialPopupStoreState, popupStoreSelectors, PopupTriggerMap } from "../../utils/popups/index.mjs";
const selectors = {
  ...popupStoreSelectors,
  disabled: state => state.parent.type === 'menubar' ? state.parent.context.disabled || state.disabled : state.disabled,
  modal: state => (state.parent.type === undefined || state.parent.type === 'context-menu') && (state.modal ?? true),
  openMethod: state => state.openMethod,
  keyboardOpen: state => state.keyboardOpen,
  allowMouseEnter: state => state.allowMouseEnter,
  highlightItemOnHover: state => state.highlightItemOnHover,
  parent: state => state.parent,
  rootId: state => {
    if (state.parent.type === 'menu') {
      return state.parent.store.select('rootId');
    }
    return state.parent.type !== undefined ? state.parent.context.rootId : state.rootId;
  },
  activeIndex: state => state.activeIndex,
  listElement: state => state.listElement,
  /** The trigger's `aria-controls`: the list when one holds the `menu` role, else the popup. */
  triggerControlsId: (state, triggerId) => {
    const popupId = popupStoreSelectors.triggerPopupId(state, triggerId);
    return popupId ? state.listElement?.id || popupId : undefined;
  },
  filterTriggerProps: state => state.filterTriggerProps,
  inputProps: state => state.inputProps,
  // `aria-selected` is invalid on `menuitem`, but Safari VoiceOver needs it for arrow-key
  // navigation. Limit it to WebKit while the input has focus so normal VoiceOver navigation
  // does not encounter the invalid attribute.
  webkitAriaSelected: (state, highlighted) => platform.engine.webkit && state.inputFocused && highlighted ? true : undefined,
  highlightedItemId: state => state.highlightedItem?.id || undefined,
  isActive: (state, itemIndex) => state.activeIndex === itemIndex,
  hoverEnabled: state => state.hoverEnabled,
  // `trigger-change` describes a popup moving between triggers, which only has
  // meaning while it is open. Dropping it once closed keeps a late or stale
  // restoration from marking a closing popup instant and skipping its exit
  // transition, including on close paths that never reach `setOpen` — a
  // controlled consumer committing `open={false}` goes straight through the prop.
  instantType: state => state.instantType === 'trigger-change' && !popupStoreSelectors.open(state) ? undefined : state.instantType,
  lastOpenChangeReason: state => state.openChangeReason,
  floatingTreeRoot: state => {
    if (state.parent.type === 'menu') {
      return state.parent.store.select('floatingTreeRoot');
    }
    return state.floatingTreeRoot;
  },
  floatingNodeId: state => state.floatingNodeId,
  floatingParentNodeId: state => state.floatingParentNodeId,
  itemProps: state => state.itemProps,
  closeDelay: state => state.closeDelay,
  adaptiveOrigin: state => state.adaptiveOrigin,
  keyboardEventRelay: state => {
    if (state.keyboardEventRelay) {
      return state.keyboardEventRelay;
    }
    if (state.parent.type === 'menu') {
      return state.parent.store.select('keyboardEventRelay');
    }
    return undefined;
  }
};

/**
 * The store view that detached handle-backed triggers read from. Both the real `MenuStore` and the
 * inert fallback store satisfy it, so a trigger can read from whichever store the handle currently
 * exposes. Narrowed to the members a trigger actually uses — the trigger-data members plus `setOpen`
 * (called by the focus guards) — so the exposed surface can't bypass the open-change pipeline; on
 * the detached fallback store every one of these mutations is a no-op.
 */

export class MenuStore extends ReactStore {
  constructor(initialState, floatingId, nested = false) {
    const triggerElements = new PopupTriggerMap();
    const state = createInitialState(triggerElements, floatingId, nested, initialState);
    super(state, createInitialContext(triggerElements), selectors);

    // Share the mouse-up trigger ref of the parent menu, if any. This observes the store's own
    // state, so the subscription lives exactly as long as the store and needs no cleanup.
    void this.observe('parent', parent => {
      if (parent.type === 'menu') {
        this.context.allowMouseUpTriggerRef = parent.store.context.allowMouseUpTriggerRef;
      } else if (parent.type !== undefined) {
        this.context.allowMouseUpTriggerRef = parent.context.allowMouseUpTriggerRef;
      }
    });
  }

  /**
   * Propagates changes of the parent menu's shared tree state to this store's subscribers.
   * The owning `Menu.Root` calls it from an effect so the parent store subscription is released
   * when the submenu unmounts.
   * @returns A function that removes the parent store subscription.
   */
  subscribeToParentMenu() {
    const parent = this.state.parent;
    if (parent.type !== 'menu') {
      return undefined;
    }
    let rootId = parent.store.select('rootId');
    let floatingTreeRoot = parent.store.select('floatingTreeRoot');
    let keyboardEventRelay = parent.store.select('keyboardEventRelay');
    return parent.store.subscribe(() => {
      const nextRootId = parent.store.select('rootId');
      const nextFloatingTreeRoot = parent.store.select('floatingTreeRoot');
      const nextKeyboardEventRelay = parent.store.select('keyboardEventRelay');
      if (rootId === nextRootId && floatingTreeRoot === nextFloatingTreeRoot && keyboardEventRelay === nextKeyboardEventRelay) {
        return;
      }
      rootId = nextRootId;
      floatingTreeRoot = nextFloatingTreeRoot;
      keyboardEventRelay = nextKeyboardEventRelay;
      this.notifyAll();
    });
  }
  setOpen(open, eventDetails) {
    this.state.floatingRootContext.context.events.emit('setOpen', {
      open,
      eventDetails
    });
  }
  setActiveIndex(activeIndex, reason, event) {
    // Only a write that changes the index is reported. Tagging a no-op, or a write back to the
    // reported item before the change commits, would let a later registry-driven re-emit report
    // this reason instead of `none`.
    if (this.state.activeIndex !== activeIndex) {
      const item = activeIndex === null ? undefined : this.context.itemDomElements.current[activeIndex];
      const isWriteBack = item === this.context.reportedItem;
      this.context.highlightReason = isWriteBack ? 'none' : reason;
      this.context.highlightEvent = isWriteBack ? undefined : event;
    }
    this.set('activeIndex', activeIndex);
  }
  highlightItem(element, reason, event) {
    const index = this.context.itemDomElements.current.indexOf(element);
    if (index > -1) {
      this.setActiveIndex(index, reason, event);
    }
  }
}

/**
 * Creates the inert fallback store used by detached handle-backed triggers while no `Menu.Root` is
 * attached. It preserves a menu-specific trigger registry in context so detached triggers can
 * register before migrating to the live root store. `setOpen` is a no-op (matching the inert
 * reads/writes of `NullStore`), so a trigger can hand the store to focus-guard helpers that expect
 * `setOpen` without it ever taking effect while detached.
 */
export function createNullMenuStore() {
  const triggerElements = new PopupTriggerMap();
  const store = new NullStore(Object.freeze(createInitialState(triggerElements)), Object.freeze(createInitialContext(triggerElements)), selectors);
  return Object.assign(store, {
    setOpen: NOOP
  });
}
function createInitialContext(triggerElements) {
  return {
    positionerRef: /*#__PURE__*/React.createRef(),
    popupRef: /*#__PURE__*/React.createRef(),
    typingRef: {
      current: false
    },
    itemDomElements: {
      current: []
    },
    itemLabels: {
      current: []
    },
    highlightReason: 'none',
    highlightEvent: undefined,
    reportedItem: undefined,
    allowMouseUpTriggerRef: {
      current: false
    },
    virtualFocusRef: undefined,
    triggerFocusTargetRef: /*#__PURE__*/React.createRef(),
    beforeTriggerFocusGuardRef: /*#__PURE__*/React.createRef(),
    beforeContentFocusGuardRef: /*#__PURE__*/React.createRef(),
    onOpenChangeComplete: undefined,
    triggerElements
  };
}
function createInitialState(triggerElements, floatingId, nested = false, initialState) {
  return {
    ...createInitialPopupStoreState(triggerElements, floatingId, nested),
    disabled: false,
    modal: true,
    openMethod: null,
    keyboardOpen: false,
    allowMouseEnter: false,
    highlightItemOnHover: true,
    parent: {
      type: undefined
    },
    rootId: undefined,
    activeIndex: null,
    listElement: null,
    filterTriggerProps: EMPTY_OBJECT,
    inputProps: EMPTY_OBJECT,
    inputFocused: false,
    highlightedItem: undefined,
    hoverEnabled: true,
    instantType: undefined,
    openChangeReason: null,
    floatingTreeRoot: new FloatingTreeStore(),
    floatingNodeId: undefined,
    floatingParentNodeId: null,
    itemProps: EMPTY_OBJECT,
    keyboardEventRelay: undefined,
    closeDelay: 0,
    adaptiveOrigin: undefined,
    ...initialState
  };
}