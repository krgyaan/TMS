"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isKeyboardClick = isKeyboardClick;
exports.isKeyboardOpen = isKeyboardOpen;
var _reasons = require("../../internals/reasons");
/**
 * Keyboard and assistive-technology activations produce `detail === 0` clicks; mouse-gesture
 * clicks (including the synthesized drag-release click from `useMenuItemCommonProps`) carry
 * `detail >= 1`.
 */
function isKeyboardClick(reason, event) {
  return (reason === _reasons.REASONS.triggerPress || reason === _reasons.REASONS.itemPress) && event?.detail === 0;
}

/**
 * Whether a menu opens from the keyboard, which lands focus in the popup. Arrow keys report
 * `list-navigation`; Enter and Space dispatch a click carrying no pointer detail.
 */
function isKeyboardOpen(reason, event) {
  return reason === _reasons.REASONS.listNavigation || isKeyboardClick(reason, event);
}