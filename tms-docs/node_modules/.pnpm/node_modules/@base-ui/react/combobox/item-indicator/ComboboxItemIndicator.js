"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ComboboxItemIndicator = void 0;
var React = _interopRequireWildcard(require("react"));
var _ComboboxItemContext = require("../item/ComboboxItemContext");
var _ItemIndicator = require("../../utils/ItemIndicator");
var _jsxRuntime = require("react/jsx-runtime");
/**
 * Indicates whether the item is selected.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */const ComboboxItemIndicator = exports.ComboboxItemIndicator = /*#__PURE__*/React.forwardRef(function ComboboxItemIndicator(componentProps, forwardedRef) {
  const {
    selected
  } = (0, _ComboboxItemContext.useComboboxItemContext)();
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
if (process.env.NODE_ENV !== "production") ComboboxItemIndicator.displayName = "ComboboxItemIndicator";