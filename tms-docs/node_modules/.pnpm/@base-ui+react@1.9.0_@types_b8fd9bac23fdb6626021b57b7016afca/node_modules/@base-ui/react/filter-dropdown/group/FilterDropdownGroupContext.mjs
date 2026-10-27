'use client';

import * as React from 'react';
export const FilterDropdownGroupContext = /*#__PURE__*/React.createContext(null);
if (process.env.NODE_ENV !== "production") FilterDropdownGroupContext.displayName = "FilterDropdownGroupContext";
export function useFilterDropdownGroupContext() {
  return React.useContext(FilterDropdownGroupContext);
}