"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FilterDropdownGroupContext = void 0;
exports.useFilterDropdownGroupContext = useFilterDropdownGroupContext;
var React = _interopRequireWildcard(require("react"));
const FilterDropdownGroupContext = exports.FilterDropdownGroupContext = /*#__PURE__*/React.createContext(null);
if (process.env.NODE_ENV !== "production") FilterDropdownGroupContext.displayName = "FilterDropdownGroupContext";
function useFilterDropdownGroupContext() {
  return React.useContext(FilterDropdownGroupContext);
}