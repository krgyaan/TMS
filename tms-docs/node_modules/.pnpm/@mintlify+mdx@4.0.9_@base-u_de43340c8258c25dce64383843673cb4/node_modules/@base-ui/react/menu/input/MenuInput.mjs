'use client';

import * as React from 'react';
import { ownerDocument } from '@base-ui/utils/owner';
import { useMergedRefs } from '@base-ui/utils/useMergedRefs';
import { FilterDropdownInput } from "../../filter-dropdown/input/FilterDropdownInput.mjs";
import { useFilterDropdownValueContext } from "../../filter-dropdown/root/FilterDropdownRootContext.mjs";
import { mergeProps } from "../../merge-props/index.mjs";
import { activeElement } from "../../floating-ui-react/utils.mjs";
import { useMenuFilterKeyDown } from "../filter-root/useMenuFilterKeyDown.mjs";
import { useMenuFilterPart } from "../filter-root/MenuFilterContext.mjs";
import { useMenuRootContext } from "../root/MenuRootContext.mjs";

/**
 * A search field that filters the menu items.
 * Requires the menu to be wrapped in `Menu.FilterProvider`.
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
import { jsx as _jsx } from "react/jsx-runtime";
export const MenuInput = /*#__PURE__*/React.forwardRef(function MenuInput(componentProps, forwardedRef) {
  useMenuFilterPart('Input');
  const {
    store
  } = useMenuRootContext();
  const value = useFilterDropdownValueContext();
  const {
    onKeyDown,
    ...navigationProps
  } = store.useState('inputProps');
  const activeItemId = store.useState('highlightedItemId');
  const handleKeyDown = useMenuFilterKeyDown(value !== '');
  const handleInputRef = React.useCallback(input => {
    // Ref changes cover input removal without blur and restore focus after Strict Mode replay.
    store.set('inputFocused', input !== null && activeElement(ownerDocument(input)) === input);
  }, [store]);
  const mergedRefs = useMergedRefs(forwardedRef, handleInputRef);
  const inputProps = mergeProps({
    onKeyDown: handleKeyDown,
    onFocus() {
      store.set('inputFocused', true);
    },
    onBlur() {
      store.set('inputFocused', false);
    }
  }, componentProps);
  return /*#__PURE__*/_jsx(FilterDropdownInput, {
    ...inputProps,
    activeItemId: activeItemId,
    navigationProps: navigationProps,
    ref: mergedRefs
  });
});
if (process.env.NODE_ENV !== "production") MenuInput.displayName = "MenuInput";