"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MenuFilterProvider = MenuFilterProvider;
var React = _interopRequireWildcard(require("react"));
var _MenuFilterRoot = require("../filter-root/MenuFilterRoot");
var _MenuFilterSubmenuRoot = require("../filter-submenu-root/MenuFilterSubmenuRoot");
var _MenuFilterProviderContext = require("./MenuFilterProviderContext");
var _jsxRuntime = require("react/jsx-runtime");
/**
 * Enables filtering for the menu or submenu it wraps. Add `Menu.Input` to the popup and place
 * its items in `Menu.List`.
 * Wrap each searchable submenu in its own provider.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
function MenuFilterProvider(props) {
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
    Root: _MenuFilterRoot.MenuFilterRoot,
    SubmenuRoot: _MenuFilterSubmenuRoot.MenuFilterSubmenuRoot,
    options: {
      filter,
      value,
      defaultValue,
      onValueChange,
      autoHighlight,
      locale
    }
  }), [filter, value, defaultValue, onValueChange, autoHighlight, locale]);
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_MenuFilterProviderContext.MenuFilterProviderContext.Provider, {
    value: contextValue,
    children: children
  });
}