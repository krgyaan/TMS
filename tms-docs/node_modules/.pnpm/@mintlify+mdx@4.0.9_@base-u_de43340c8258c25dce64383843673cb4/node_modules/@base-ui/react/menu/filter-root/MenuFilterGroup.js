"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MenuFilterRadioGroup = exports.MenuFilterGroup = void 0;
var React = _interopRequireWildcard(require("react"));
var _useFilterDropdownGroup = require("../../filter-dropdown/group/useFilterDropdownGroup");
var _FilterDropdownGroupContext = require("../../filter-dropdown/group/FilterDropdownGroupContext");
var _MenuGroup = require("../group/MenuGroup");
var _MenuRadioGroup = require("../radio-group/MenuRadioGroup");
var _jsxRuntime = require("react/jsx-runtime");
/**
 * `Menu.Group` in a filterable menu: hidden, label included, once the query filters out all of
 * its items.
 *
 * @internal
 */
const MenuFilterGroup = exports.MenuFilterGroup = /*#__PURE__*/React.forwardRef(function MenuFilterGroup(props, forwardedRef) {
  const {
    hidden,
    context
  } = (0, _useFilterDropdownGroup.useFilterDropdownGroup)();
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_FilterDropdownGroupContext.FilterDropdownGroupContext.Provider, {
    value: context,
    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_MenuGroup.MenuGroupPlain, {
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
const MenuFilterRadioGroup = exports.MenuFilterRadioGroup = /*#__PURE__*/React.forwardRef(function MenuFilterRadioGroup(props, forwardedRef) {
  const {
    hidden,
    context
  } = (0, _useFilterDropdownGroup.useFilterDropdownGroup)();
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_FilterDropdownGroupContext.FilterDropdownGroupContext.Provider, {
    value: context,
    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_MenuRadioGroup.MenuRadioGroupPlain, {
      ...props,
      hidden: hidden || props.hidden || undefined,
      ref: forwardedRef
    })
  });
});
if (process.env.NODE_ENV !== "production") MenuFilterRadioGroup.displayName = "MenuFilterRadioGroup";