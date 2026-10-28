'use client';

import * as React from 'react';
import { FilterDropdownEmpty } from "../../filter-dropdown/empty/FilterDropdownEmpty.mjs";
import { useMenuFilterPart } from "../filter-root/MenuFilterContext.mjs";

/**
 * A message shown when the menu has no matching items.
 * Requires the menu to be wrapped in `Menu.FilterProvider`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
import { jsx as _jsx } from "react/jsx-runtime";
export const MenuEmpty = /*#__PURE__*/React.forwardRef(function MenuEmpty(props, forwardedRef) {
  useMenuFilterPart('Empty');
  return /*#__PURE__*/_jsx(FilterDropdownEmpty, {
    ...props,
    ref: forwardedRef
  });
});
if (process.env.NODE_ENV !== "production") MenuEmpty.displayName = "MenuEmpty";