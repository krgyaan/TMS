'use client';

import * as ReactDOM from 'react-dom';
import { getTabbableNearElement, isOutsideEvent } from "../../floating-ui-react/utils.mjs";
import { createChangeEventDetails } from "../../internals/createBaseUIEventDetails.mjs";
import { REASONS } from "../../internals/reasons.mjs";

/**
 * Minimal store interface required by the focus guard hook.
 * Both PopoverStore and MenuStore satisfy this interface.
 */

/**
 * Provides focus guard handlers for popup triggers (Popover, Menu).
 *
 * When the popup is open, invisible focus guard elements are placed before and after
 * the trigger. These handlers close the popup and move focus to the appropriate
 * tabbable element when the guards receive focus (i.e. when the user tabs out).
 */
export function useTriggerFocusGuards(store, triggerElementRef) {
  function closeAndFocus(event, direction, positionerElement) {
    const guard = event.currentTarget;
    ReactDOM.flushSync(() => {
      store.setOpen(false, createChangeEventDetails(REASONS.focusOut, event.nativeEvent, guard));
    });

    // The close callback may change the tab order. Resolve it after the flush, using
    // the trigger as the anchor if the guard unmounted, even when its tabIndex is -1.
    getTabbableNearElement(guard.isConnected ? guard : triggerElementRef.current, direction, positionerElement)?.focus();
  }
  function handlePreFocusGuardFocus(event) {
    closeAndFocus(event, -1, store.select('positionerElement'));
  }
  function handleFocusTargetFocus(event) {
    const positionerElement = store.select('positionerElement');
    if (positionerElement && isOutsideEvent(event, positionerElement)) {
      store.context.beforeContentFocusGuardRef.current?.focus();
    } else {
      closeAndFocus(event, 1, positionerElement);
    }
  }
  return {
    handlePreFocusGuardFocus,
    handleFocusTargetFocus
  };
}