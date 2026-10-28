'use client';

import * as React from 'react';
import { MenuRootInternal } from "../root/MenuRoot.mjs";
import { MenuFilterDropdown } from "./MenuFilterDropdown.mjs";
import { useMenuFilterRoot } from "./useMenuFilterRoot.mjs";

/**
 * The filterable implementation of `Menu.Root`, rendered in its place when the root sits inside
 * `Menu.FilterProvider`. Reached through the provider only, so a plain menu never bundles it.
 *
 * @internal
 */
import { jsx as _jsx } from "react/jsx-runtime";
export function MenuFilterRoot(props) {
  const {
    children,
    rootProps,
    dropdownProps
  } = useMenuFilterRoot(props);
  return /*#__PURE__*/_jsx(MenuRootInternal, {
    ...rootProps,
    children: payload => /*#__PURE__*/_jsx(MenuFilterDropdown, {
      ...dropdownProps,
      children: typeof children === 'function' ? children(payload) : children
    })
  });
}