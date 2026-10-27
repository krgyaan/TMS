'use client';

import * as React from 'react';
import { useComboboxItemContext } from "../item/ComboboxItemContext.mjs";
import { ItemIndicator } from "../../utils/ItemIndicator.mjs";

/**
 * Indicates whether the item is selected.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
import { jsx as _jsx } from "react/jsx-runtime";
export const ComboboxItemIndicator = /*#__PURE__*/React.forwardRef(function ComboboxItemIndicator(componentProps, forwardedRef) {
  const {
    selected
  } = useComboboxItemContext();
  const shouldRender = componentProps.keepMounted || selected;
  if (!shouldRender) {
    return null;
  }
  return /*#__PURE__*/_jsx(ItemIndicator, {
    ...componentProps,
    selected: selected,
    ref: forwardedRef
  });
});
if (process.env.NODE_ENV !== "production") ComboboxItemIndicator.displayName = "ComboboxItemIndicator";