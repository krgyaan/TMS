"use strict";
'use client';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getMenuFilterKeyAction = getMenuFilterKeyAction;
exports.useMenuFilterKeyDown = useMenuFilterKeyDown;
var _owner = require("@base-ui/utils/owner");
var _useStableCallback = require("@base-ui/utils/useStableCallback");
var _empty = require("@base-ui/utils/empty");
var _dom = require("@floating-ui/utils/dom");
var _MenuRootContext = require("../root/MenuRootContext");
var _MenuSubmenuRootContext = require("../submenu-root/MenuSubmenuRootContext");
var _DirectionContext = require("../../internals/direction-context/DirectionContext");
var _createBaseUIEventDetails = require("../../internals/createBaseUIEventDetails");
var _reasons = require("../../internals/reasons");
var _event = require("../../floating-ui-react/utils/event");
var _composite = require("../../floating-ui-react/utils/composite");
var _dispatchClickWithModifiers = require("../../utils/dispatchClickWithModifiers");
var _useListNavigation = require("../../floating-ui-react/hooks/useListNavigation");
/**
 * Decides what a key does while the filter input owns the keyboard.
 */
function getMenuFilterKeyAction(event, context) {
  const {
    orientation,
    rtl,
    hasActiveItem,
    activeItemOpensSubmenu,
    hasValue
  } = context;
  const {
    key
  } = event;
  // Enter that commits an IME composition belongs to the input, not the list.
  if (event.which === 229) {
    return 'ignore';
  }
  if (key === 'Tab') {
    return event.shiftKey ? 'close' : 'ignore';
  }
  if (key === 'Enter') {
    return hasActiveItem ? 'activate' : 'navigate';
  }
  const isArrow = key.startsWith('Arrow');
  const isBoundary = key === 'Home' || key === 'End';

  // Modified arrows and boundary keys are text-editing commands (extend the selection, move by
  // word or to a text boundary), like a modified character.
  if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
    return isArrow || isBoundary || key.length === 1 ? 'edit' : 'navigate';
  }
  // Characters stay out of parent handlers such as typeahead.
  if (key.length === 1) {
    return 'edit';
  }
  // Home and End move the caret while the input has text, and jump to the ends of the list
  // otherwise once an item is highlighted.
  if (isBoundary) {
    return hasActiveItem && !hasValue ? 'navigate' : 'edit';
  }
  if (!isArrow) {
    return 'navigate';
  }
  if ((0, _useListNavigation.isMainOrientationKey)(key, orientation)) {
    // Left and Right move the caret of a non-empty input while nothing is highlighted.
    return orientation === 'horizontal' && !hasActiveItem && hasValue ? 'edit' : 'navigate';
  }

  // A highlighted submenu trigger takes the cross-axis keys to open or close its submenu.
  if (activeItemOpensSubmenu && ((0, _useListNavigation.isCrossOrientationOpenKey)(key, orientation, rtl) || (0, _useListNavigation.isCrossOrientationCloseKey)(key, orientation, rtl, false))) {
    return 'submenu';
  }
  if (orientation === 'horizontal' && !hasActiveItem) {
    return 'enter-list';
  }
  // Otherwise the cross-axis keys move the caret. On an empty input they fall through so they
  // can still close a submenu.
  return hasValue ? 'edit' : 'navigate';
}

/**
 * Routes keys for a filterable menu's input, which holds real focus while the list is navigated
 * with `aria-activedescendant`. Keys reaching the input, and those an item that received real
 * focus from assistive technology hands back, go through here; the trigger relays only the
 * vertical arrows while the popup is open. Navigation runs the menu's own `useListNavigation`
 * handler directly.
 */
function useMenuFilterKeyDown(hasValue) {
  const {
    orientation,
    store
  } = (0, _MenuRootContext.useMenuRootContext)();
  const submenuContext = (0, _MenuSubmenuRootContext.useMenuSubmenuRootContext)();
  const direction = (0, _DirectionContext.useDirection)();
  return (0, _useStableCallback.useStableCallback)(event => {
    // Like a plain menu, ignore keys while the popup animates out with the input still focused.
    if (!store.select('open')) {
      return;
    }
    const activeItem = store.state.highlightedItem;
    const action = getMenuFilterKeyAction(event, {
      orientation,
      rtl: direction === 'rtl',
      hasActiveItem: activeItem != null,
      activeItemOpensSubmenu: activeItem?.hasAttribute('aria-haspopup') ?? false,
      hasValue
    });
    switch (action) {
      case 'edit':
        event.stopPropagation();
        // Typing ends pointer modality, as it does in a combobox, so a result change that moves
        // the highlighted item out from under a resting pointer doesn't clear the highlight.
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          store.state.inputProps.onKeyDown?.(event);
        }
        break;
      case 'navigate':
        {
          if ((0, _useListNavigation.isMainOrientationKey)(event.key, orientation)) {
            // Keep the same event from reaching the popup's list navigation and moving the virtual
            // cursor a second time.
            event.stopPropagation();
          }
          store.state.inputProps.onKeyDown?.(event);
          break;
        }
      case 'enter-list':
        {
          event.stopPropagation();
          const listRef = store.context.itemDomElements;
          const index = event.key === 'ArrowDown' ? (0, _composite.getMinListIndex)(listRef, _empty.EMPTY_ARRAY) : (0, _composite.getMaxListIndex)(listRef, _empty.EMPTY_ARRAY);
          if (listRef.current[index]) {
            event.preventDefault();
            store.setActiveIndex(index, _reasons.REASONS.keyboard, event.nativeEvent);
          }
          break;
        }
      case 'submenu':
        {
          // The highlighted item's own handlers decide, since opening depends on the item and on
          // both menus' orientations, and they read `currentTarget`, so the key is dispatched on
          // it. Its propagation reaches the popup, which closes a submenu.
          (0, _event.stopEvent)(event);
          const KeyboardEventConstructor = (0, _owner.ownerWindow)(activeItem).KeyboardEvent;
          activeItem.dispatchEvent(new KeyboardEventConstructor(event.type, event.nativeEvent));
          break;
        }
      case 'activate':
        event.preventDefault();
        (0, _dispatchClickWithModifiers.dispatchClickWithModifiers)(activeItem, event);
        break;
      case 'close':
        {
          // Mirror the plain menu: Shift+Tab closes the popup and returns focus. A submenu returns
          // to the element that held focus in its parent, which is the parent's input rather than
          // its untabbable trigger when the parent is filterable too.
          (0, _event.stopEvent)(event);
          const returnElement = store.state.parent.type === 'menu' && submenuContext?.getReturnElement?.() || store.state.activeTriggerElement;
          const details = (0, _createBaseUIEventDetails.createChangeEventDetails)(_reasons.REASONS.focusOut, event.nativeEvent);
          store.setOpen(false, details);
          if (!details.isCanceled && (0, _dom.isHTMLElement)(returnElement)) {
            returnElement.focus();
          }
          break;
        }
      default:
        break;
    }
  });
}