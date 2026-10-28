"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.activeElement = activeElement;
exports.closest = closest;
exports.contains = contains;
exports.getTarget = getTarget;
var _dom = require("@floating-ui/utils/dom");
function activeElement(doc) {
  let element = doc.activeElement;
  while (element?.shadowRoot?.activeElement != null) {
    element = element.shadowRoot.activeElement;
  }
  return element;
}
function contains(parent, child) {
  if (!parent || !child) {
    return false;
  }
  const rootNode = child.getRootNode?.();

  // First, attempt with the faster native method.
  if (parent.contains(child)) {
    return true;
  }

  // Then fall back to traversing out of shadow roots when needed.
  if (rootNode && (0, _dom.isShadowRoot)(rootNode)) {
    let next = child;
    while (next) {
      if (parent === next) {
        return true;
      }
      next = next.parentNode || next.host;
    }
  }
  return false;
}

/**
 * Finds the closest matching element in the composed tree, crossing slots and shadow roots.
 * `:scope` is not supported.
 */

function closest(node, selector) {
  let current = node;
  while (current) {
    if ((0, _dom.isElement)(current) && current.matches(selector)) {
      return current;
    }
    current = current.assignedSlot ?? current.parentNode ?? ((0, _dom.isShadowRoot)(current) ? current.host : null);
  }
  return null;
}
function getTarget(event) {
  if ('composedPath' in event) {
    // The composed path is empty once the event is no longer being dispatched,
    // so fall back to `target` for handlers running after dispatch completes.
    return event.composedPath()[0] ?? event.target;
  }

  // TS assumes `composedPath()` always exists, but older browsers without
  // shadow DOM support still fall back to `target`.
  return event.target;
}