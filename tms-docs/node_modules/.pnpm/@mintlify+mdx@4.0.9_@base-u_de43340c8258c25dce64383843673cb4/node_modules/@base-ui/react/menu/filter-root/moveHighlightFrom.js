"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.moveHighlightFrom = moveHighlightFrom;
var _empty = require("@base-ui/utils/empty");
var _composite = require("../../floating-ui-react/utils/composite");
var _useListNavigation = require("../../floating-ui-react/hooks/useListNavigation");
var _reasons = require("../../internals/reasons");
/**
 * Moves a menu's highlight from `item` one step in the direction of a main-orientation arrow key,
 * with the same step as the menu's own list navigation, and returns the newly highlighted item.
 * A step that would leave a menu whose navigation escapes to its input keeps the highlight.
 */
function moveHighlightFrom(store, item, event, options) {
  const {
    orientation,
    rtl,
    loopFocus,
    allowEscape
  } = options;
  const listRef = store.context.itemDomElements;
  const items = listRef.current;
  const {
    index
  } = (0, _composite.getNextListIndex)(items, items.indexOf(item), {
    decrement: !(0, _useListNavigation.isMainOrientationToEndKey)(event.key, orientation, rtl),
    loopFocus,
    allowEscape,
    // Match the menu's list navigation: `aria-disabled` items stay reachable.
    disabledIndices: _empty.EMPTY_ARRAY,
    minIndex: (0, _composite.getMinListIndex)(listRef, _empty.EMPTY_ARRAY),
    maxIndex: (0, _composite.getMaxListIndex)(listRef, _empty.EMPTY_ARRAY)
  });
  const next = items[index];
  if (next) {
    store.setActiveIndex(index, _reasons.REASONS.keyboard, event.nativeEvent);
    next.scrollIntoView?.({
      block: 'nearest',
      inline: 'nearest'
    });
  }
  return next ?? undefined;
}