'use client';

import { ownerWindow } from '@base-ui/utils/owner';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import { EMPTY_ARRAY } from '@base-ui/utils/empty';
import { isHTMLElement } from '@floating-ui/utils/dom';
import { useMenuRootContext } from "../root/MenuRootContext.mjs";
import { useMenuSubmenuRootContext } from "../submenu-root/MenuSubmenuRootContext.mjs";
import { useDirection } from "../../internals/direction-context/DirectionContext.mjs";
import { createChangeEventDetails } from "../../internals/createBaseUIEventDetails.mjs";
import { REASONS } from "../../internals/reasons.mjs";
import { stopEvent } from "../../floating-ui-react/utils/event.mjs";
import { getMaxListIndex, getMinListIndex } from "../../floating-ui-react/utils/composite.mjs";
import { dispatchClickWithModifiers } from "../../utils/dispatchClickWithModifiers.mjs";
import { isCrossOrientationCloseKey, isCrossOrientationOpenKey, isMainOrientationKey } from "../../floating-ui-react/hooks/useListNavigation.mjs";
/**
 * Decides what a key does while the filter input owns the keyboard.
 */
export function getMenuFilterKeyAction(event, context) {
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
  if (isMainOrientationKey(key, orientation)) {
    // Left and Right move the caret of a non-empty input while nothing is highlighted.
    return orientation === 'horizontal' && !hasActiveItem && hasValue ? 'edit' : 'navigate';
  }

  // A highlighted submenu trigger takes the cross-axis keys to open or close its submenu.
  if (activeItemOpensSubmenu && (isCrossOrientationOpenKey(key, orientation, rtl) || isCrossOrientationCloseKey(key, orientation, rtl, false))) {
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
export function useMenuFilterKeyDown(hasValue) {
  const {
    orientation,
    store
  } = useMenuRootContext();
  const submenuContext = useMenuSubmenuRootContext();
  const direction = useDirection();
  return useStableCallback(event => {
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
          if (isMainOrientationKey(event.key, orientation)) {
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
          const index = event.key === 'ArrowDown' ? getMinListIndex(listRef, EMPTY_ARRAY) : getMaxListIndex(listRef, EMPTY_ARRAY);
          if (listRef.current[index]) {
            event.preventDefault();
            store.setActiveIndex(index, REASONS.keyboard, event.nativeEvent);
          }
          break;
        }
      case 'submenu':
        {
          // The highlighted item's own handlers decide, since opening depends on the item and on
          // both menus' orientations, and they read `currentTarget`, so the key is dispatched on
          // it. Its propagation reaches the popup, which closes a submenu.
          stopEvent(event);
          const KeyboardEventConstructor = ownerWindow(activeItem).KeyboardEvent;
          activeItem.dispatchEvent(new KeyboardEventConstructor(event.type, event.nativeEvent));
          break;
        }
      case 'activate':
        event.preventDefault();
        dispatchClickWithModifiers(activeItem, event);
        break;
      case 'close':
        {
          // Mirror the plain menu: Shift+Tab closes the popup and returns focus. A submenu returns
          // to the element that held focus in its parent, which is the parent's input rather than
          // its untabbable trigger when the parent is filterable too.
          stopEvent(event);
          const returnElement = store.state.parent.type === 'menu' && submenuContext?.getReturnElement?.() || store.state.activeTriggerElement;
          const details = createChangeEventDetails(REASONS.focusOut, event.nativeEvent);
          store.setOpen(false, details);
          if (!details.isCanceled && isHTMLElement(returnElement)) {
            returnElement.focus();
          }
          break;
        }
      default:
        break;
    }
  });
}