"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MenuEmpty = void 0;
var React = _interopRequireWildcard(require("react"));
var _FilterDropdownEmpty = require("../../filter-dropdown/empty/FilterDropdownEmpty");
var _MenuFilterContext = require("../filter-root/MenuFilterContext");
var _jsxRuntime = require("react/jsx-runtime");
/**
 * A message shown when the menu has no matching items.
 * Requires the menu to be wrapped in `Menu.FilterProvider`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */const MenuEmpty = exports.MenuEmpty = /*#__PURE__*/React.forwardRef(function MenuEmpty(props, forwardedRef) {
  (0, _MenuFilterContext.useMenuFilterPart)('Empty');
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_FilterDropdownEmpty.FilterDropdownEmpty, {
    ...props,
    ref: forwardedRef
  });
});
if (process.env.NODE_ENV !== "production") MenuEmpty.displayName = "MenuEmpty";