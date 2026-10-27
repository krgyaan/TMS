"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FilterDropdownValueContext = exports.FilterDropdownRootContext = exports.FilterDropdownRoot = exports.FilterDropdownItemContext = void 0;
exports.useFilterContextForList = useFilterContextForList;
exports.useFilterDropdownItemContext = useFilterDropdownItemContext;
exports.useFilterDropdownRootContext = useFilterDropdownRootContext;
exports.useFilterDropdownValueContext = useFilterDropdownValueContext;
var _formatErrorMessage2 = _interopRequireDefault(require("@base-ui/utils/formatErrorMessage"));
var React = _interopRequireWildcard(require("react"));
function throwMissingFilterRoot() {
  throw new Error(process.env.NODE_ENV !== "production" ? 'Base UI: Filter parts are missing their filter context and cannot access the query or items. ' + 'Wrap the component root in its filter provider.' : (0, _formatErrorMessage2.default)(103));
}
const FilterDropdownItemContext = exports.FilterDropdownItemContext = /*#__PURE__*/React.createContext(null);
if (process.env.NODE_ENV !== "production") FilterDropdownItemContext.displayName = "FilterDropdownItemContext";
function useFilterDropdownItemContext(optional = false) {
  const context = React.useContext(FilterDropdownItemContext);
  if (context === null && !optional) {
    throwMissingFilterRoot();
  }
  return context;
}
const FilterDropdownRootContext = exports.FilterDropdownRootContext = /*#__PURE__*/React.createContext(null);
if (process.env.NODE_ENV !== "production") FilterDropdownRootContext.displayName = "FilterDropdownRootContext";
function useFilterDropdownRootContext(optional = false) {
  const context = React.useContext(FilterDropdownRootContext);
  if (context === null && !optional) {
    throwMissingFilterRoot();
  }
  return context;
}

/**
 * Finds the dropdown that owns the given item list, walking out through nested roots.
 */
function useFilterContextForList(listRef) {
  let context = React.useContext(FilterDropdownItemContext);
  if (listRef === null) {
    return null;
  }
  while (context !== null && context.listRef !== listRef) {
    context = context.parent;
  }
  return context;
}

// `value` controls a native input and can't be placed in the store without breaking the caret
// position when the input is controlled.
// https://github.com/mui/base-ui/issues/2703
const FilterDropdownValueContext = exports.FilterDropdownValueContext = /*#__PURE__*/React.createContext('');
if (process.env.NODE_ENV !== "production") FilterDropdownValueContext.displayName = "FilterDropdownValueContext";
function useFilterDropdownValueContext() {
  return React.useContext(FilterDropdownValueContext);
}
let FilterDropdownRoot = exports.FilterDropdownRoot = void 0;