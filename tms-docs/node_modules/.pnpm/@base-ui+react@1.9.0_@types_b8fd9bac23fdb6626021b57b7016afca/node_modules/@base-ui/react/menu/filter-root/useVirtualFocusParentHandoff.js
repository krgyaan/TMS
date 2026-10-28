"use strict";
'use client';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useVirtualFocusParentHandoff = useVirtualFocusParentHandoff;
var _owner = require("@base-ui/utils/owner");
var _shadowDom = require("@base-ui/utils/shadowDom");
var _useIsoLayoutEffect = require("@base-ui/utils/useIsoLayoutEffect");
var _useStableCallback = require("@base-ui/utils/useStableCallback");
var _reasons = require("../../internals/reasons");
/**
 * A plain submenu whose parent is filterable. The parent keeps real focus on its input, so its
 * trigger never blurs and its return focus waits for this popup's exit animation. The submenu
 * hands focus and the parent's highlight back itself.
 */
function useVirtualFocusParentHandoff(store, parent, open, virtualFocus) {
  const parentStore = parent.type === 'menu' ? parent.store : null;
  const parentVirtualFocusRef = parentStore?.context.virtualFocusRef;
  const returnToParent = (0, _useStableCallback.useStableCallback)((trigger, reason) => {
    const focusOwner = parentVirtualFocusRef?.current;
    if (virtualFocus || store.select('open') || !parentStore?.select('open') || !focusOwner) {
      return;
    }
    if ((0, _shadowDom.contains)(store.context.popupRef.current, (0, _shadowDom.activeElement)((0, _owner.ownerDocument)(focusOwner)))) {
      focusOwner.focus({
        preventScroll: true
      });
    }
    if ((reason === _reasons.REASONS.listNavigation || reason === _reasons.REASONS.escapeKey) && parentStore.state.activeIndex == null) {
      // The closing key is gone by this microtask, so there is no event to report it with.
      parentStore.highlightItem(trigger, _reasons.REASONS.none);
    }
  });
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    if (!open) {
      // A parent closing in the same commit, such as on an item press, syncs its controlled `open`
      // in its own layout effect, which runs after this one. An unmount can clear the trigger by
      // then, so read it now.
      const trigger = store.state.activeTriggerElement;
      const reason = store.select('lastOpenChangeReason');
      queueMicrotask(() => returnToParent(trigger, reason));
    }
  }, [open, store, returnToParent]);

  // Real focus entering this submenu is when a plain parent's trigger would blur: the parent has
  // no active item until a keyboard close hands the cursor back to the trigger.
  function handleFocus() {
    if (!virtualFocus && parentVirtualFocusRef && parentStore?.state.activeIndex != null) {
      parentStore.setActiveIndex(null, _reasons.REASONS.none);
    }
  }
  return {
    parentVirtualFocusRef,
    handleFocus
  };
}