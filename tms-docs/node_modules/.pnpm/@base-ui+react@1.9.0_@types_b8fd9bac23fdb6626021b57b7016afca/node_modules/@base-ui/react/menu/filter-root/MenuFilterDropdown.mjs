'use client';

import * as React from 'react';
import { useControlled } from '@base-ui/utils/useControlled';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import { useMenubarContext } from "../../menubar/MenubarContext.mjs";
import { isVirtualPointerEvent } from "../../floating-ui-react/utils/event.mjs";
import { FilterDropdownRoot } from "../../filter-dropdown/root/FilterDropdownRoot.mjs";
import { useFilterDropdownCloseQuery } from "../../filter-dropdown/root/useFilterDropdownCloseQuery.mjs";
import { useMenuRootContext } from "../root/MenuRootContext.mjs";
import { REASONS } from "../../internals/reasons.mjs";
import { MenuFilterImplContext } from "./MenuFilterContext.mjs";
import { MENU_FILTER_IMPL } from "./MenuFilterImpl.mjs";
import { useMenuFilterKeyDown } from "./useMenuFilterKeyDown.mjs";
import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Reads the menu store, which is only available below the menu root, and hands the filter
 * engine the list the menu navigates and the command that moves its highlight. The query is
 * owned here; the menu root keeps sole ownership of the open state.
 */
export function MenuFilterDropdown(props) {
  const {
    value: valueProp,
    defaultValue = '',
    onValueChange,
    ...dropdownProps
  } = props;
  const {
    store
  } = useMenuRootContext();
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const keyboardOpen = store.useState('keyboardOpen');
  const activeTriggerId = store.useState('activeTriggerId');
  const activeTriggerElement = store.useState('activeTriggerElement');
  const disabled = store.useState('disabled');
  const [value, setValue] = useControlled({
    controlled: valueProp,
    default: defaultValue,
    name: 'MenuFilterProvider',
    state: 'value'
  });
  const handleValueChange = useStableCallback((nextValue, eventDetails) => {
    onValueChange?.(nextValue, eventDetails);
    if (!eventDetails.isCanceled) {
      setValue(nextValue);
    }
  });
  const getActiveIndex = useStableCallback(() => store.state.activeIndex);
  const setActiveIndex = useStableCallback(index => {
    store.setActiveIndex(index, REASONS.none);
  });
  const query = useFilterDropdownCloseQuery({
    open,
    mounted,
    value,
    onValueChange: handleValueChange
  });
  const filterTriggerProps = useFilterTriggerProps(value !== '');
  // Seeded before the triggers below render, like the root's inactive trigger props, so the sync
  // effect doesn't render every trigger twice in the first commit.
  useRefWithInit(() => {
    store.set('filterTriggerProps', filterTriggerProps);
    return null;
  });
  store.useSyncedValue('filterTriggerProps', filterTriggerProps);

  // Only `setOpen` records a keyboard open, so a controlled close that bypasses it must not leave
  // the next programmatic open looking like one.
  useIsoLayoutEffect(() => {
    if (!open) {
      store.set('keyboardOpen', false);
    }
  }, [open, store]);

  // Trust the rendered element's id once it exists: an explicitly empty id must not fall back to a
  // registered id that no element carries.
  const triggerId = activeTriggerElement ? activeTriggerElement.id || null : activeTriggerId;
  return /*#__PURE__*/_jsx(MenuFilterImplContext.Provider, {
    value: MENU_FILTER_IMPL,
    children: /*#__PURE__*/_jsx(FilterDropdownRoot, {
      ...dropdownProps,
      open: open,
      openedByKeyboard: keyboardOpen,
      disabled: disabled,
      value: value,
      query: query,
      onValueChange: handleValueChange,
      triggerId: triggerId,
      listRef: store.context.itemDomElements,
      getActiveIndex: getActiveIndex,
      setActiveIndex: setActiveIndex,
      focusOwnerRef: store.context.virtualFocusRef
    })
  });
}

/**
 * The props a filterable menu adds to its triggers: dialog semantics, screen reader press
 * tracking, and a relay of list navigation typed on the trigger to the input, since the input
 * holds real focus while the popup is open.
 */
function useFilterTriggerProps(hasValue) {
  const {
    store
  } = useMenuRootContext();
  const isInMenubar = useMenubarContext(true) != null;
  const handleInputKeyDown = useMenuFilterKeyDown(hasValue);
  return React.useMemo(() => ({
    'aria-haspopup': 'dialog',
    onPointerDown(event) {
      store.context.virtualPress = isVirtualPointerEvent(event.nativeEvent);
    },
    onKeyDown(event) {
      const focusOwner = store.context.virtualFocusRef?.current;
      if (!store.select('open') || !focusOwner || isInMenubar) {
        return;
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        focusOwner.focus({
          preventScroll: true
        });
        handleInputKeyDown(event);
        event.preventDefault();
        event.preventBaseUIHandler();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        // Cross-axis keys drive submenu open/close, which the trigger must not relay.
        event.preventBaseUIHandler();
      } else if (isTypeaheadKey(event)) {
        focusOwner.focus({
          preventScroll: true
        });
      }
    }
  }), [store, isInMenubar, handleInputKeyDown]);
}
function isTypeaheadKey(event) {
  return event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey;
}