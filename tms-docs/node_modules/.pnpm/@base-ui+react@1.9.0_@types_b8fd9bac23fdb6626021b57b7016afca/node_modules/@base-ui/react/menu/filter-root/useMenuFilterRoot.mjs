'use client';

import * as React from 'react';
/** Splits a filterable root's props between the menu root and the filter below it. */
export function useMenuFilterRoot(props) {
  const {
    children,
    value,
    defaultValue,
    onValueChange,
    filter,
    autoHighlight = false,
    locale,
    ...otherProps
  } = props;
  const virtualFocusRef = React.useRef(null);
  return {
    children,
    rootProps: {
      ...otherProps,
      virtualFocus: true,
      virtualFocusRef,
      allowEscape: !autoHighlight,
      resetOnPointerLeave: autoHighlight !== 'always'
    },
    dropdownProps: {
      value,
      defaultValue,
      onValueChange,
      filter,
      autoHighlight,
      locale
    }
  };
}