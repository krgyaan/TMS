"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MenuFilterRoot = MenuFilterRoot;
var React = _interopRequireWildcard(require("react"));
var _MenuRoot = require("../root/MenuRoot");
var _MenuFilterDropdown = require("./MenuFilterDropdown");
var _useMenuFilterRoot = require("./useMenuFilterRoot");
var _jsxRuntime = require("react/jsx-runtime");
/**
 * The filterable implementation of `Menu.Root`, rendered in its place when the root sits inside
 * `Menu.FilterProvider`. Reached through the provider only, so a plain menu never bundles it.
 *
 * @internal
 */function MenuFilterRoot(props) {
  const {
    children,
    rootProps,
    dropdownProps
  } = (0, _useMenuFilterRoot.useMenuFilterRoot)(props);
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_MenuRoot.MenuRootInternal, {
    ...rootProps,
    children: payload => /*#__PURE__*/(0, _jsxRuntime.jsx)(_MenuFilterDropdown.MenuFilterDropdown, {
      ...dropdownProps,
      children: typeof children === 'function' ? children(payload) : children
    })
  });
}