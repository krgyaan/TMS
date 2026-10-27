"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isRefocusingOwner = isRefocusingOwner;
exports.refocusOwner = refocusOwner;
let refocusing = false;

/**
 * Hands focus back to the input that owns it while the user keeps interacting: the pointer entered
 * its popup, or the list replays a key that landed on it. Focus handlers that run during the call
 * see `isRefocusingOwner()` and treat the move as a continuation rather than the user leaving.
 * A module-level flag suffices because `focus()` dispatches its events synchronously, and it also
 * reaches the handlers of enclosing popups that a nested input's focus event bubbles through.
 */
function refocusOwner(owner) {
  refocusing = true;
  try {
    owner.focus({
      preventScroll: true
    });
  } finally {
    refocusing = false;
  }
}
function isRefocusingOwner() {
  return refocusing;
}