'use client';

import * as React from 'react';
import { useSelectItemContext } from "../item/SelectItemContext.mjs";
import { ItemIndicator } from "../../utils/ItemIndicator.mjs";

/**
 * Indicates whether the select item is selected.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
import { jsx as _jsx } from "react/jsx-runtime";
export const SelectItemIndicator = /*#__PURE__*/React.forwardRef(function SelectItemIndicator(componentProps, forwardedRef) {
  const {
    selected
  } = useSelectItemContext();
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
if (process.env.NODE_ENV !== "production") SelectItemIndicator.displayName = "SelectItemIndicator";