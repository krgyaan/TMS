import { REASONS } from "../../internals/reasons.mjs";

/**
 * Keyboard and assistive-technology activations produce `detail === 0` clicks; mouse-gesture
 * clicks (including the synthesized drag-release click from `useMenuItemCommonProps`) carry
 * `detail >= 1`.
 */
export function isKeyboardClick(reason, event) {
  return (reason === REASONS.triggerPress || reason === REASONS.itemPress) && event?.detail === 0;
}

/**
 * Whether a menu opens from the keyboard, which lands focus in the popup. Arrow keys report
 * `list-navigation`; Enter and Space dispatch a click carrying no pointer detail.
 */
export function isKeyboardOpen(reason, event) {
  return reason === REASONS.listNavigation || isKeyboardClick(reason, event);
}