'use client';

import * as React from 'react';
import { useStore } from '@base-ui/utils/store';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { useRenderElement } from "../../internals/useRenderElement.mjs";
import { useFilterDropdownItemContext } from "../root/FilterDropdownRootContext.mjs";
import { selectors } from "../store.mjs";
import { useInitialLiveRegionTextMutation } from "../../internals/useInitialLiveRegionTextMutation.mjs";

/**
 * @internal
 */
export const FilterDropdownEmpty = /*#__PURE__*/React.forwardRef(function FilterDropdownEmpty(componentProps, forwardedRef) {
  const {
    render,
    className,
    style,
    ...elementProps
  } = componentProps;
  const {
    store
  } = useFilterDropdownItemContext();
  const isEmpty = useStore(store, selectors.isEmpty);

  // Items mounting in the same commit register in layout effects, after this first render, and
  // don't register on the server at all. Deciding once they have keeps the children from
  // mounting for a frame on every open, and the message out of server markup.
  const [ready, setReady] = React.useState(false);
  useIsoLayoutEffect(() => {
    setReady(true);
  }, []);
  const visible = ready && isEmpty;
  const emptyRef = useInitialLiveRegionTextMutation(visible);
  return useRenderElement('div', componentProps, {
    enabled: visible,
    ref: [forwardedRef, emptyRef],
    props: [{
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': true
    }, elementProps]
  });
});
if (process.env.NODE_ENV !== "production") FilterDropdownEmpty.displayName = "FilterDropdownEmpty";