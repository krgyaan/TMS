"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SelectItemIndicator = void 0;
var React = _interopRequireWildcard(require("react"));
var _SelectItemContext = require("../item/SelectItemContext");
var _ItemIndicator = require("../../utils/ItemIndicator");
var _jsxRuntime = require("react/jsx-runtime");
/**
 * Indicates whether the select item is selected.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */const SelectItemIndicator = exports.SelectItemIndicator = /*#__PURE__*/React.forwardRef(function SelectItemIndicator(componentProps, forwardedRef) {
  const {
    selected
  } = (0, _SelectItemContext.useSelectItemContext)();
  const shouldRender = componentProps.keepMounted || selected;
  if (!shouldRender) {
    return null;
  }
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_ItemIndicator.ItemIndicator, {
    ...componentProps,
    selected: selected,
    ref: forwardedRef
  });
});
if (process.env.NODE_ENV !== "production") SelectItemIndicator.displayName = "SelectItemIndicator";