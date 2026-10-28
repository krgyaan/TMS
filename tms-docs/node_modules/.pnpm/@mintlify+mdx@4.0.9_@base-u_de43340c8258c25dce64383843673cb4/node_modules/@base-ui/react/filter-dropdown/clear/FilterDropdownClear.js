"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FilterDropdownClear = void 0;
var React = _interopRequireWildcard(require("react"));
var _useButton = require("../../internals/use-button");
var _useRenderElement = require("../../internals/useRenderElement");
var _createBaseUIEventDetails = require("../../internals/createBaseUIEventDetails");
var _reasons = require("../../internals/reasons");
var _FilterDropdownRootContext = require("../root/FilterDropdownRootContext");
/**
 * @internal
 */
const FilterDropdownClear = exports.FilterDropdownClear = /*#__PURE__*/React.forwardRef(function FilterDropdownClear(componentProps, forwardedRef) {
  const {
    render,
    className,
    style,
    disabled: disabledProp = false,
    nativeButton = true,
    ...elementProps
  } = componentProps;
  const context = (0, _FilterDropdownRootContext.useFilterDropdownRootContext)();
  const value = (0, _FilterDropdownRootContext.useFilterDropdownValueContext)();
  const disabled = context.disabled || disabledProp;
  const visible = value !== '';
  const {
    buttonRef,
    getButtonProps
  } = (0, _useButton.useButton)({
    disabled,
    native: nativeButton
  });

  // `visible` is deliberately absent from the state: the component renders nothing when it is
  // false, so a `data-visible` attribute would be present on every rendered instance.
  const state = {
    disabled
  };
  return (0, _useRenderElement.useRenderElement)('button', componentProps, {
    enabled: visible,
    state,
    ref: [forwardedRef, buttonRef],
    props: [{
      tabIndex: -1,
      'aria-hidden': true,
      onMouseDown(event) {
        // Avoid stealing focus from the input on pointer interaction.
        event.preventDefault();
      },
      onClick(event) {
        const eventDetails = (0, _createBaseUIEventDetails.createChangeEventDetails)(_reasons.REASONS.clearPress, event.nativeEvent);
        context.onValueChange('', eventDetails);
        context.focusOwnerRef.current?.focus({
          preventScroll: true
        });
      }
    }, elementProps, getButtonProps]
  });
});
if (process.env.NODE_ENV !== "production") FilterDropdownClear.displayName = "FilterDropdownClear";