"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useFilterDropdownGroup = useFilterDropdownGroup;
var React = _interopRequireWildcard(require("react"));
var _store = require("@base-ui/utils/store");
var _useIsoLayoutEffect = require("@base-ui/utils/useIsoLayoutEffect");
var _useRefWithInit = require("@base-ui/utils/useRefWithInit");
var _FilterDropdownRootContext = require("../root/FilterDropdownRootContext");
var _FilterDropdownGroupContext = require("./FilterDropdownGroupContext");
var _useItemRegistry = require("../../internals/useItemRegistry");
function isGroupHidden(state, items) {
  // A group with no members hasn't been filtered out, it hasn't registered yet.
  if (state.visibleItemIds === null || items.size === 0) {
    return false;
  }
  for (const [id, retained] of items) {
    if (retained || state.visibleItemIds.has(id)) {
      return false;
    }
  }
  return true;
}
/**
 * Tracks which items belong to a group and hides the group once none of them match.
 *
 * @internal
 */
function useFilterDropdownGroup() {
  const {
    store
  } = (0, _FilterDropdownRootContext.useFilterDropdownItemContext)();
  const parentContext = (0, _FilterDropdownGroupContext.useFilterDropdownGroupContext)();
  const {
    items,
    registerItem
  } = (0, _useItemRegistry.useItemRegistry)();
  const hidden = (0, _store.useStore)(store, isGroupHidden, items);

  // A nested container collects its own items, so the enclosing one only ever sees this
  // registration. Report visibility upward or a group of groups would look empty.
  const groupId = (0, _useRefWithInit.useRefWithInit)(() => Symbol('filter-dropdown-group')).current;
  const registerInParent = parentContext?.registerItem;
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => registerInParent?.(groupId, !hidden), [registerInParent, groupId, hidden]);
  const context = React.useMemo(() => ({
    registerItem
  }), [registerItem]);
  return {
    hidden,
    context
  };
}