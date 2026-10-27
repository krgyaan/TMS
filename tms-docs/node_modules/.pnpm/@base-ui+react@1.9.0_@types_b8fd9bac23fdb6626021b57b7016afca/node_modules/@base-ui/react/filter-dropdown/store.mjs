import { ReactStore } from '@base-ui/utils/store';
import { EMPTY_OBJECT, NOOP } from '@base-ui/utils/empty';
export const selectors = {
  // A null `visibleItemIds` means no query, so fall back to whether anything registered.
  isEmpty: state => state.visibleItemIds === null ? state.registeredItemCount === 0 : state.visibleItemIds.size === 0,
  isItemVisible: (state, id) => state.visibleItemIds === null || state.visibleItemIds.has(id)
};
export class FilterDropdownStore extends ReactStore {
  constructor() {
    super({
      visibleItemIds: null,
      registeredItemCount: 0
    }, EMPTY_OBJECT, selectors);
  }
}

/**
 * Stand-in for an item whose owning dropdown is absent, such as a filterable submenu's trigger
 * inside a plain parent menu. Nothing registers and every item stays visible.
 */
export const DETACHED_OWNER = {
  registerItem: () => NOOP,
  store: new FilterDropdownStore()
};