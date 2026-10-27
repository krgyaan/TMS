'use client';

import * as React from 'react';
import { useStore } from '@base-ui/utils/store';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import { useFilterDropdownItemContext } from "../root/FilterDropdownRootContext.mjs";
import { useFilterDropdownGroupContext } from "./FilterDropdownGroupContext.mjs";
import { useItemRegistry } from "../../internals/useItemRegistry.mjs";
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
export function useFilterDropdownGroup() {
  const {
    store
  } = useFilterDropdownItemContext();
  const parentContext = useFilterDropdownGroupContext();
  const {
    items,
    registerItem
  } = useItemRegistry();
  const hidden = useStore(store, isGroupHidden, items);

  // A nested container collects its own items, so the enclosing one only ever sees this
  // registration. Report visibility upward or a group of groups would look empty.
  const groupId = useRefWithInit(() => Symbol('filter-dropdown-group')).current;
  const registerInParent = parentContext?.registerItem;
  useIsoLayoutEffect(() => registerInParent?.(groupId, !hidden), [registerInParent, groupId, hidden]);
  const context = React.useMemo(() => ({
    registerItem
  }), [registerItem]);
  return {
    hidden,
    context
  };
}