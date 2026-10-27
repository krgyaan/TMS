"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MenuSubmenuRoot = MenuSubmenuRoot;
Object.defineProperty(exports, "useMenuSubmenuRootContext", {
  enumerable: true,
  get: function () {
    return _MenuSubmenuRootContext.useMenuSubmenuRootContext;
  }
});
var React = _interopRequireWildcard(require("react"));
var _MenuRoot = require("../root/MenuRoot");
var _MenuRootContext = require("../root/MenuRootContext");
var _MenuSubmenuRootContext = require("./MenuSubmenuRootContext");
var _MenuFilterProviderContext = require("../filter-provider/MenuFilterProviderContext");
var _jsxRuntime = require("react/jsx-runtime");
const EMPTY_SUBMENU_ROOT_CONTEXT = {};

/**
 * Groups all parts of a submenu.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
function MenuSubmenuRoot(props) {
  // Throws when the submenu isn't inside a menu.
  (0, _MenuRootContext.useMenuRootContext)();
  const filterProvider = React.useContext(_MenuFilterProviderContext.MenuFilterProviderContext);
  if (filterProvider !== null) {
    const FilterSubmenuRoot = filterProvider.SubmenuRoot;
    return /*#__PURE__*/(0, _jsxRuntime.jsx)(_MenuFilterProviderContext.MenuFilterProviderContext.Provider, {
      value: null,
      children: /*#__PURE__*/(0, _jsxRuntime.jsx)(FilterSubmenuRoot, {
        ...filterProvider.options,
        ...props
      })
    });
  }
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_MenuSubmenuRootContext.MenuSubmenuRootContext.Provider, {
    value: EMPTY_SUBMENU_ROOT_CONTEXT,
    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_MenuRoot.MenuRootInternal, {
      ...props,
      isSubmenu: true
    })
  });
}