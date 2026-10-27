"use strict";
'use client';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useSetFieldFocused = useSetFieldFocused;
var _useIsoLayoutEffect = require("@base-ui/utils/useIsoLayoutEffect");
var _useStableCallback = require("@base-ui/utils/useStableCallback");
var _FieldRootContext = require("./FieldRootContext");
/**
 * Returns the field's `setFocused`, recording which control the focused state belongs to.
 *
 * Disabling or unmounting a focused control moves focus away without firing `blur`, so the focused
 * state would otherwise stay latched. A field can have several focus targets, so a control only
 * clears the shared state when focus last landed on itself. The stable callback doubles as that
 * identity.
 */
function useSetFieldFocused(disabled, focusTargetRef, onFocusedChange) {
  const {
    setFocused,
    focusOwnerRef
  } = (0, _FieldRootContext.useFieldRootContext)();
  const setFieldFocused = (0, _useStableCallback.useStableCallback)(focused => {
    // A disabled target can still be focused (`aria-disabled` elements stay programmatically
    // focusable), but must not publish the field's focused styling.
    if (focused ? !disabled : focusOwnerRef.current === setFieldFocused) {
      focusOwnerRef.current = focused && setFieldFocused;
      onFocusedChange?.(focused);
      setFocused(focused);
    }
  });

  // Re-run when `disabled` changes so a focused control releases the field even when the browser
  // does not fire `blur`. The setup reclaims focus that no focus event reported: StrictMode
  // re-running effects after a mount-time focus, a control focused before hydration, or an
  // `aria-disabled` control re-enabled while it kept focus.
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    const el = focusTargetRef.current;
    const root = el?.getRootNode();
    if (root?.activeElement === el) {
      setFieldFocused(true);
    }
    return () => setFieldFocused(false);
  }, [disabled, focusTargetRef, setFieldFocused]);
  return setFieldFocused;
}