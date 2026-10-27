import { ownerWindow } from '@base-ui/utils/owner';
/**
 * Dispatches a constructed click on the target so it carries the source event's
 * modifier state, which `click()` always reports as unpressed. Like `click()`,
 * the untrusted click still runs native activation behavior (form submission,
 * link navigation).
 * `detail` defaults to 0 and `pointerType` to `''` (the native convention for
 * keyboard-generated clicks). When the click represents a mouse gesture, pass
 * `detail: 1` and `pointerType: 'mouse'` so consumers don't classify it as a
 * keyboard activation.
 */
export function dispatchClickWithModifiers(target, sourceEvent, {
  detail = 0,
  pointerType = ''
} = {}) {
  target.dispatchEvent(new (ownerWindow(target).PointerEvent)('click', {
    bubbles: true,
    cancelable: true,
    composed: true,
    detail,
    pointerType,
    shiftKey: sourceEvent.shiftKey,
    ctrlKey: sourceEvent.ctrlKey,
    altKey: sourceEvent.altKey,
    metaKey: sourceEvent.metaKey
  }));
}