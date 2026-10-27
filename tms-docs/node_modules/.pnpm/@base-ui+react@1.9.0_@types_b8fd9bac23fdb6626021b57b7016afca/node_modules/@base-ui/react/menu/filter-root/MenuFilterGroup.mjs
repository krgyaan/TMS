'use client';

import * as React from 'react';
import { useFilterDropdownGroup } from "../../filter-dropdown/group/useFilterDropdownGroup.mjs";
import { FilterDropdownGroupContext } from "../../filter-dropdown/group/FilterDropdownGroupContext.mjs";
import { MenuGroupPlain } from "../group/MenuGroup.mjs";
import { MenuRadioGroupPlain } from "../radio-group/MenuRadioGroup.mjs";
import { jsx as _jsx } from "react/jsx-runtime";
/**
 * `Menu.Group` in a filterable menu: hidden, label included, once the query filters out all of
 * its items.
 *
 * @internal
 */
export const MenuFilterGroup = /*#__PURE__*/React.forwardRef(function MenuFilterGroup(props, forwardedRef) {
  const {
    hidden,
    context
  } = useFilterDropdownGroup();
  return /*#__PURE__*/_jsx(FilterDropdownGroupContext.Provider, {
    value: context,
    children: /*#__PURE__*/_jsx(MenuGroupPlain, {
      ...props,
      hidden: hidden || props.hidden || undefined,
      ref: forwardedRef
    })
  });
});

/**
 * `Menu.RadioGroup` in a filterable menu, hidden like `MenuFilterGroup`.
 *
 * @internal
 */
if (process.env.NODE_ENV !== "production") MenuFilterGroup.displayName = "MenuFilterGroup";
export const MenuFilterRadioGroup = /*#__PURE__*/React.forwardRef(function MenuFilterRadioGroup(props, forwardedRef) {
  const {
    hidden,
    context
  } = useFilterDropdownGroup();
  return /*#__PURE__*/_jsx(FilterDropdownGroupContext.Provider, {
    value: context,
    children: /*#__PURE__*/_jsx(MenuRadioGroupPlain, {
      ...props,
      hidden: hidden || props.hidden || undefined,
      ref: forwardedRef
    })
  });
});
if (process.env.NODE_ENV !== "production") MenuFilterRadioGroup.displayName = "MenuFilterRadioGroup";