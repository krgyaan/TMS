"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useFilterDropdownCloseQuery = useFilterDropdownCloseQuery;
var React = _interopRequireWildcard(require("react"));
var _useIsoLayoutEffect = require("@base-ui/utils/useIsoLayoutEffect");
var _createBaseUIEventDetails = require("../../internals/createBaseUIEventDetails");
var _reasons = require("../../internals/reasons");
/**
 * Clears the committed value when a filter popup closes while retaining the displayed query and
 * filtered items until the exit transition completes.
 */
function useFilterDropdownCloseQuery(parameters) {
  const {
    open,
    mounted,
    value,
    onValueChange
  } = parameters;
  const [closeQuery, setCloseQuery] = React.useState(null);
  const previousOpenRef = React.useRef(open);
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    const wasOpen = previousOpenRef.current;
    previousOpenRef.current = open;
    if (wasOpen && !open && value !== '') {
      setCloseQuery(value);
      onValueChange('', (0, _createBaseUIEventDetails.createChangeEventDetails)(_reasons.REASONS.popupClose));
    } else if ((open || !mounted) && closeQuery !== null) {
      setCloseQuery(null);
    }
  }, [open, mounted, value, closeQuery, onValueChange]);
  return !open && closeQuery !== null ? closeQuery : value;
}