'use client';

import * as React from 'react';
import { MenuRootInternal } from "../root/MenuRoot.mjs";
import { useMenuRootContext } from "../root/MenuRootContext.mjs";
import { MenuSubmenuRootContext } from "./MenuSubmenuRootContext.mjs";
import { MenuFilterProviderContext } from "../filter-provider/MenuFilterProviderContext.mjs";
import { jsx as _jsx } from "react/jsx-runtime";
export { useMenuSubmenuRootContext } from "./MenuSubmenuRootContext.mjs";
const EMPTY_SUBMENU_ROOT_CONTEXT = {};

/**
 * Groups all parts of a submenu.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuSubmenuRoot(props) {
  // Throws when the submenu isn't inside a menu.
  useMenuRootContext();
  const filterProvider = React.useContext(MenuFilterProviderContext);
  if (filterProvider !== null) {
    const FilterSubmenuRoot = filterProvider.SubmenuRoot;
    return /*#__PURE__*/_jsx(MenuFilterProviderContext.Provider, {
      value: null,
      children: /*#__PURE__*/_jsx(FilterSubmenuRoot, {
        ...filterProvider.options,
        ...props
      })
    });
  }
  return /*#__PURE__*/_jsx(MenuSubmenuRootContext.Provider, {
    value: EMPTY_SUBMENU_ROOT_CONTEXT,
    children: /*#__PURE__*/_jsx(MenuRootInternal, {
      ...props,
      isSubmenu: true
    })
  });
}