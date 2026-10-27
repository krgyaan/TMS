"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.selectors = exports.FilterDropdownStore = exports.DETACHED_OWNER = void 0;
var _store = require("@base-ui/utils/store");
var _empty = require("@base-ui/utils/empty");
const selectors = exports.selectors = {
  // A null `visibleItemIds` means no query, so fall back to whether anything registered.
  isEmpty: state => state.visibleItemIds === null ? state.registeredItemCount === 0 : state.visibleItemIds.size === 0,
  isItemVisible: (state, id) => state.visibleItemIds === null || state.visibleItemIds.has(id)
};
class FilterDropdownStore extends _store.ReactStore {
  constructor() {
    super({
      visibleItemIds: null,
      registeredItemCount: 0
    }, _empty.EMPTY_OBJECT, selectors);
  }
}

/**
 * Stand-in for an item whose owning dropdown is absent, such as a filterable submenu's trigger
 * inside a plain parent menu. Nothing registers and every item stays visible.
 */
exports.FilterDropdownStore = FilterDropdownStore;
const DETACHED_OWNER = exports.DETACHED_OWNER = {
  registerItem: () => _empty.NOOP,
  store: new FilterDropdownStore()
};