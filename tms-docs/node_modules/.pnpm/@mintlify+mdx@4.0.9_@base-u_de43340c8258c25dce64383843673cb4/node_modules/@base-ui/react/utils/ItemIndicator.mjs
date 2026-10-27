'use client';

import * as React from 'react';
import { useTransitionStatus } from "../internals/useTransitionStatus.mjs";
import { useOpenChangeComplete } from "../internals/useOpenChangeComplete.mjs";
import { useRenderElement } from "../internals/useRenderElement.mjs";
import { transitionStatusMapping } from "../internals/stateAttributesMapping.mjs";

// The public wrappers mount this component only when selected or kept mounted, avoiding the
// hook costs for unselected items. Pass selection as a prop so memoization observes changes.
export const ItemIndicator = /*#__PURE__*/React.memo(/*#__PURE__*/React.forwardRef(function ItemIndicator(componentProps, forwardedRef) {
  const {
    render,
    className,
    style,
    keepMounted,
    selected,
    ...elementProps
  } = componentProps;
  const indicatorRef = React.useRef(null);
  const {
    transitionStatus,
    setMounted
  } = useTransitionStatus(selected);
  const state = {
    selected,
    transitionStatus
  };
  const element = useRenderElement('span', componentProps, {
    ref: [forwardedRef, indicatorRef],
    state,
    props: [{
      'aria-hidden': true,
      children: '✔️'
    }, elementProps],
    stateAttributesMapping: transitionStatusMapping
  });
  useOpenChangeComplete({
    batch: true,
    enabled: !selected,
    open: selected,
    ref: indicatorRef,
    onComplete() {
      if (!selected) {
        setMounted(false);
      }
    }
  });
  return element;
}));
if (process.env.NODE_ENV !== "production") ItemIndicator.displayName = "ItemIndicator";