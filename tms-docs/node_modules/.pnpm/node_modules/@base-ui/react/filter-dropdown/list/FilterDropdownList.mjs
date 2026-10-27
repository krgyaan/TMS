'use client';

import * as React from 'react';
import { useRenderElement } from "../../internals/useRenderElement.mjs";
import { useFilterDropdownRootContext } from "../root/FilterDropdownRootContext.mjs";
import { FilterDropdownGroupContext } from "../group/FilterDropdownGroupContext.mjs";
import { useRenderedId } from "../../internals/resolveRenderedId.mjs";
import { getTarget } from "../../floating-ui-react/utils.mjs";
import { refocusOwner } from "../utils/refocusOwner.mjs";

/**
 * @internal
 */
import { jsx as _jsx } from "react/jsx-runtime";
export const FilterDropdownList = /*#__PURE__*/React.forwardRef(function FilterDropdownList(componentProps, forwardedRef) {
  // `id` is resolved by `useRenderedId`, which also honors an id on the `render` element.
  const {
    render,
    className,
    style,
    id: idProp,
    ...elementProps
  } = componentProps;
  const context = useFilterDropdownRootContext();
  const [id, registerIdRef] = useRenderedId(componentProps, context.defaultListId, context.setRenderedListId);
  const defaultProps = {
    // Chromium includes scrollable elements in sequential focus navigation by default.
    tabIndex: -1,
    id,
    onFocus(event) {
      // A press on the list's own content, such as its background, a group, or a group label,
      // focuses the list.
      const owner = context.focusOwnerRef.current;
      if (owner && event.relatedTarget === owner && getTarget(event.nativeEvent) === event.currentTarget) {
        refocusOwner(owner);
      }
    },
    onPointerMove() {
      context.setKeyboardModality(false);
    },
    onPointerDown() {
      context.setKeyboardModality(false);
    }
  };
  return useRenderElement('div', componentProps, {
    ref: [forwardedRef, registerIdRef],
    props: [defaultProps, elementProps, {
      // The list's groups and items belong to this root's query. A nested root's list renders
      // inside an enclosing group, which must not count them as its own members.
      children: /*#__PURE__*/_jsx(FilterDropdownGroupContext.Provider, {
        value: null,
        children: elementProps.children
      })
    }]
  });
});
if (process.env.NODE_ENV !== "production") FilterDropdownList.displayName = "FilterDropdownList";