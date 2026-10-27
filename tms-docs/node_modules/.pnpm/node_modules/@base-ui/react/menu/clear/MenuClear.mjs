'use client';

import * as React from 'react';
import { FilterDropdownClear } from "../../filter-dropdown/clear/FilterDropdownClear.mjs";
import { useMenuFilterPart } from "../filter-root/MenuFilterContext.mjs";

/**
 * A button that clears the input text.
 * Requires the menu to be wrapped in `Menu.FilterProvider`.
 * Renders a `<button>` element when the input has text.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
import { jsx as _jsx } from "react/jsx-runtime";
export const MenuClear = /*#__PURE__*/React.forwardRef(function MenuClear(props, forwardedRef) {
  useMenuFilterPart('Clear');
  return /*#__PURE__*/_jsx(FilterDropdownClear, {
    ...props,
    ref: forwardedRef
  });
});
if (process.env.NODE_ENV !== "production") MenuClear.displayName = "MenuClear";