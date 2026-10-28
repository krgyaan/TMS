'use client';

import _formatErrorMessage from "@base-ui/utils/formatErrorMessage";
import * as React from 'react';
function throwMissingFilterRoot() {
  throw new Error(process.env.NODE_ENV !== "production" ? 'Base UI: Filter parts are missing their filter context and cannot access the query or items. ' + 'Wrap the component root in its filter provider.' : _formatErrorMessage(103));
}
export const FilterDropdownItemContext = /*#__PURE__*/React.createContext(null);
if (process.env.NODE_ENV !== "production") FilterDropdownItemContext.displayName = "FilterDropdownItemContext";
export function useFilterDropdownItemContext(optional = false) {
  const context = React.useContext(FilterDropdownItemContext);
  if (context === null && !optional) {
    throwMissingFilterRoot();
  }
  return context;
}
export const FilterDropdownRootContext = /*#__PURE__*/React.createContext(null);
if (process.env.NODE_ENV !== "production") FilterDropdownRootContext.displayName = "FilterDropdownRootContext";
export function useFilterDropdownRootContext(optional = false) {
  const context = React.useContext(FilterDropdownRootContext);
  if (context === null && !optional) {
    throwMissingFilterRoot();
  }
  return context;
}

/**
 * Finds the dropdown that owns the given item list, walking out through nested roots.
 */
export function useFilterContextForList(listRef) {
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
export const FilterDropdownValueContext = /*#__PURE__*/React.createContext('');
if (process.env.NODE_ENV !== "production") FilterDropdownValueContext.displayName = "FilterDropdownValueContext";
export function useFilterDropdownValueContext() {
  return React.useContext(FilterDropdownValueContext);
}
export let FilterDropdownRoot;