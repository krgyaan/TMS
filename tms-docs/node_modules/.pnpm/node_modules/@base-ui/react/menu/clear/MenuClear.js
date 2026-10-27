"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MenuClear = void 0;
var React = _interopRequireWildcard(require("react"));
var _FilterDropdownClear = require("../../filter-dropdown/clear/FilterDropdownClear");
var _MenuFilterContext = require("../filter-root/MenuFilterContext");
var _jsxRuntime = require("react/jsx-runtime");
/**
 * A button that clears the input text.
 * Requires the menu to be wrapped in `Menu.FilterProvider`.
 * Renders a `<button>` element when the input has text.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */const MenuClear = exports.MenuClear = /*#__PURE__*/React.forwardRef(function MenuClear(props, forwardedRef) {
  (0, _MenuFilterContext.useMenuFilterPart)('Clear');
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_FilterDropdownClear.FilterDropdownClear, {
    ...props,
    ref: forwardedRef
  });
});
if (process.env.NODE_ENV !== "production") MenuClear.displayName = "MenuClear";