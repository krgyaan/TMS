'use client';

import * as React from 'react';
import { MenuFilterRoot } from "../filter-root/MenuFilterRoot.mjs";
import { MenuFilterSubmenuRoot } from "../filter-submenu-root/MenuFilterSubmenuRoot.mjs";
import { MenuFilterProviderContext } from "./MenuFilterProviderContext.mjs";
import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Enables filtering for the menu or submenu it wraps. Add `Menu.Input` to the popup and place
 * its items in `Menu.List`.
 * Wrap each searchable submenu in its own provider.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuFilterProvider(props) {
  const {
    children,
    filter,
    value,
    defaultValue,
    onValueChange,
    autoHighlight,
    locale
  } = props;
  const contextValue = React.useMemo(() => ({
    Root: MenuFilterRoot,
    SubmenuRoot: MenuFilterSubmenuRoot,
    options: {
      filter,
      value,
      defaultValue,
      onValueChange,
      autoHighlight,
      locale
    }
  }), [filter, value, defaultValue, onValueChange, autoHighlight, locale]);
  return /*#__PURE__*/_jsx(MenuFilterProviderContext.Provider, {
    value: contextValue,
    children: children
  });
}