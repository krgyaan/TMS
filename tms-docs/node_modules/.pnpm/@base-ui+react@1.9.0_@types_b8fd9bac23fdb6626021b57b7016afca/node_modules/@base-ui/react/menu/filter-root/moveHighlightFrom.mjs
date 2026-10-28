import { EMPTY_ARRAY } from '@base-ui/utils/empty';
import { getMaxListIndex, getMinListIndex, getNextListIndex } from "../../floating-ui-react/utils/composite.mjs";
import { isMainOrientationToEndKey } from "../../floating-ui-react/hooks/useListNavigation.mjs";
import { REASONS } from "../../internals/reasons.mjs";
/**
 * Moves a menu's highlight from `item` one step in the direction of a main-orientation arrow key,
 * with the same step as the menu's own list navigation, and returns the newly highlighted item.
 * A step that would leave a menu whose navigation escapes to its input keeps the highlight.
 */
export function moveHighlightFrom(store, item, event, options) {
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
  } = getNextListIndex(items, items.indexOf(item), {
    decrement: !isMainOrientationToEndKey(event.key, orientation, rtl),
    loopFocus,
    allowEscape,
    // Match the menu's list navigation: `aria-disabled` items stay reachable.
    disabledIndices: EMPTY_ARRAY,
    minIndex: getMinListIndex(listRef, EMPTY_ARRAY),
    maxIndex: getMaxListIndex(listRef, EMPTY_ARRAY)
  });
  const next = items[index];
  if (next) {
    store.setActiveIndex(index, REASONS.keyboard, event.nativeEvent);
    next.scrollIntoView?.({
      block: 'nearest',
      inline: 'nearest'
    });
  }
  return next ?? undefined;
}