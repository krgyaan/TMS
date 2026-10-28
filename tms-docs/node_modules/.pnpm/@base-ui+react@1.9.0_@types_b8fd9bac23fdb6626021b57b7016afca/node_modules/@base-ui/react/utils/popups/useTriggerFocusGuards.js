"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useTriggerFocusGuards = useTriggerFocusGuards;
var ReactDOM = _interopRequireWildcard(require("react-dom"));
var _utils = require("../../floating-ui-react/utils");
var _createBaseUIEventDetails = require("../../internals/createBaseUIEventDetails");
var _reasons = require("../../internals/reasons");
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
function useTriggerFocusGuards(store, triggerElementRef) {
  function closeAndFocus(event, direction, positionerElement) {
    const guard = event.currentTarget;
    ReactDOM.flushSync(() => {
      store.setOpen(false, (0, _createBaseUIEventDetails.createChangeEventDetails)(_reasons.REASONS.focusOut, event.nativeEvent, guard));
    });

    // The close callback may change the tab order. Resolve it after the flush, using
    // the trigger as the anchor if the guard unmounted, even when its tabIndex is -1.
    (0, _utils.getTabbableNearElement)(guard.isConnected ? guard : triggerElementRef.current, direction, positionerElement)?.focus();
  }
  function handlePreFocusGuardFocus(event) {
    closeAndFocus(event, -1, store.select('positionerElement'));
  }
  function handleFocusTargetFocus(event) {
    const positionerElement = store.select('positionerElement');
    if (positionerElement && (0, _utils.isOutsideEvent)(event, positionerElement)) {
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